import type { BackupEnvelope, BackupEnvelopeV1, BackupEnvelopeV2, Formation, OwnedHero, UserData } from '../types'
import { v1ToV2 } from '../migrations/v1ToV2'
import { v2ToV3 } from '../migrations/v2ToV3'

export const CURRENT_SCHEMA_VERSION = 3
export const APP_VERSION = '1.0.0'

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function validateBackup(value: unknown): BackupEnvelope | BackupEnvelopeV1 | BackupEnvelopeV2 {
  if (!isObject(value)) throw new Error('バックアップの形式が正しくありません。')
  if (value.schemaVersion !== 1 && value.schemaVersion !== 2 && value.schemaVersion !== 3) throw new Error('対応していないスキーマバージョンです。')
  if (typeof value.appVersion !== 'string' || typeof value.exportedAt !== 'string' || typeof value.databaseVersion !== 'string') {
    throw new Error('バージョン情報が不足しています。')
  }
  if (!isObject(value.userData)) throw new Error('ユーザーデータがありません。')
  const data = value.userData
  for (const field of ['ownedHeroes', 'ownedSkills', 'formations', 'unmatchedHeroes']) {
    if (!Array.isArray(data[field])) throw new Error(`${field}の形式が正しくありません。`)
  }
  if (!isObject(data.settings)) throw new Error('設定データの形式が正しくありません。')
  const ownedHeroes = data.ownedHeroes as unknown[]
  const formations = data.formations as unknown[]
  for (const hero of ownedHeroes) {
    if (!isObject(hero) || typeof hero.heroId !== 'string' || !Number.isInteger(hero.breakthrough) || Number(hero.breakthrough) < 0 || Number(hero.breakthrough) > 5) {
      throw new Error('所持武将データに異常があります。')
    }
    if (hero.equippedSkillIds !== undefined && (!Array.isArray(hero.equippedSkillIds) || hero.equippedSkillIds.some((id) => typeof id !== 'string'))) throw new Error('装着戦法データに異常があります。')
  }
  for (const formation of formations) {
    if (!isObject(formation) || typeof formation.id !== 'string' || typeof formation.name !== 'string') throw new Error('編成データに異常があります。')
  }
  return value as unknown as BackupEnvelope | BackupEnvelopeV1 | BackupEnvelopeV2
}

export function migrateBackup(source: BackupEnvelope | BackupEnvelopeV1 | BackupEnvelopeV2): BackupEnvelope {
  if (source.schemaVersion === 1) return v2ToV3(v1ToV2(source))
  if (source.schemaVersion === 2) return v2ToV3(source)
  return source
}

export function parseBackup(text: string): BackupEnvelope {
  let parsed: unknown
  try { parsed = JSON.parse(text) } catch { throw new Error('JSONを読み取れません。') }
  return migrateBackup(validateBackup(parsed))
}

export function createBackup(data: UserData, databaseVersion: string): BackupEnvelope {
  return { schemaVersion: CURRENT_SCHEMA_VERSION, appVersion: APP_VERSION, exportedAt: new Date().toISOString(), databaseVersion, userData: data }
}

function sameFormation(a: Formation, b: Formation): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

export function mergeUserData(current: UserData, imported: UserData): UserData {
  const heroes = new Map(current.ownedHeroes.map((hero) => [hero.heroId, hero]))
  for (const incoming of imported.ownedHeroes) {
    const existing = heroes.get(incoming.heroId)
    if (!existing) heroes.set(incoming.heroId, incoming)
    else heroes.set(incoming.heroId, {
      ...incoming, ...existing,
      breakthrough: Math.max(existing.breakthrough, incoming.breakthrough) as OwnedHero['breakthrough'],
      awakened: existing.awakened || incoming.awakened,
      note: existing.note || incoming.note,
      tags: [...new Set([...existing.tags, ...incoming.tags])],
      equippedSkillIds: [...new Set([...existing.equippedSkillIds, ...incoming.equippedSkillIds])].slice(0, 2),
      updatedAt: new Date(Math.max(Date.parse(existing.updatedAt), Date.parse(incoming.updatedAt))).toISOString(),
    })
  }
  const skills = new Map(current.ownedSkills.map((skill) => [skill.skillId, skill]))
  for (const skill of imported.ownedSkills) if (!skills.has(skill.skillId)) skills.set(skill.skillId, skill)
  const formations = new Map(current.formations.map((formation) => [formation.id, formation]))
  for (const incoming of imported.formations) {
    const existing = formations.get(incoming.id)
    if (!existing) formations.set(incoming.id, incoming)
    else if (!sameFormation(existing, incoming)) formations.set(`${incoming.id}-import-${incoming.updatedAt.replace(/\D/g, '').slice(-8)}`, { ...incoming, id: `${incoming.id}-import-${incoming.updatedAt.replace(/\D/g, '').slice(-8)}`, name: `${incoming.name}（読込）` })
  }
  const unmatched = new Map(current.unmatchedHeroes.map((hero) => [hero.id, hero]))
  for (const hero of imported.unmatchedHeroes) if (!unmatched.has(hero.id)) unmatched.set(hero.id, hero)
  return {
    ownedHeroes: [...heroes.values()], ownedSkills: [...skills.values()], formations: [...formations.values()],
    settings: { ...imported.settings, ...current.settings, id: 'main' },
    importMetadata: { ...imported.importMetadata, ...current.importMetadata, id: 'main' },
    unmatchedHeroes: [...unmatched.values()],
  }
}

export function downloadBackup(envelope: BackupEnvelope): void {
  const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `shinsen-backup-${new Date().toISOString().slice(0, 10)}.shinsen.json`
  anchor.click()
  URL.revokeObjectURL(url)
}
