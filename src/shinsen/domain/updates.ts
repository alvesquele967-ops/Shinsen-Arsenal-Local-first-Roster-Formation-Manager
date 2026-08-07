import { catalogMeta } from '../catalog'

export interface UpdateCheckResult { status: 'latest' | 'available' | 'offline'; message: string }

export async function checkForUpdates(): Promise<UpdateCheckResult> {
  if (!navigator.onLine) return { status: 'offline', message: 'オフラインのため更新を確認できません。' }
  try {
    const registration = await navigator.serviceWorker?.getRegistration()
    await registration?.update()
    const response = await fetch(`/data-version.json?t=${Date.now()}`, { cache: 'no-store' })
    if (!response.ok) throw new Error('version check failed')
    const latest = await response.json() as { databaseVersion?: string; appVersion?: string }
    const waiting = Boolean(registration?.waiting)
    if (waiting || (latest.databaseVersion && latest.databaseVersion !== catalogMeta.databaseVersion)) {
      return { status: 'available', message: '新しいデータがあります。再読み込みで更新します。' }
    }
    return { status: 'latest', message: '現在のデータは最新です。' }
  } catch {
    return { status: 'offline', message: '更新サーバーに接続できませんでした。' }
  }
}

export function applyAvailableUpdate(): void {
  location.reload()
}
