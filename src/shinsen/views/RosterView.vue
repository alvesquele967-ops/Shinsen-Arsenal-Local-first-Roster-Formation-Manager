<template>
  <div class="page-stack">
    <section class="page-intro"><div><p class="eyebrow">{{ filtered.length }} / {{ heroes.length }}名</p><h2>武将図鑑と所持状況</h2><p>カード右下を押すと、未所持 → 0凸 → … → 満凸の順で素早く登録できます。</p></div></section>
    <section class="filter-panel">
      <label class="search-field"><span aria-hidden="true">⌕</span><input v-model="query" type="search" placeholder="武将名・読みで検索" /></label>
      <div class="filter-row">
        <select v-model="ownership" aria-label="所持状況"><option value="all">すべて</option><option value="owned">所持のみ</option><option value="unowned">未所持のみ</option></select>
        <select v-model="rarity" aria-label="稀有度"><option value="all">すべての稀有度</option><option value="5">★★★★★</option><option value="4">★★★★</option><option value="3">★★★</option></select>
        <select v-model="faction" aria-label="勢力"><option value="all">すべての勢力</option><option v-for="item in factions" :key="item" :value="item">{{ item }}</option></select>
        <select v-model="cost" aria-label="COST"><option value="all">すべてのCOST</option><option v-for="item in costs" :key="item" :value="item">COST {{ item }}</option></select>
        <select v-model="breakthrough" aria-label="凸数"><option value="all">すべての凸数</option><option v-for="item in 6" :key="item - 1" :value="item - 1">{{ item - 1 === 5 ? '満凸' : `${item - 1}凸` }}</option></select>
        <select v-model="awakened" aria-label="覚醒"><option value="all">覚醒・すべて</option><option value="yes">覚醒済み</option><option value="no">未覚醒</option></select>
        <select v-model="art" aria-label="器術"><option value="all">器術・すべて</option><option value="has">器術あり</option><option value="1">器術Ⅰ</option><option value="2">器術Ⅱ</option><option value="3">器術Ⅲ</option><option value="unlocked">解放済み</option><option value="locked">未解放</option></select>
        <select v-model="troop" aria-label="兵種"><option value="all">兵種特性・すべて</option><option v-for="item in troops" :key="item" :value="item">{{ item }}</option></select>
        <select v-model="sortBy" aria-label="並び順"><option value="rarity">稀有度順</option><option value="breakthrough">凸数順</option><option value="cost">COST順</option><option value="valor">武勇順</option><option value="leadership">統率順</option><option value="intelligence">知略順</option><option value="politics">政務順</option><option value="speed">速度順</option><option value="weaponArt">器術順</option></select>
      </div>
    </section>
    <section v-if="filtered.length" class="hero-grid"><HeroCard v-for="hero in filtered" :key="hero.id" :hero="hero" :owned="state.ownedById.value.get(hero.id)" @cycle="state.cycleHero" @detail="selected = $event" /></section>
    <section v-else class="empty-state"><strong>条件に一致する武将がいません</strong><p>検索語や絞り込みを変更してください。</p><button class="button button-ghost" @click="resetFilters">条件をリセット</button></section>
    <HeroDialog v-if="selected" :key="selected.id" :hero="selected" :owned="state.ownedById.value.get(selected.id)" @close="selected = null" @save="state.saveOwnedHero" @remove="remove" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { heroes } from '../catalog'
import HeroCard from '../components/HeroCard.vue'
import HeroDialog from '../components/HeroDialog.vue'
import { isWeaponArtUnlocked } from '../domain/arsenal'
import { matchesJapaneseName } from '../domain/normalize'
import { useAppState } from '../state'
import type { Hero } from '../types'

const state = useAppState()
const query = ref(''), ownership = ref('all'), rarity = ref('all'), faction = ref('all'), cost = ref('all'), breakthrough = ref('all'), awakened = ref('all'), art = ref('all'), troop = ref('all')
const sortBy = ref(state.settings.value.sortBy)
const selected = ref<Hero | null>(null)
const factions = [...new Set(heroes.map((hero) => hero.faction))].sort((a, b) => a.localeCompare(b, 'ja'))
const costs = [...new Set(heroes.map((hero) => hero.cost))].sort((a, b) => a - b)
const troops = ['足軽', '騎兵', '弓兵', '鉄砲', '兵器']
const troopPatterns: Record<string, RegExp> = {
  足軽: /足軽|槍術|槍砲術|弓槍術/,
  騎兵: /騎兵|馬術/,
  弓兵: /弓兵|弓術|弓砲術|弓槍術/,
  鉄砲: /鉄砲|砲術|弓砲術|槍砲術/,
  兵器: /器術/,
}
const filtered = computed(() => heroes.filter((hero) => {
  const owned = state.ownedById.value.get(hero.id)
  if (!matchesJapaneseName(query.value, hero.name, hero.nameKana)) return false
  if (ownership.value === 'owned' && !owned) return false
  if (ownership.value === 'unowned' && owned) return false
  if (rarity.value !== 'all' && hero.rarity !== Number(rarity.value)) return false
  if (faction.value !== 'all' && hero.faction !== faction.value) return false
  if (cost.value !== 'all' && hero.cost !== Number(cost.value)) return false
  if (breakthrough.value !== 'all' && owned?.breakthrough !== Number(breakthrough.value)) return false
  if (awakened.value === 'yes' && !owned?.awakened) return false
  if (awakened.value === 'no' && (!owned || owned.awakened)) return false
  if (art.value === 'has' && !hero.weaponArt) return false
  if (['1', '2', '3'].includes(art.value) && hero.weaponArt?.level !== Number(art.value)) return false
  if (art.value === 'unlocked' && !isWeaponArtUnlocked(hero, owned)) return false
  if (art.value === 'locked' && (!hero.weaponArt || !owned || isWeaponArtUnlocked(hero, owned))) return false
  if (troop.value !== 'all' && !hero.traits.some((trait) => troopPatterns[troop.value].test(trait.name))) return false
  if (state.settings.value.hideThreeStar && rarity.value === 'all' && hero.rarity === 3) return false
  return true
}).sort((a, b) => {
  const ownedA = state.ownedById.value.get(a.id), ownedB = state.ownedById.value.get(b.id)
  const values: Record<string, [number, number]> = {
    rarity: [a.rarity, b.rarity], breakthrough: [ownedA?.breakthrough ?? -1, ownedB?.breakthrough ?? -1], cost: [a.cost, b.cost],
    valor: [a.stats.valor, b.stats.valor], leadership: [a.stats.leadership, b.stats.leadership], intelligence: [a.stats.intelligence, b.stats.intelligence], politics: [a.stats.politics, b.stats.politics], speed: [a.stats.speed, b.stats.speed], weaponArt: [a.weaponArt?.level ?? 0, b.weaponArt?.level ?? 0],
  }
  const [av, bv] = values[sortBy.value] ?? values.rarity
  return bv - av || a.name.localeCompare(b.name, 'ja')
}))
function resetFilters() { query.value = ''; ownership.value = 'all'; rarity.value = 'all'; faction.value = 'all'; cost.value = 'all'; breakthrough.value = 'all'; awakened.value = 'all'; art.value = 'all'; troop.value = 'all' }
async function remove(heroId: string) { await state.removeOwnedHero(heroId); selected.value = null }
</script>
