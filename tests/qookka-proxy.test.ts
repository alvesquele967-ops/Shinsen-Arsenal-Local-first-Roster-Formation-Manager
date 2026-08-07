import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createOfficialSnapshotUrl, handleQookkaSnapshot, resetOfficialConfigCacheForTests } from '../src/server/qookkaProxy'

const snapshotId = '6a091c97fb8d1ceae2fe1a78'

beforeEach(() => resetOfficialConfigCacheForTests())

describe('Qookka公式スナップショット代理取得', () => {
  it('公式ページと同じselectorを送る', () => {
    const url = new URL(createOfficialSnapshotUrl(snapshotId))
    const payload = JSON.parse(url.searchParams.get('_json') ?? '{}')
    expect(url.pathname).toBe('/sns/web/api/cache/get_player_share_snapshot')
    expect(payload).toEqual({
      game_id: 's11',
      snapshot_id: snapshotId,
      selectors: [
        { selector_type: 'view', data_view_type: 'hero' },
        { selector_type: 'view', data_view_type: 'skill' },
      ],
    })
  })

  it('公式IDを日本語名で補完して返す', async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = String(input)
      if (url.includes('cfg.json')) {
        return Response.json({
          hero: [{ id: 10001, show_name: '織田信長' }],
          skill: [{ id: 20001, show_name: '新生' }],
          multi_lang: [],
        })
      }
      return Response.json({ code: 0, data: [
        { selector: { data_view_type: 'hero' }, player_data: { heros: [{ type: 10001, stage: 3 }] } },
        { selector: { data_view_type: 'skill' }, player_data: { skills: [{ id: 20001 }] } },
      ] })
    })
    const response = await handleQookkaSnapshot(new Request(`http://localhost/api/qookka-snapshot?snapshot_id=${snapshotId}`), fetcher)
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ data: [
      { player_data: { heros: [{ hero_name: '織田信長', stage: 3 }] } },
      { player_data: { skills: [{ skill_name: '新生' }] } },
    ] })
  })

  it('無効なIDを公式サイトへ送らない', async () => {
    const fetcher = vi.fn()
    const response = await handleQookkaSnapshot(new Request('http://localhost/api/qookka-snapshot?snapshot_id=bad'), fetcher)
    expect(response.status).toBe(400)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('失効した共有リンクを410として返す', async () => {
    const response = await handleQookkaSnapshot(
      new Request(`http://localhost/api/qookka-snapshot?snapshot_id=${snapshotId}`),
      async () => Response.json({ code: 10000, message: '参数错误', error: { code: 84053101 } }),
    )
    expect(response.status).toBe(410)
    expect(await response.json()).toMatchObject({ error: expect.stringContaining('有効期限') })
  })
})
