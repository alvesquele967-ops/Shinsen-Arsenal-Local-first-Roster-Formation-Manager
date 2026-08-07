<template>
  <div class="page-stack">
    <section class="page-intro arsenal-intro"><div><p class="eyebrow">所持武将の確定評価</p><h2>兵器部隊の候補</h2><p>器術レベル、解放条件、COST、凸数を合わせて順位付けします。</p></div><div class="arsenal-total"><span>解放済み器術</span><strong>+{{ totalLevel }}</strong></div></section>
    <section v-if="candidates.length" class="candidate-board"><article v-for="(candidate, index) in candidates" :key="candidate.hero.id" :class="{ locked: !candidate.unlocked }"><span class="rank">{{ String(index + 1).padStart(2, '0') }}</span><img :src="candidate.hero.portrait" :alt="candidate.hero.name" loading="lazy" /><div class="candidate-main"><div><p class="eyebrow">{{ candidate.hero.faction }} ・ COST {{ candidate.hero.cost }}</p><h3>{{ candidate.hero.name }}</h3></div><div class="reason-row"><span v-for="reason in candidate.reasons" :key="reason">{{ reason }}</span></div></div><div class="level-mark"><small>{{ candidate.unlocked ? '有効' : '未解放' }}</small><strong>+{{ candidate.effectiveLevel }}</strong></div></article></section>
    <section v-else class="empty-state"><strong>兵器候補がまだいません</strong><p>武将図鑑で「器術」を持つ武将を登録してください。</p><RouterLink class="button button-primary" to="/heroes">武将を登録</RouterLink></section>
    <aside class="info-callout"><strong>評価の考え方</strong><p>解放前の器術は兵器レベルに含めません。勢力連携と器術は別の指標として扱います。実際の効果量はゲーム内の連携施設レベルによって異なります。</p></aside>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { heroes } from '../catalog'
import { rankArsenalCandidates } from '../domain/arsenal'
import { useAppState } from '../state'
const state = useAppState(); const candidates = computed(() => rankArsenalCandidates(heroes, state.ownedHeroes.value)); const totalLevel = computed(() => candidates.value.reduce((sum, candidate) => sum + candidate.effectiveLevel, 0))
</script>
