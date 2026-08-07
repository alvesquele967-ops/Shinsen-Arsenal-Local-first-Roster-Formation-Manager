import { computed, reactive, ref } from 'vue'
import { db, DEFAULT_IMPORT_METADATA, DEFAULT_SETTINGS, importUserData, readUserData, restoreLatestRecovery } from './db'
import type { AppSettings, Formation, OwnedHero, OwnedSkill, UserData } from './types'

const ready = ref(false)
const busy = ref(false)
const toast = reactive({ message: '', kind: 'success' as 'success' | 'error' | 'info', visible: false })
const ownedHeroes = ref<OwnedHero[]>([])
const ownedSkills = ref<OwnedSkill[]>([])
const formations = ref<Formation[]>([])
const settings = ref<AppSettings>({ ...DEFAULT_SETTINGS })
const importMetadata = ref({ ...DEFAULT_IMPORT_METADATA })
const unmatchedHeroes = ref<UserData['unmatchedHeroes']>([])
let toastTimer: ReturnType<typeof setTimeout> | undefined

function notify(message: string, kind: typeof toast.kind = 'success') {
  toast.message = message; toast.kind = kind; toast.visible = true
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.visible = false }, 3200)
}

async function refresh() {
  const data = await readUserData()
  ownedHeroes.value = data.ownedHeroes
  ownedSkills.value = data.ownedSkills
  formations.value = data.formations.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  settings.value = data.settings
  importMetadata.value = data.importMetadata
  unmatchedHeroes.value = data.unmatchedHeroes
}

async function init() {
  if (ready.value) return
  busy.value = true
  try { await refresh(); ready.value = true } catch { notify('ローカルデータを読み込めませんでした。', 'error') } finally { busy.value = false }
}

async function setOwnedHero(record: OwnedHero | null, heroId: string) {
  if (record) await db.ownedHeroes.put(record)
  else await db.ownedHeroes.delete(heroId)
  await refresh()
}

async function cycleHero(heroId: string) {
  const current = ownedHeroes.value.find((hero) => hero.heroId === heroId)
  if (!current) {
    await setOwnedHero({ heroId, breakthrough: 0, awakened: false, note: '', tags: [], equippedSkillIds: [], updatedAt: new Date().toISOString() }, heroId)
  } else if (current.breakthrough < 5) {
    await setOwnedHero({ ...current, breakthrough: (current.breakthrough + 1) as OwnedHero['breakthrough'], updatedAt: new Date().toISOString() }, heroId)
  } else await setOwnedHero(null, heroId)
}

async function saveOwnedHero(record: OwnedHero) { await setOwnedHero({ ...record, updatedAt: new Date().toISOString() }, record.heroId); notify('保存しました。') }
async function removeOwnedHero(heroId: string) { await setOwnedHero(null, heroId); notify('所持武将から外しました。', 'info') }

async function toggleSkill(skillId: string) {
  const current = ownedSkills.value.find((skill) => skill.skillId === skillId)
  if (current) await db.ownedSkills.delete(skillId)
  else await db.ownedSkills.put({ skillId, note: '', updatedAt: new Date().toISOString() })
  await refresh()
}

async function saveFormation(formation: Formation) {
  await db.formations.put({ ...formation, updatedAt: new Date().toISOString() })
  await refresh(); notify('編成を保存しました。')
}
async function deleteFormation(id: string) { await db.formations.delete(id); await refresh(); notify('編成を削除しました。', 'info') }
async function saveSettings(value: AppSettings) { await db.settings.put(value); await refresh(); notify('設定を保存しました。') }
async function applyImport(data: UserData, mode: 'replace' | 'merge') {
  try {
    const plainData = JSON.parse(JSON.stringify(data)) as UserData
    await importUserData(plainData, mode)
    await refresh()
    notify(mode === 'replace' ? 'データを置き換えました。' : 'データを統合しました。')
  } catch (error) {
    notify('データの読み込みに失敗しました。現在のデータは変更されていません。', 'error')
    throw error
  }
}
async function restoreRecovery() { const restored = await restoreLatestRecovery(); if (restored) { await refresh(); notify('直前の状態に戻しました。') } return restored }

export function useAppState() {
  return {
    ready, busy, toast, ownedHeroes, ownedSkills, formations, settings, importMetadata, unmatchedHeroes,
    ownedById: computed(() => new Map(ownedHeroes.value.map((hero) => [hero.heroId, hero]))),
    init, refresh, notify, cycleHero, saveOwnedHero, removeOwnedHero, toggleSkill, saveFormation, deleteFormation, saveSettings, applyImport, restoreRecovery,
  }
}
