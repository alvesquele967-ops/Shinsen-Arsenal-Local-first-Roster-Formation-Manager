import { isWeaponArtUnlocked } from './arsenal'
import type { AppSettings, Formation, Hero, OwnedHero } from '../types'

export interface FormationSummary {
  heroes: Hero[]
  totalCost: number
  totalStats: Hero['stats']
  weaponLevel: number
  factions: Record<string, number>
  synergy: string | null
  warnings: string[]
}

export function summarizeFormation(
  formation: Formation,
  heroes: Hero[],
  ownedHeroes: OwnedHero[],
  settings: AppSettings,
): FormationSummary {
  const heroById = new Map(heroes.map((hero) => [hero.id, hero]))
  const ownedById = new Map(ownedHeroes.map((owned) => [owned.heroId, owned]))
  const ids = [formation.commanderId, formation.vice1Id, formation.vice2Id].filter((id): id is string => Boolean(id))
  const selected = ids.map((id) => heroById.get(id)).filter((hero): hero is Hero => Boolean(hero))
  const totalStats = selected.reduce((sum, hero) => ({
    valor: sum.valor + hero.stats.valor,
    leadership: sum.leadership + hero.stats.leadership,
    intelligence: sum.intelligence + hero.stats.intelligence,
    politics: sum.politics + hero.stats.politics,
    speed: sum.speed + hero.stats.speed,
  }), { valor: 0, leadership: 0, intelligence: 0, politics: 0, speed: 0 })
  const totalCost = selected.reduce((sum, hero) => sum + hero.cost, 0)
  const weaponLevel = selected.reduce((sum, hero) => {
    const owned = ownedById.get(hero.id)
    return sum + (isWeaponArtUnlocked(hero, owned) ? hero.weaponArt!.level : 0)
  }, 0)
  const factions = selected.reduce<Record<string, number>>((counts, hero) => {
    counts[hero.faction] = (counts[hero.faction] ?? 0) + 1
    return counts
  }, {})
  const linkedFaction = Object.entries(factions).find(([, count]) => count === 3)?.[0]
  const warnings: string[] = []
  if (ids.length < 3) warnings.push('武将を3名選択してください。')
  if (new Set(ids).size !== ids.length) warnings.push('同じ武将は複数の枠に配置できません。')
  if (totalCost > settings.costLimit) warnings.push(`COST上限を${totalCost - settings.costLimit}超過しています。`)
  for (const id of ids) if (!ownedById.has(id)) warnings.push('未所持の武将が含まれています。')
  for (const hero of selected) {
    const current = ownedById.get(hero.id)?.breakthrough ?? 0
    if (hero.traits.some((trait) => trait.unlockBreakthrough > current)) warnings.push(`${hero.name}に未解放の特性があります。`)
  }
  return {
    heroes: selected,
    totalCost,
    totalStats,
    weaponLevel,
    factions,
    synergy: linkedFaction ? `${linkedFaction}の勢力連携条件を満たしています` : null,
    warnings: [...new Set(warnings)],
  }
}

export function createFormation(name = '新しい編成'): Formation {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(), name, commanderId: null, vice1Id: null, vice2Id: null, troopType: '兵器',
    skills: { commander: [], vice1: [], vice2: [] }, note: '', createdAt: now, updatedAt: now,
  }
}
