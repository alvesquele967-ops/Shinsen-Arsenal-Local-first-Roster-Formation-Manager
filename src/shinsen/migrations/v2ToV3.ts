import type { BackupEnvelope, BackupEnvelopeV2 } from '../types'

export function v2ToV3(source: BackupEnvelopeV2): BackupEnvelope {
  return {
    schemaVersion: 3,
    appVersion: source.appVersion,
    exportedAt: source.exportedAt,
    databaseVersion: source.databaseVersion,
    userData: {
      ...source.userData,
      ownedHeroes: source.userData.ownedHeroes.map((hero) => ({
        ...hero,
        equippedSkillIds: Array.isArray(hero.equippedSkillIds) ? hero.equippedSkillIds.filter((id): id is string => typeof id === 'string').slice(0, 2) : [],
      })),
    },
  }
}
