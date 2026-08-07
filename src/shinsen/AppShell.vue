<template>
  <div class="app-shell">
    <aside class="sidebar">
      <RouterLink class="brand" to="/" aria-label="真戦武将帳 ホーム">
        <span class="brand-mark">真</span>
        <span><strong>真戦武将帳</strong><small>SHINSEN ARSENAL</small></span>
      </RouterLink>
      <nav class="side-nav" aria-label="メインメニュー">
        <RouterLink v-for="item in nav" :key="item.to" :to="item.to">
          <span aria-hidden="true">{{ item.icon }}</span><span>{{ item.label }}</span>
        </RouterLink>
      </nav>
      <div class="local-note"><span class="status-dot"></span><div><strong>ローカルモード</strong><small>アカウント不要</small></div></div>
    </aside>

    <div class="app-main">
      <header class="topbar">
        <div><p class="eyebrow">信長の野望 真戦</p><h1>{{ currentTitle }}</h1></div>
        <button class="button button-quiet update-button" :disabled="checking" @click="checkUpdate">
          <span aria-hidden="true">↻</span>{{ checking ? '確認中…' : '更新を確認' }}
        </button>
      </header>
      <main class="page-wrap">
        <div v-if="!state.ready.value" class="loading-state"><span class="spinner"></span><p>武将帳を開いています…</p></div>
        <RouterView v-else />
      </main>
    </div>

    <nav class="bottom-nav" aria-label="モバイルメニュー">
      <RouterLink v-for="item in mobileNav" :key="item.to" :to="item.to"><span>{{ item.icon }}</span><small>{{ item.short }}</small></RouterLink>
    </nav>

    <Transition name="toast"><div v-if="state.toast.visible" class="toast" :class="`toast-${state.toast.kind}`" role="status">{{ state.toast.message }}</div></Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { applyAvailableUpdate, checkForUpdates } from './domain/updates'
import { useAppState } from './state'

const route = useRoute()
const state = useAppState()
const checking = ref(false)
const currentTitle = computed(() => String(route.meta.title ?? '真戦武将帳'))
const nav = [
  { to: '/', icon: '◈', label: 'ホーム', short: 'ホーム' },
  { to: '/heroes', icon: '人', label: '武将図鑑・所持武将', short: '武将' },
  { to: '/skills', icon: '巻', label: '所持戦法', short: '戦法' },
  { to: '/arsenal', icon: '砲', label: '兵器部隊', short: '兵器' },
  { to: '/formations', icon: '陣', label: '編成', short: '編成' },
  { to: '/backup', icon: '箱', label: 'バックアップ', short: '保存' },
  { to: '/settings', icon: '⚙', label: '設定', short: '設定' },
]
const mobileNav = nav.filter((item) => ['/', '/heroes', '/arsenal', '/formations', '/settings'].includes(item.to))

async function checkUpdate() {
  checking.value = true
  const result = await checkForUpdates()
  checking.value = false
  state.notify(result.message, result.status === 'offline' ? 'error' : 'info')
  if (result.status === 'available' && confirm('新しいデータを適用するため、ページを再読み込みしますか？')) applyAvailableUpdate()
}

onMounted(() => state.init())
</script>
