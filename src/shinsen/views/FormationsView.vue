<template>
  <div class="formation-layout">
    <aside class="formation-list-panel">
      <div class="section-heading"><div><p class="eyebrow">{{ state.formations.value.length }}部隊</p><h2>保存編成</h2></div><button class="icon-button" type="button" aria-label="新規編成" @click="newFormation">＋</button></div>
      <button v-for="item in state.formations.value" :key="item.id" class="formation-list-item" :class="{ active: draft.id === item.id }" @click="openFormation(item)"><span>{{ item.troopType.slice(0, 1) }}</span><div><strong>{{ item.name }}</strong><small>{{ formatDate(item.updatedAt) }}</small></div></button>
      <div v-if="!state.formations.value.length" class="empty-mini">編成を作成するとここに保存されます。</div>
    </aside>

    <section class="formation-workspace">
      <header class="formation-toolbar"><label><span>編成名</span><input v-model="draft.name" type="text" maxlength="40" /></label><div class="toolbar-actions"><button class="button button-quiet" type="button" @click="duplicate">複製</button><button class="button button-quiet" type="button" @click="exportPng">PNG</button><button class="button button-primary" type="button" @click="save">保存</button></div></header>

      <div class="formation-summary-strip"><label>兵種<select v-model="draft.troopType"><option v-for="troop in troops" :key="troop" :value="troop">{{ troop }}</option></select></label><div><span>合計COST</span><strong :class="{ danger: summary.totalCost > state.settings.value.costLimit }">{{ summary.totalCost }} / {{ state.settings.value.costLimit }}</strong></div><div><span>有効器術</span><strong>+{{ summary.weaponLevel }}</strong></div><div><span>勢力</span><strong>{{ factionText }}</strong></div></div>

      <div class="formation-slots">
        <article v-for="slot in slots" :key="slot.key" class="formation-slot" :class="{ commander: slot.key === 'commander' }">
          <div class="slot-label">{{ slot.label }}</div>
          <button v-if="slotHero(slot.key)" class="selected-hero" type="button" @click="chooseRole = slot.key"><img :src="slotHero(slot.key)!.portrait" :alt="slotHero(slot.key)!.name" /><div><strong>{{ slotHero(slot.key)!.name }}</strong><p>{{ slotHero(slot.key)!.faction }} ・ COST {{ slotHero(slot.key)!.cost }}</p><small>{{ ownedFor(slot.key)?.breakthrough ?? 0 }}凸 {{ slotHero(slot.key)!.weaponArt?.name ?? '器術なし' }}</small></div></button>
          <button v-else class="empty-slot" type="button" @click="chooseRole = slot.key"><span>＋</span><strong>武将を選択</strong></button>
          <div class="slot-skills"><span v-for="skillId in draft.skills[slot.key]" :key="skillId">{{ skillById.get(skillId)?.name }}<button type="button" aria-label="戦法を外す" @click="removeSkill(slot.key, skillId)">×</button></span><select v-if="draft.skills[slot.key].length < 2 && ownedSkillOptions.length" aria-label="戦法を追加" @change="addSkill(slot.key, $event)"><option value="">戦法を追加…</option><option v-for="skill in ownedSkillOptions.filter((skill) => !draft.skills[slot.key].includes(skill.id))" :key="skill.id" :value="skill.id">{{ skill.name }}</option></select></div>
        </article>
      </div>

      <div v-if="summary.synergy" class="synergy-banner">◈ {{ summary.synergy }}<small>実際の効果量はゲーム内の連携施設レベルによって異なります。</small></div>
      <div v-if="summary.warnings.length" class="warning-list"><p v-for="warning in summary.warnings" :key="warning">⚠ {{ warning }}</p></div>
      <dl class="formation-stats"><div><dt>武勇</dt><dd>{{ summary.totalStats.valor }}</dd></div><div><dt>統率</dt><dd>{{ summary.totalStats.leadership }}</dd></div><div><dt>知略</dt><dd>{{ summary.totalStats.intelligence }}</dd></div><div><dt>政務</dt><dd>{{ summary.totalStats.politics }}</dd></div><div><dt>速度</dt><dd>{{ summary.totalStats.speed }}</dd></div></dl>
      <label class="note-field">編成メモ<textarea v-model="draft.note" rows="3" placeholder="運用方針や交代候補を記録"></textarea></label>
      <button v-if="isSaved" class="text-danger" type="button" @click="removeFormation">この編成を削除</button>
    </section>

    <div v-if="chooseRole" class="modal-backdrop" @click.self="chooseRole = null"><section class="modal picker-modal" role="dialog" aria-modal="true" aria-label="武将を選択"><button class="modal-close" @click="chooseRole = null">×</button><div class="section-heading"><div><p class="eyebrow">所持武将 {{ selectableHeroes.length }}名</p><h2>{{ slots.find((slot) => slot.key === chooseRole)?.label }}を選択</h2></div></div><label class="search-field"><span>⌕</span><input v-model="pickerQuery" type="search" placeholder="武将名で検索" /></label><div class="picker-grid"><button v-for="hero in selectableHeroes" :key="hero.id" type="button" @click="selectHero(hero.id)"><img :src="hero.portrait" :alt="hero.name" /><strong>{{ hero.name }}</strong><small>{{ hero.faction }} ・ {{ state.ownedById.value.get(hero.id)?.breakthrough }}凸</small></button></div></section></div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, toRaw } from 'vue'
