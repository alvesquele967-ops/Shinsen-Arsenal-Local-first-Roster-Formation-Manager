import type { Hero, OwnedHero } from '../types'

export interface ArsenalCandidate {
  hero: Hero
  owned: OwnedHero
  unlocked: boolean
  effectiveLevel: number
  score: number
  reasons: string[]
}

export function isWeaponArtUnlocked(hero: Hero, owned: OwnedHero | undefined): boolean {
  return Boolean(hero.weaponArt && owned && owned.breakthrough >= hero.weaponArt.unlockBreakthrough)
}

export function rankArsenalCandidates(heroes: Hero[], ownedHeroes: OwnedHero[]): ArsenalCandidate[] {
  const ownedById = new Map(ownedHeroes.map((owned) => [owned.heroId, owned]))
  return heroes
    .filter((hero) => hero.weaponArt && ownedById.has(hero.id))
    .map((hero) => {
      const owned = ownedById.get(hero.id)!
      const unlocked = isWeaponArtUnlocked(hero, owned)
      const effectiveLevel = unlocked ? hero.weaponArt!.level : 0
      const score = effectiveLevel * 100 + owned.breakthrough * 4 - hero.cost * 3 + hero.stats.leadership / 100
      const unlockText = hero.weaponArt!.unlockBreakthrough === 0
        ? '0凸から有効'
        : `${hero.weaponArt!.unlockBreakthrough}凸で解放`
      return {
        hero,
        owned,
        unlocked,
        effectiveLevel,
        score,
        reasons: [hero.weaponArt!.name, unlocked ? `兵器レベル +${effectiveLevel}` : '未解放', unlockText, `COST ${hero.cost}`, hero.faction],
      }
    })
    .sort((a, b) => b.score - a.score || a.hero.cost - b.hero.cost || a.hero.name.localeCompare(b.hero.name, 'ja'))
}
