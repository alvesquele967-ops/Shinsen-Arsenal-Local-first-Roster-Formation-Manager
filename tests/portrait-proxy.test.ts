import { describe, expect, it, vi } from 'vitest'
import { handlePortrait, parsePortraitUrl } from '../src/server/portraitProxy'

describe('編成PNG用の武将画像取得', () => {
  it('Game8のHTTPS画像だけを許可する', () => {
    expect(parsePortraitUrl('https://img.game8.jp/123/hero.webp/original')?.hostname).toBe('img.game8.jp')
    expect(parsePortraitUrl('http://img.game8.jp/123/hero.webp')).toBeNull()
    expect(parsePortraitUrl('https://example.com/hero.webp')).toBeNull()
    expect(parsePortraitUrl('not-a-url')).toBeNull()
  })

  it('画像を同一オリジン向けの応答として返す', async () => {
    const bytes = new Uint8Array([137, 80, 78, 71])
    const fetcher = vi.fn(async () => new Response(bytes, { headers: { 'content-type': 'image/png' } }))
    const source = encodeURIComponent('https://img.game8.jp/123/hero.webp/original')
    const response = await handlePortrait(new Request(`http://localhost/api/portrait?url=${source}`), fetcher)
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('image/png')
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes)
  })

  it('許可外URLを取得しない', async () => {
    const fetcher = vi.fn()
    const response = await handlePortrait(new Request('http://localhost/api/portrait?url=https://example.com/a.png'), fetcher)
    expect(response.status).toBe(400)
    expect(fetcher).not.toHaveBeenCalled()
  })
})
