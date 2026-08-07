const OFFICIAL_ORIGIN = 'https://general.qookkagames.com'
const SNAPSHOT_ENDPOINT = 'https://p11386-platform.qookkagames.com/sns/web/api/cache/get_player_share_snapshot'
const CONFIG_ENDPOINT = 'https://p11386-media-cdn.qookkagames.com/P11386/sns/public_config/release/cfg.json'
const SNAPSHOT_ID_PATTERN = /^[a-zA-Z0-9_-]{12,80}$/
const MAX_UPSTREAM_BYTES = 5 * 1024 * 1024

const selectors = [
  { selector_type: 'view', data_view_type: 'hero' },
  { selector_type: 'view', data_view_type: 'skill' },
]

type JsonObject = Record<string, unknown>
type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

interface OfficialConfig {
  hero?: JsonObject[]
  skill?: JsonObject[]
  multi_lang?: JsonObject[]
}

let officialConfigPromise: Promise<OfficialConfig | null> | null = null

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  })
}

function isRecord(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

async function fetchJson(fetcher: Fetcher, url: string, timeoutMs: number): Promise<unknown> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetcher(url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        origin: OFFICIAL_ORIGIN,
        referer: `${OFFICIAL_ORIGIN}/xzdyw-station-qookka`,
      },
      redirect: 'error',
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`upstream ${response.status}`)
    const text = await response.text()
    if (new TextEncoder().encode(text).byteLength > MAX_UPSTREAM_BYTES) throw new Error('upstream response too large')
    return JSON.parse(text)
  } finally {
    clearTimeout(timer)
  }
}

export function createOfficialSnapshotUrl(snapshotId: string): string {
  const payload = JSON.stringify({ game_id: 's11', selectors, snapshot_id: snapshotId })
  const url = new URL(SNAPSHOT_ENDPOINT)
  url.searchParams.set('_json', payload)
  return url.toString()
}

async function getOfficialConfig(fetcher: Fetcher): Promise<OfficialConfig | null> {
  if (!officialConfigPromise) {
    officialConfigPromise = fetchJson(fetcher, CONFIG_ENDPOINT, 12_000)
      .then((value) => isRecord(value) ? value as OfficialConfig : null)
      .catch(() => null)
  }
  return officialConfigPromise
}

function localizedName(value: unknown, translations: Map<string, string>): string {
  const raw = String(value ?? '')
  return translations.get(raw) ?? raw
}

function enrichOfficialRows(payload: unknown, config: OfficialConfig | null): unknown {
  if (!config) return payload
  const translations = new Map((config.multi_lang ?? []).flatMap((row) => {
    const id = String(row.id ?? '')
    const ja = String(row.ja ?? '')
    return id && ja ? [[id, ja] as const] : []
  }))
  const heroNames = new Map((config.hero ?? []).map((row) => [String(row.id ?? ''), localizedName(row.show_name ?? row.name, translations)]))
  const skillNames = new Map((config.skill ?? []).map((row) => [String(row.id ?? ''), localizedName(row.show_name ?? row.name, translations)]))

  function visit(value: unknown, parentKey = ''): unknown {
    if (Array.isArray(value)) {
      if (/^(heros|heroes|hero_list)$/i.test(parentKey)) {
        return value.map((item) => {
          if (!isRecord(item)) return item
          const id = String(item.type ?? item.hero_id ?? item.id ?? '')
          return heroNames.get(id) ? { ...item, hero_name: heroNames.get(id) } : item
        })
      }
      if (/^(skills|skill_list)$/i.test(parentKey)) {
        return value.map((item) => {
          if (!isRecord(item)) return item
          const id = String(item.type ?? item.skill_id ?? item.id ?? '')
          return skillNames.get(id) ? { ...item, skill_name: skillNames.get(id) } : item
        })
      }
      return value.map((item) => visit(item, parentKey))
    }
    if (!isRecord(value)) return value
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, visit(item, key)]))
  }

  return visit(payload)
}

export async function handleQookkaSnapshot(request: Request, fetcher: Fetcher = fetch): Promise<Response> {
  if (request.method !== 'GET') return jsonResponse({ error: 'GETのみ利用できます。' }, 405)
  const snapshotId = new URL(request.url).searchParams.get('snapshot_id') ?? ''
  if (!SNAPSHOT_ID_PATTERN.test(snapshotId)) return jsonResponse({ error: 'snapshot_idの形式が正しくありません。' }, 400)

  try {
    const payload = await fetchJson(fetcher, createOfficialSnapshotUrl(snapshotId), 15_000)
    if (!isRecord(payload)) return jsonResponse({ error: '公式サイトの応答形式を確認できませんでした。' }, 502)
    const code = Number(payload.code ?? 0)
    if (code !== 0 || payload.error) {
      return jsonResponse({ error: '共有リンクの有効期限が切れているか、すでに無効です。' }, 410)
    }
    const config = await getOfficialConfig(fetcher)
    return jsonResponse(enrichOfficialRows(payload, config))
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'AbortError'
    return jsonResponse({ error: timedOut ? '公式サイトへの接続がタイムアウトしました。' : '公式サイトからデータを取得できませんでした。' }, timedOut ? 504 : 502)
  }
}

export function resetOfficialConfigCacheForTests(): void {
  officialConfigPromise = null
}
