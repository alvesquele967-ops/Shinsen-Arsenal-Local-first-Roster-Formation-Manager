import { afterEach, describe, expect, it } from 'vitest'
import { createBackup, mergeUserData, parseBackup } from '../src/shinsen/domain/backup'
import { DEFAULT_IMPORT_METADATA, DEFAULT_SETTINGS, importUserData, readUserData, ShinsenDatabase } from '../src/shinsen/db'
import type { UserData } from '../src/shinsen/types'

const now = '2026-08-07T00:00:00.000Z'
const empty = (): UserData => ({ ownedHeroes: [], ownedSkills: [], formations: [], settings: { ...DEFAULT_SETTINGS }, importMetadata: { ...DEFAULT_IMPORT_METADATA }, unmatchedHeroes: [] })
const databases: ShinsenDatabase[] = []
const makeDb = () => {
  const database = new ShinsenDatabase(`test-${crypto.randomUUID()}`)
  databases.push(database)
  return database
}

afterEach(async () => {
  await Promise.all(databases.splice(0).map(async (database) => { database.close(); await database.delete() }))
})

describe('バックアップ形式', () => {
  it('v3にアプリ・DBバージョンと日時を含める', () => {
    const backup = createBackup(empty(), '2026.08.07-test')
    expect(backup).toMatchObject({ schemaVersion: 3, appVersion: '1.0.0', databaseVersion: '2026.08.07-test' })
    expect(Number.isNaN(Date.parse(backup.exportedAt))).toBe(false)
  })

  it('v1をv2へ移行し、欠損メタデータを補う', () => {
    const userData = empty()
    const { importMetadata: _ignored, ...v1Data } = userData
    const migrated = parseBackup(JSON.stringify({ schemaVersion: 1, appVersion: '0.9.0', exportedAt: now, databaseVersion: 'old', userData: v1Data }))
    expect(migrated.schemaVersion).toBe(3)
    expect(migrated.userData.importMetadata).toEqual({ id: 'main' })
  })

  it('v2の武将に装着戦法配列を補ってv3へ移行する', () => {
    const data = empty()
    data.ownedHeroes.push({ heroId: 'hero-a', breakthrough: 1, awakened: false, note: '', tags: [], equippedSkillIds: [], updatedAt: now })
    const legacy = JSON.parse(JSON.stringify(data))
    delete legacy.ownedHeroes[0].equippedSkillIds
    const migrated = parseBackup(JSON.stringify({ schemaVersion: 2, appVersion: '0.9.5', exportedAt: now, databaseVersion: 'old', userData: legacy }))
    expect(migrated.schemaVersion).toBe(3)
    expect(migrated.userData.ownedHeroes[0].equippedSkillIds).toEqual([])
  })

  it.each(['not json', '{}', '{"schemaVersion":99}'])('破損データを拒否する', (text) => expect(() => parseBackup(text)).toThrow())
})

describe('マージ規則', () => {
  it('高い突破・覚醒・既存メモ・タグ和集合を採用する', () => {
    const current = empty()
    current.ownedHeroes.push({ heroId: 'hero-a', breakthrough: 2, awakened: false, note: '端末A', tags: ['主力'], equippedSkillIds: ['skill-a'], updatedAt: now })
    const imported = empty()
    imported.ownedHeroes.push({ heroId: 'hero-a', breakthrough: 4, awakened: true, note: '端末B', tags: ['兵器'], equippedSkillIds: ['skill-b'], updatedAt: '2026-08-08T00:00:00.000Z' })
    const result = mergeUserData(current, imported).ownedHeroes[0]
    expect(result).toMatchObject({ breakthrough: 4, awakened: true, note: '端末A' })
    expect(result.tags.sort()).toEqual(['主力', '兵器'].sort())
    expect(result.equippedSkillIds).toEqual(['skill-a', 'skill-b'])
  })
})

describe('端末間バックアップ復元', () => {
  it('端末Aの全ユーザーデータを端末Bへ置き換え復元する', async () => {
    const deviceA = makeDb()
    const deviceB = makeDb()
    const source = empty()
    source.ownedHeroes.push({ heroId: 'hero-10001', breakthrough: 5, awakened: true, note: '主将', tags: ['お気に入り'], equippedSkillIds: ['skill-test'], updatedAt: now })
    source.ownedHeroes.push({ heroId: 'hero-10002', breakthrough: 2, awakened: false, note: '副将候補', tags: ['兵器'], equippedSkillIds: [], updatedAt: now })
    source.ownedSkills.push({ skillId: 'skill-test', note: '移行確認', updatedAt: now }, { skillId: 'skill-second', note: '', updatedAt: now })
    source.formations.push({ id: 'formation-a', name: '遠征隊', commanderId: 'hero-10001', vice1Id: null, vice2Id: null, troopType: '兵器', skills: { commander: ['skill-test'], vice1: [], vice2: [] }, note: '', createdAt: now, updatedAt: now })
    source.formations.push({ id: 'formation-b', name: '第2兵器部隊', commanderId: 'hero-10002', vice1Id: 'hero-10001', vice2Id: null, troopType: '鉄砲', skills: { commander: ['skill-second'], vice1: [], vice2: [] }, note: '交代候補あり', createdAt: now, updatedAt: now })
    source.settings = { ...source.settings, hideThreeStar: false, costLimit: 21, compactCards: true, sortBy: 'weaponArt' }
    source.importMetadata = { id: 'main', lastOfficialImportAt: now }
    await importUserData(source, 'replace', deviceA)
    const text = JSON.stringify(createBackup(await readUserData(deviceA), 'test-db'))
    await importUserData(parseBackup(text).userData, 'replace', deviceB)
    const restored = await readUserData(deviceB)
    expect(restored).toEqual(await readUserData(deviceA))
    expect(restored.ownedHeroes).toHaveLength(2)
    expect(restored.formations).toHaveLength(2)
    expect(restored.settings).toMatchObject({ costLimit: 21, hideThreeStar: false, sortBy: 'weaponArt' })
  })
})
