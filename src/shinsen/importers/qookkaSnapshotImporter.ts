import { heroes, skills } from '../catalog'
import { normalizeJapaneseName } from '../domain/normalize'
import type { OwnedHero, OwnedSkill, UnmatchedHero } from '../types'

const ALLOWED_HOST = 'general.qookkagames.com'

export interface ParsedShareUrl { snapshotId: string; normalizedUrl: string }
export interface NormalizedInventory { ownedHeroes: OwnedHero[]; ownedSkills: OwnedSkill[]; unmatchedHeroes: UnmatchedHero[]; snapshotId: string }

export function parseQookkaShareUrl(input: string): ParsedShareUrl {
  let url: URL
  try { url = new URL(input.trim()) } catch { throw new Error('共有URLが正しくありません。') }
  if (url.protocol !== 'https:' || url.hostname !== ALLOWED_HOST) throw new Error('対応していない共有URLです。')
  if (!url.pathname.startsWith('/xzdyw-station-qookka')) throw new Error('『信長の野望 真戦』の共有URLを入力してください。')
  const hashQuery = url.hash.includes('?') ? url.hash.slice(url.hash.indexOf('?') + 1) : ''
  const snapshotId = new URLSearchParams(hashQuery).get('snapshot_id') ?? url.searchParams.get('snapshot_id')
  if (!snapshotId || !/^[a-zA-Z0-9_-]{12,80}$/.test(snapshotId)) throw new Error('スナップショットが見つかりません。')
  return { snapshotId, normalizedUrl: `https://${ALLOWED_HOST}/xzdyw-station-qookka#/handbook?snapshot_id=${snapshotId}` }
}

function findArrays(value: unknown, keyPattern: RegExp, output: unknown[][] = []): unknown[][] {
  if (Array.isArray(value)) {
    for (const item of value) findArrays(item, keyPattern, output)
  } else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (keyPattern.test(key) && Array.isArray(item)) output.push(item)
      findArrays(item, keyPattern, output)
    }
  }
  return output
}

function objectRow(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

export function normalizeOfficialResponse(payload: unknown, snapshotId: string): NormalizedInventory {
  const heroRows = findArrays(payload, /^(heros|heroes|hero_list)$/i).flat().map(objectRow).filter((row): row is Record<string, unknown> => Boolean(row))
  const skillRows = findArrays(payload, /^(skills|skill_list)$/i).flat().map(objectRow).filter((row): row is Record<string, unknown> => Boolean(row))
  const heroByCfgId = new Map(heroes.map((hero) => [hero.id.replace('hero-', ''), hero]))
  const heroByName = new Map(heroes.flatMap((hero) => [[normalizeJapaneseName(hero.name), hero], [normalizeJapaneseName(hero.nameKana), hero]]))
  const skillByName = new Map(skills.map((skill) => [normalizeJapaneseName(skill.name), skill]))
  const now = new Date().toISOString()
  const ownedHeroes: OwnedHero[] = []
  const unmatchedHeroes: UnmatchedHero[] = []
  for (const row of heroRows) {
    const id = String(row.type ?? row.hero_id ?? row.id ?? row.cfg_id ?? '')
    const name = String(row.hero_name ?? row.name ?? row.show_name ?? '')
    const hero = heroByCfgId.get(id) ?? heroByName.get(normalizeJapaneseName(name))
    const breakthrough = Math.max(0, Math.min(5, Number(row.stage ?? row.breakthrough ?? row.advance ?? row.star_lv ?? row.red_star ?? 0))) as OwnedHero['breakthrough']
    if (hero) ownedHeroes.push({ heroId: hero.id, breakthrough, awakened: Boolean(row.awakened ?? row.awake), note: '', tags: [], equippedSkillIds: [], updatedAt: now })
    else if (id || name) unmatchedHeroes.push({ id: `unmatched-${snapshotId}-${id || normalizeJapaneseName(name)}`, sourceName: name || `ID ${id}`, raw: row, importedAt: now })
  }
  const ownedSkills: OwnedSkill[] = []
  for (const row of skillRows) {
    const name = String(row.skill_name ?? row.name ?? row.show_name ?? '')
    const skill = skillByName.get(normalizeJapaneseName(name))
    if (skill) ownedSkills.push({ skillId: skill.id, note: '', updatedAt: now })
  }
  const uniqueHeroes = [...new Map(ownedHeroes.map((hero) => [hero.heroId, hero])).values()]
  const uniqueSkills = [...new Map(ownedSkills.map((skill) => [skill.skillId, skill])).values()]
  if (!uniqueHeroes.length && !unmatchedHeroes.length) throw new Error('共有データに武将情報がありません。')
  return { ownedHeroes: uniqueHeroes, ownedSkills: uniqueSkills, unmatchedHeroes, snapshotId }
}

export async function importQookkaSnapshot(input: string): Promise<NormalizedInventory> {
  const parsed = parseQookkaShareUrl(input)
  const response = await fetch(`/api/qookka-snapshot?snapshot_id=${encodeURIComponent(parsed.snapshotId)}`, { headers: { accept: 'application/json' } })
  if (!response.ok) {
    if (response.status === 410) throw new Error('共有リンクは失効しています。ゲーム内で新しい共有リンクを発行してください。')
    if (response.status === 502 || response.status === 504) throw new Error('公式サイトへ一時的に接続できません。少し待ってからもう一度お試しください。')
    const detail = await response.json().catch(() => null) as { error?: string } | null
    throw new Error(detail?.error ?? '共有データを取得できませんでした。')
  }
  return normalizeOfficialResponse(await response.json(), parsed.snapshotId)
}
