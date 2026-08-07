import type { BackupEnvelopeV1, BackupEnvelopeV2, ImportMetadata } from '../types'

export function v1ToV2(source: BackupEnvelopeV1): BackupEnvelopeV2 {
  const importMetadata: ImportMetadata = source.userData.importMetadata ?? { id: 'main' }
  return {
    schemaVersion: 2,
    appVersion: source.appVersion,
    exportedAt: source.exportedAt,
    databaseVersion: source.databaseVersion,
    userData: { ...source.userData, importMetadata },
  }
}
