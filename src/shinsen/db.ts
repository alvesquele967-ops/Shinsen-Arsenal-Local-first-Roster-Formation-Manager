import Dexie, { type EntityTable } from 'dexie'
import { mergeUserData } from './domain/backup'
import type { AppSettings, Formation, ImportMetadata, OwnedHero, OwnedSkill, RecoverySnapshot, UnmatchedHero, UserData } from './types'

export const DEFAULT_SETTINGS: AppSettings = {
  id: 'main', sortBy: 'rarity', hideThreeStar: true, costLimit: 18, compactCards: false,
}
export const DEFAULT_IMPORT_METADATA: ImportMetadata = { id: 'main' }

export class ShinsenDatabase extends Dexie {
  ownedHeroes!: EntityTable<OwnedHero, 'heroId'>
  ownedSkills!: EntityTable<OwnedSkill, 'skillId'>
  formations!: EntityTable<Formation, 'id'>
  settings!: EntityTable<AppSettings, 'id'>
  importMetadata!: EntityTable<ImportMetadata, 'id'>
  unmatchedHeroes!: EntityTable<UnmatchedHero, 'id'>
  recoverySnapshots!: EntityTable<RecoverySnapshot, 'id'>

  constructor(name = 'shinsen-arsenal') {
    super(name)
    this.version(1).stores({
      ownedHeroes: '&heroId, breakthrough, awakened, updatedAt',
      ownedSkills: '&skillId, updatedAt',
      formations: '&id, name, updatedAt',
      settings: '&id',
      importMetadata: '&id',
      unmatchedHeroes: '&id, sourceName, importedAt',
      recoverySnapshots: '&id, createdAt',
    })
  }
}

export const db = new ShinsenDatabase()

export async function readUserData(database: ShinsenDatabase = db): Promise<UserData> {
  const [ownedHeroes, ownedSkills, formations, settings, importMetadata, unmatchedHeroes] = await Promise.all([
    database.ownedHeroes.toArray(), database.ownedSkills.toArray(), database.formations.toArray(),
    database.settings.get('main'), database.importMetadata.get('main'), database.unmatchedHeroes.toArray(),
  ])
  return {
    ownedHeroes: ownedHeroes.map((hero) => ({ ...hero, equippedSkillIds: hero.equippedSkillIds ?? [] })), ownedSkills, formations,
    settings: settings ?? DEFAULT_SETTINGS,
    importMetadata: importMetadata ?? DEFAULT_IMPORT_METADATA,
    unmatchedHeroes,
  }
}

async function writeAll(data: UserData, database: ShinsenDatabase): Promise<void> {
  await Promise.all([
    database.ownedHeroes.clear(), database.ownedSkills.clear(), database.formations.clear(),
    database.settings.clear(), database.importMetadata.clear(), database.unmatchedHeroes.clear(),
  ])
  await Promise.all([
    database.ownedHeroes.bulkPut(data.ownedHeroes), database.ownedSkills.bulkPut(data.ownedSkills),
    database.formations.bulkPut(data.formations), database.settings.put(data.settings),
    database.importMetadata.put(data.importMetadata), database.unmatchedHeroes.bulkPut(data.unmatchedHeroes),
  ])
}

export async function importUserData(data: UserData, mode: 'replace' | 'merge', database: ShinsenDatabase = db): Promise<void> {
  await database.transaction('rw', [
    database.ownedHeroes, database.ownedSkills, database.formations, database.settings,
    database.importMetadata, database.unmatchedHeroes, database.recoverySnapshots,
  ], async () => {
    const current = await readUserData(database)
    if (mode === 'replace') {
      await database.recoverySnapshots.put({
        id: crypto.randomUUID(), createdAt: new Date().toISOString(), reason: '置き換え前', data: current,
      })
      await writeAll(data, database)
    } else {
      await writeAll(mergeUserData(current, data), database)
    }
  })
}

export async function restoreLatestRecovery(database: ShinsenDatabase = db): Promise<boolean> {
  const snapshot = await database.recoverySnapshots.orderBy('createdAt').last()
  if (!snapshot) return false
  await database.transaction('rw', [database.ownedHeroes, database.ownedSkills, database.formations, database.settings, database.importMetadata, database.unmatchedHeroes], async () => {
    await writeAll(snapshot.data, database)
  })
  return true
}
