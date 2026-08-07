<template>
  <div class="page-stack">
    <section class="hero-banner">
      <div class="hero-banner-copy">
        <p class="eyebrow">ローカルで完結する武将管理</p>
        <h2><span>所持武将から、</span><br><em>攻城の一手</em>を整える。</h2>
        <p>所持・凸数・器術・編成をひとつの武将帳で。データはこの端末に保存されます。</p>
        <div class="button-row"><RouterLink class="button button-primary" to="/heroes">武将を登録</RouterLink><RouterLink class="button button-ghost" to="/formations">編成を作る</RouterLink></div>
      </div>
      <div class="banner-portraits" aria-hidden="true"><img v-for="hero in featured" :key="hero.id" :src="hero.portrait" alt="" /></div>
    </section>

    <section class="metrics-grid" aria-label="所持データの概要">
      <article><span>所持武将</span><strong>{{ state.ownedHeroes.value.length }}</strong><small>/ {{ heroes.length }}名</small></article>
      <article><span>★5武将</span><strong>{{ fiveStarOwned }}</strong><small>所持中</small></article>
      <article><span>器術解放</span><strong>{{ unlockedArt }}</strong><small>{{ artOwned }}名中</small></article>
      <article><span>保存編成</span><strong>{{ state.formations.value.length }}</strong><small>部隊</small></article>
    </section>

    <section class="panel share-panel">
      <div class="section-heading"><div><p class="eyebrow">公式共有リンク</p><h2>所持武将を取り込む</h2></div><span class="privacy-badge">ドメイン検証済み</span></div>
      <p class="muted">ゲーム内で発行した公開共有URLを貼り付けてください。書き込み前に必ずプレビューします。</p>
      <p class="muted">不安定なページ要素ではなく、公式ページと同じ公開データ応答から武将・凸数・戦法を照合します。</p>
      <form class="share-form" @submit.prevent="loadShare"><input v-model="shareUrl" type="url" placeholder="https://general.qookkagames.com/...snapshot_id=..." aria-label="公式共有URL" required /><button class="button button-primary" :disabled="loadingShare">{{ loadingShare ? '読み込み中…' : 'データを確認' }}</button></form>
      <p v-if="shareError" class="inline-error">{{ shareError }} <RouterLink to="/heroes">手動で素早く登録する</RouterLink></p>
      <div v-if="preview" class="import-preview"><div><strong>{{ preview.ownedHeroes.length }}</strong><span>認識した武将</span></div><div><strong>{{ preview.ownedSkills.length }}</strong><span>所持戦法</span></div><div><strong>{{ preview.unmatchedHeroes.length }}</strong><span>未一致</span></div><button class="button button-primary" @click="applyShare">現在のデータと統合</button></div>
    </section>

    <div class="two-column">
      <section class="panel"><div class="section-heading"><h2>兵器候補</h2><RouterLink to="/arsenal">すべて見る</RouterLink></div><div v-if="topCandidates.length" class="candidate-list compact"><article v-for="candidate in topCandidates" :key="candidate.hero.id"><img :src="candidate.hero.portrait" :alt="candidate.hero.name" /><div><strong>{{ candidate.hero.name }}</strong><p>{{ candidate.reasons.join(' ・ ') }}</p></div><b>+{{ candidate.effectiveLevel }}</b></article></div><div v-else class="empty-mini">器術を持つ武将を登録すると、ここに候補が表示されます。</div></section>
      <section class="panel"><div class="section-heading"><h2>最近の編成</h2><RouterLink to="/formations">編成管理</RouterLink></div><div v-if="state.formations.value.length" class="recent-formations"><article v-for="formation in state.formations.value.slice(0, 3)" :key="formation.id"><span class="formation-mon">{{ formation.troopType.slice(0, 1) }}</span><div><strong>{{ formation.name }}</strong><p>{{ formation.troopType }} ・ {{ formatDate(formation.updatedAt) }}</p></div></article></div><div v-else class="empty-mini">まだ編成はありません。</div></section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { heroes } from '../catalog'
import { readUserData } from '../db'
import { isWeaponArtUnlocked, rankArsenalCandidates } from '../domain/arsenal'
import { importQookkaSnapshot, type NormalizedInventory } from '../importers/qookkaSnapshotImporter'
import { useAppState } from '../state'

const state = useAppState()
const shareUrl = ref('')
const shareError = ref('')
const loadingShare = ref(false)
const preview = ref<NormalizedInventory | null>(null)
const featuredNames = ['織田信長', '上杉謙信', '武田信玄']
const featured = heroes.filter((hero) => featuredNames.includes(hero.name))
const fiveStarOwned = computed(() => state.ownedHeroes.value.filter((owned) => heroes.find((hero) => hero.id === owned.heroId)?.rarity === 5).length)
const artOwned = computed(() => state.ownedHeroes.value.filter((owned) => heroes.find((hero) => hero.id === owned.heroId)?.weaponArt).length)
const unlockedArt = computed(() => state.ownedHeroes.value.filter((owned) => { const hero = heroes.find((item) => item.id === owned.heroId); return hero ? isWeaponArtUnlocked(hero, owned) : false }).length)
const topCandidates = computed(() => rankArsenalCandidates(heroes, state.ownedHeroes.value).slice(0, 3))
function formatDate(value: string) { return new Intl.DateTimeFormat('ja-JP', { month: 'short', day: 'numeric' }).format(new Date(value)) }
async function loadShare() { loadingShare.value = true; shareError.value = ''; preview.value = null; try { preview.value = await importQookkaSnapshot(shareUrl.value) } catch (error) { shareError.value = error instanceof Error ? error.message : '読み込みに失敗しました。' } finally { loadingShare.value = false } }
async function applyShare() { if (!preview.value) return; const current = await readUserData(); await state.applyImport({ ...current, ownedHeroes: preview.value.ownedHeroes, ownedSkills: preview.value.ownedSkills, unmatchedHeroes: preview.value.unmatchedHeroes, importMetadata: { ...current.importMetadata, lastOfficialImportAt: new Date().toISOString() } }, 'merge'); preview.value = null }
</script>
