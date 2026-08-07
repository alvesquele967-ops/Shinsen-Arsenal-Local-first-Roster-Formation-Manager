export type Breakthrough = 0 | 1 | 2 | 3 | 4 | 5

export interface HeroTrait {
  name: string
  description: string
  unlockBreakthrough: Breakthrough
}

export interface WeaponArt {
  name: string
  level: 1 | 2 | 3
  unlockBreakthrough: Breakthrough
}

export interface Hero {
  id: string
  name: string
  nameKana: string
  rarity: 3 | 4 | 5
  faction: string
  clan: string
  cost: number
  portrait: string
  stats: { valor: number; leadership: number; intelligence: number; politics: number; speed: number }
  uniqueSkill: string
  teachableSkill: string | null
  assemblySkill: string | null
  traits: HeroTrait[]
  weaponArt: WeaponArt | null
  sourceUrl: string
  updatedAt: string
}

export interface Skill {
  id: string
  name: string
  nameKana: string
  rarity: string
  type: string
  target: string
  activationRate: string
  description: string
  sourceHero: string | null
}

export interface OwnedHero {
  heroId: string
  breakthrough: Breakthrough
  awakened: boolean
  note: string
  tags: string[]
  equippedSkillIds: string[]
  updatedAt: string
}

export interface OwnedSkill {
  skillId: string
  note: string
  updatedAt: string
}

export type FormationRole = 'commander' | 'vice1' | 'vice2'

export interface Formation {
  id: string
  name: string
  commanderId: string | null
  vice1Id: string | null
  vice2Id: string | null
  troopType: '足軽' | '騎兵' | '弓兵' | '鉄砲' | '兵器'
  skills: Record<FormationRole, string[]>
  note: string
  createdAt: string
  updatedAt: string
}

export interface AppSettings {
  id: 'main'
  sortBy: 'rarity' | 'breakthrough' | 'cost' | 'valor' | 'leadership' | 'intelligence' | 'politics' | 'speed' | 'weaponArt'
  hideThreeStar: boolean
  costLimit: number
  compactCards: boolean
}

export interface ImportMetadata {
  id: 'main'
  lastOfficialImportAt?: string
  lastBackupImportAt?: string
}

export interface UnmatchedHero {
  id: string
  sourceName: string
  raw: Record<string, unknown>
  importedAt: string
}

export interface UserData {
  ownedHeroes: OwnedHero[]
  ownedSkills: OwnedSkill[]
  formations: Formation[]
  settings: AppSettings
  importMetadata: ImportMetadata
  unmatchedHeroes: UnmatchedHero[]
}

export interface LegacyOwnedHero extends Omit<OwnedHero, 'equippedSkillIds'> { equippedSkillIds?: string[] }
export type LegacyUserData = Omit<UserData, 'ownedHeroes'> & { ownedHeroes: LegacyOwnedHero[] }

export interface BackupEnvelopeV1 {
  schemaVersion: 1
  appVersion: string
  exportedAt: string
  databaseVersion: string
  userData: Omit<LegacyUserData, 'importMetadata'> & { importMetadata?: ImportMetadata }
}

export interface BackupEnvelopeV2 {
  schemaVersion: 2
  appVersion: string
  exportedAt: string
  databaseVersion: string
  userData: LegacyUserData
}

export interface BackupEnvelope {
  schemaVersion: 3
  appVersion: string
  exportedAt: string
  databaseVersion: string
  userData: UserData
}

export interface RecoverySnapshot {
  id: string
  createdAt: string
  reason: '置き換え前'
  data: UserData
}
