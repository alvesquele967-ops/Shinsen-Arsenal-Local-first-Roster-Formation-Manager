<template>
  <div class="page-stack settings-page">
    <section class="page-intro"><div><p class="eyebrow">ローカルモード</p><h2>設定とデータ情報</h2><p>すべての個人データはこのブラウザの IndexedDB に保存されます。</p></div></section>
    <section class="panel settings-group"><div><h3>表示と編成</h3><p>武将図鑑の初期表示と編成のCOST上限を調整します。</p></div><div class="settings-controls"><label class="switch-row"><span><strong>★3武将を初期表示で隠す</strong><small>稀有度を指定すると表示できます</small></span><input v-model="draft.hideThreeStar" type="checkbox" /></label><label><span><strong>編成COST上限</strong><small>超過時に警告を表示</small></span><input v-model.number="draft.costLimit" type="number" min="3" max="30" /></label></div><button class="button button-primary" @click="save">設定を保存</button></section>
    <section class="panel update-panel"><div><p class="eyebrow">公開データベース</p><h3>データの更新を確認</h3><p>武将 {{ catalogMeta.heroCount }}名 ・ 戦法 {{ catalogMeta.skillCount }}個 ・ {{ catalogMeta.databaseVersion }}</p></div><button class="button button-ghost" :disabled="checking" @click="check"><span>↻</span>{{ checking ? '確認中…' : '今すぐ確認' }}</button></section>
    <section class="panel source-panel"><h3>データ出典</h3><a v-for="source in catalogMeta.sources" :key="source.url" :href="source.url" target="_blank" rel="noreferrer"><strong>{{ source.name }}</strong><span>{{ source.url }}</span></a><p>データと画像の権利は各権利者に帰属します。本ツールは非公式のファンツールです。</p></section>
    <section class="panel danger-zone"><div><h3>この端末のデータを初期化</h3><p>先にバックアップを書き出すことをおすすめします。</p></div><button class="button button-danger" @click="resetData">ローカルデータを初期化</button></section>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, toRaw } from 'vue'
import { catalogMeta } from '../catalog'
import { db } from '../db'
import { applyAvailableUpdate, checkForUpdates } from '../domain/updates'
import { useAppState } from '../state'
const state = useAppState(); const draft = reactive(structuredClone(toRaw(state.settings.value))); const checking = ref(false)
async function save() { await state.saveSettings({ ...draft, id: 'main' }) }
async function check() { checking.value = true; const result = await checkForUpdates(); checking.value = false; state.notify(result.message, result.status === 'offline' ? 'error' : 'info'); if (result.status === 'available' && confirm('新しいデータを適用しますか？')) applyAvailableUpdate() }
async function resetData() { if (!confirm('所持武将・戦法・編成・設定をすべて削除します。元に戻せません。実行しますか？')) return; await db.delete(); location.reload() }
</script>
