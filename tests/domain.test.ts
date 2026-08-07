import { describe, expect, it } from 'vitest'
import { heroes } from '../src/shinsen/catalog'
import { isWeaponArtUnlocked, rankArsenalCandidates } from '../src/shinsen/domain/arsenal'
import { createFormation, summarizeFormation } from '../src/shinsen/domain/formation'
import { matchesJapaneseName, normalizeJapaneseName } from '../src/shinsen/domain/normalize'
import { normalizeOfficialResponse, parseQookkaShareUrl } from '../src/shinsen/importers/qookkaSnapshotImporter'
import { DEFAULT_SETTINGS } from '../src/shinsen/db'
import type { Hero, OwnedHero } from '../src/shinsen/types'

const now = '2026-08-07T00:00:00.000Z'
const baseHero: Hero = {
  id: 'hero-a', name: '織田信長', nameKana: 'おだのぶなが', rarity: 5, faction: '織田', clan: '織田', cost: 7,
  portrait: 'https://example.com/a.webp', stats: { valor: 10, leadership: 20, intelligence: 30, politics: 40, speed: 50 },
  uniqueSkill: '新生', teachableSkill: null, assemblySkill: null, traits: [],
  weaponArt: { name: '器術Ⅱ', level: 2, unlockBreakthrough: 2 }, sourceUrl: 'https://example.com', updatedAt: '2026-08-07',
}
const owned = (heroId: string, breakthrough: OwnedHero['breakthrough']): OwnedHero => ({ heroId, breakthrough, awakened: false, note: '', tags: [], equippedSkillIds: [], updatedAt: now })

describe('日本語検索', () => {
  it('全角・半角・空白・記号・カタカナを同一視する', () => {
    expect(normalizeJapaneseName(' オダ・ノブナガ ')).toBe('おだのぶなが')
    expect(normalizeJapaneseName('ＡＢＣ－１２３')).toBe('abc123')
    expect(matchesJapaneseName('オダ ノブナガ', '織田信長', 'おだのぶなが')).toBe(true)
    expect(matchesJapaneseName('信長', '織田信長', 'おだのぶなが')).toBe(true)
  })
})

describe('兵器候補', () => {
  it('突破条件を厳密に判定し、解放済みを上位にする', () => {
    expect(isWeaponArtUnlocked(baseHero, owned(baseHero.id, 1))).toBe(false)
    expect(isWeaponArtUnlocked(baseHero, owned(baseHero.id, 2))).toBe(true)
    const lower = { ...baseHero, id: 'hero-b', name: '武将B', weaponArt: { name: '器術Ⅰ', level: 1 as const, unlockBreakthrough: 0 as const } }
    const ranked = rankArsenalCandidates([lower, baseHero], [owned(lower.id, 0), owned(baseHero.id, 2)])
    expect(ranked.map((item) => item.hero.id)).toEqual(['hero-a', 'hero-b'])
    expect(ranked[0].reasons).toContain('兵器レベル +2')
  })
})

describe('編成集計', () => {
  it('COST・能力・勢力連携・兵器レベルを集計する', () => {
    const team = [0, 1, 2].map((index) => ({ ...baseHero, id: `hero-${index}`, name: `武将${index}`, cost: 7, weaponArt: index === 0 ? baseHero.weaponArt : null }))
    const formation = { ...createFormation('検証隊'), commanderId: team[0].id, vice1Id: team[1].id, vice2Id: team[2].id }
    const summary = summarizeFormation(formation, team, team.map((hero) => owned(hero.id, 2)), { ...DEFAULT_SETTINGS, costLimit: 18 })
    expect(summary.totalCost).toBe(21)
    expect(summary.totalStats.politics).toBe(120)
    expect(summary.weaponLevel).toBe(2)
    expect(summary.synergy).toContain('織田')
    expect(summary.warnings).toContain('COST上限を3超過しています。')
  })

  it('重複・未所持・空き枠を警告する', () => {
    const formation = { ...createFormation(), commanderId: baseHero.id, vice1Id: baseHero.id }
    const warnings = summarizeFormation(formation, [baseHero], [], DEFAULT_SETTINGS).warnings.join(' ')
    expect(warnings).toContain('3名')
    expect(warnings).toContain('同じ武将')
    expect(warnings).toContain('未所持')
  })
})

describe('Qookka共有URL', () => {
  it('正規URLからsnapshot_idを抽出する', () => {
    const result = parseQookkaShareUrl('https://general.qookkagames.com/xzdyw-station-qookka#/handbook?snapshot_id=69a465bcc9932d17ee3660e6')
    expect(result.snapshotId).toBe('69a465bcc9932d17ee3660e6')
  })

  it.each([
    'http://general.qookkagames.com/xzdyw-station-qookka#/handbook?snapshot_id=123456789012',
    'https://evil.example/xzdyw-station-qookka#/handbook?snapshot_id=123456789012',
    'https://general.qookkagames.com/other#/handbook?snapshot_id=123456789012',
    'https://general.qookkagames.com/xzdyw-station-qookka#/handbook',
  ])('不正URLを拒否する: %s', (url) => expect(() => parseQookkaShareUrl(url)).toThrow())

  it('既知武将・未知武将・技能を部分データから正規化する', () => {
    const known = heroes[0]
    const result = normalizeOfficialResponse({ data: [
      { selector: { data_view_type: 'hero' }, player_data: { heros: [
        { type: known.id.replace('hero-', ''), stage: 3, awakened: 1 },
        { type: 999999, hero_name: '未登録武将', stage: 2 },
      ] } },
      { selector: { data_view_type: 'skill' }, player_data: { skills: [{ skill_name: known.uniqueSkill }] } },
    ] }, 'snapshot-123456')
    expect(result.ownedHeroes).toHaveLength(1)
    expect(result.ownedHeroes[0]).toMatchObject({ heroId: known.id, breakthrough: 3, awakened: true })
    expect(result.unmatchedHeroes).toHaveLength(1)
    expect(result.ownedSkills.length).toBeGreaterThanOrEqual(1)
  })

  it('武将配列がないレスポンスを拒否する', () => {
    expect(() => normalizeOfficialResponse({ data: { skills: [] } }, 'snapshot-123456')).toThrow('武将情報')
  })
})
