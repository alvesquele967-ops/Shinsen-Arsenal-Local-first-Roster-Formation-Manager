const ALLOWED_HOST = 'img.game8.jp'
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

function textResponse(message: string, status: number): Response {
  return new Response(message, {
    status,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  })
}

export function parsePortraitUrl(value: string): URL | null {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.hostname !== ALLOWED_HOST || url.username || url.password) return null
    return url
  } catch {
    return null
  }
}

export async function handlePortrait(request: Request, fetcher: Fetcher = fetch): Promise<Response> {
  if (request.method !== 'GET') return textResponse('GETのみ利用できます。', 405)
  const source = parsePortraitUrl(new URL(request.url).searchParams.get('url') ?? '')
  if (!source) return textResponse('画像URLが許可されていません。', 400)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12_000)
  try {
    const upstream = await fetcher(source, {
      method: 'GET',
      headers: { accept: 'image/avif,image/webp,image/png,image/jpeg,image/*' },
      redirect: 'error',
      signal: controller.signal,
    })
    if (!upstream.ok) return textResponse('画像を取得できませんでした。', 502)
    const contentType = upstream.headers.get('content-type')?.split(';', 1)[0] ?? ''
    if (!contentType.startsWith('image/')) return textResponse('取得結果が画像ではありません。', 502)
    const declaredSize = Number(upstream.headers.get('content-length') ?? 0)
    if (declaredSize > MAX_IMAGE_BYTES) return textResponse('画像サイズが上限を超えています。', 413)
    const body = await upstream.arrayBuffer()
    if (body.byteLength > MAX_IMAGE_BYTES) return textResponse('画像サイズが上限を超えています。', 413)
    return new Response(body, {
      headers: {
        'content-type': contentType,
        'content-length': String(body.byteLength),
        'cache-control': 'public, max-age=86400, s-maxage=7776000, immutable',
        'x-content-type-options': 'nosniff',
      },
    })
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'AbortError'
    return textResponse(timedOut ? '画像の取得がタイムアウトしました。' : '画像を取得できませんでした。', timedOut ? 504 : 502)
  } finally {
    clearTimeout(timer)
  }
}