import { heroById, heroes, skillById, skills } from '../catalog'
import { createFormation, summarizeFormation } from '../domain/formation'
import { matchesJapaneseName } from '../domain/normalize'
import { useAppState } from '../state'
import type { Formation, FormationRole } from '../types'

const state = useAppState()
const troops: Formation['troopType'][] = ['足軽', '騎兵', '弓兵', '鉄砲', '兵器']
const slots: { key: FormationRole; label: string }[] = [{ key: 'commander', label: '主将' }, { key: 'vice1', label: '副将1' }, { key: 'vice2', label: '副将2' }]
function cloneFormation(value: Formation): Formation { return structuredClone(toRaw(value)) }
const draft = reactive<Formation>(state.formations.value[0] ? cloneFormation(state.formations.value[0]) : createFormation())
const chooseRole = ref<FormationRole | null>(null), pickerQuery = ref('')
const summary = computed(() => summarizeFormation(draft, heroes, state.ownedHeroes.value, state.settings.value))
const factionText = computed(() => Object.entries(summary.value.factions).map(([name, count]) => `${name}×${count}`).join(' / ') || '未選択')
const isSaved = computed(() => state.formations.value.some((item) => item.id === draft.id))
const ownedSkillOptions = computed(() => { const ids = new Set(state.ownedSkills.value.map((item) => item.skillId)); return skills.filter((skill) => ids.has(skill.id)) })
const selectableHeroes = computed(() => { const selectedIds = new Set([draft.commanderId, draft.vice1Id, draft.vice2Id]); const ownedIds = new Set(state.ownedHeroes.value.map((item) => item.heroId)); return heroes.filter((hero) => ownedIds.has(hero.id) && (!selectedIds.has(hero.id) || roleId(chooseRole.value!) === hero.id) && matchesJapaneseName(pickerQuery.value, hero.name, hero.nameKana)) })
function roleId(role: FormationRole) { return role === 'commander' ? draft.commanderId : role === 'vice1' ? draft.vice1Id : draft.vice2Id }
function slotHero(role: FormationRole) { const id = roleId(role); return id ? heroById.get(id) : undefined }
function ownedFor(role: FormationRole) { const id = roleId(role); return id ? state.ownedById.value.get(id) : undefined }
function setRole(role: FormationRole, id: string | null) { if (role === 'commander') draft.commanderId = id; else if (role === 'vice1') draft.vice1Id = id; else draft.vice2Id = id }
function selectHero(id: string) { if (chooseRole.value) setRole(chooseRole.value, id); chooseRole.value = null; pickerQuery.value = '' }
function openFormation(value: Formation) { Object.assign(draft, cloneFormation(value)) }
function newFormation() { Object.assign(draft, createFormation()) }
async function save() { if (!draft.name.trim()) { state.notify('編成名を入力してください。', 'error'); return } await state.saveFormation(cloneFormation(draft)) }
async function duplicate() { const copy = cloneFormation(draft); copy.id = crypto.randomUUID(); copy.name = `${draft.name}の複製`; copy.createdAt = new Date().toISOString(); copy.updatedAt = copy.createdAt; Object.assign(draft, copy); await state.saveFormation(copy) }
async function removeFormation() { if (!confirm('この編成を削除しますか？')) return; await state.deleteFormation(draft.id); newFormation() }
function addSkill(role: FormationRole, event: Event) { const select = event.target as HTMLSelectElement; if (select.value) draft.skills[role].push(select.value); select.value = '' }
function removeSkill(role: FormationRole, id: string) { draft.skills[role] = draft.skills[role].filter((item) => item !== id) }
function formatDate(value: string) { return new Intl.DateTimeFormat('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) }

function portraitProxyUrl(url: string) { return `/api/portrait?url=${encodeURIComponent(url)}` }
async function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => resolve(null)
    image.src = portraitProxyUrl(url)
  })
}
function safePngName(value: string) { return `${value.trim().replace(/[\\/:*?"<>|]/g, '＿') || '編成'}.png` }
async function exportPng() {
  const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 630; const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#101816'; ctx.fillRect(0, 0, 1200, 630)
  ctx.fillStyle = '#b89b55'; ctx.fillRect(0, 0, 14, 630); ctx.fillStyle = '#f1eadb'; ctx.font = '700 46px serif'; ctx.fillText(draft.name, 60, 76); ctx.fillStyle = '#93a19b'; ctx.font = '22px sans-serif'; ctx.fillText(`真戦武将帳 ・ ${draft.troopType} ・ COST ${summary.value.totalCost}`, 62, 112)
  let loadedPortraits = 0
  for (let index = 0; index < slots.length; index++) { const role = slots[index]; const hero = slotHero(role.key); const x = 62 + index * 370; ctx.fillStyle = '#1d2925'; ctx.fillRect(x, 154, 330, 380); if (hero) { const image = await loadImage(hero.portrait); if (image) { loadedPortraits++; ctx.save(); ctx.beginPath(); ctx.roundRect(x + 70, 174, 190, 230, 8); ctx.clip(); ctx.drawImage(image, x + 70, 174, 190, 230); ctx.restore() } ctx.fillStyle = '#f5f0e5'; ctx.font = '700 29px serif'; ctx.textAlign = 'center'; ctx.fillText(hero.name, x + 165, 448); ctx.fillStyle = '#b8c0bc'; ctx.font = '18px sans-serif'; ctx.fillText(`${role.label} ・ ${hero.faction} ・ ${ownedFor(role.key)?.breakthrough ?? 0}凸`, x + 165, 482); ctx.fillStyle = '#d6bd7a'; ctx.fillText(hero.weaponArt?.name ?? '—', x + 165, 516); ctx.textAlign = 'start' } }
  ctx.fillStyle = '#93a19b'; ctx.font = '18px sans-serif'; ctx.fillText(`器術 +${summary.value.weaponLevel}  ・  ${factionText.value}`, 62, 592)
  canvas.toBlob((blob) => {
    if (!blob) { state.notify('PNGの作成に失敗しました。', 'error'); return }
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = safePngName(draft.name)
    anchor.hidden = true
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
    const selectedCount = slots.filter((slot) => Boolean(slotHero(slot.key))).length
    state.notify(
      loadedPortraits === selectedCount
        ? `PNGを書き出しました（武将画像 ${loadedPortraits}名）。`
        : `PNGを書き出しましたが、武将画像は${loadedPortraits}/${selectedCount}名でした。通信状態を確認してください。`,
      loadedPortraits === selectedCount ? 'success' : 'error',
    )
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
  }, 'image/png')
}
</script>
