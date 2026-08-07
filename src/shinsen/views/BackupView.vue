<template>
  <div class="page-stack backup-page">
    <section class="page-intro"><div><p class="eyebrow">端末間の移行</p><h2>バックアップと復元</h2><p>所持武将、凸数、覚醒、戦法、編成、設定を1つのファイルに保存します。</p></div></section>
    <div class="backup-grid">
      <section class="panel backup-card"><span class="backup-icon">↓</span><div><p class="eyebrow">書き出し</p><h2>現在のデータを保存</h2><p>{{ state.ownedHeroes.value.length }}名の武将と{{ state.formations.value.length }}個の編成をバックアップします。ゲームの公開画像や機密情報は含まれません。</p><button class="button button-primary" @click="exportData">バックアップを書き出す</button></div></section>
      <section class="panel backup-card"><span class="backup-icon">↑</span><div><p class="eyebrow">読み込み</p><h2>別の端末から復元</h2><p>ファイルを選ぶか、下の領域にドロップしてください。検証後、書き込み前に内容を表示します。</p><label class="button button-ghost file-button">ファイルを選択<input type="file" accept=".json,.shinsen.json,application/json" @change="onFileInput" /></label></div></section>
    </div>
    <section class="drop-zone" :class="{ dragging }" @dragenter.prevent="dragging = true" @dragover.prevent @dragleave.prevent="dragging = false" @drop.prevent="onDrop"><strong>バックアップをここにドロップ</strong><small>.shinsen.json / .json</small></section>
    <p v-if="error" class="inline-error">{{ error }}</p>
    <section v-if="preview" class="panel preview-panel">
      <div class="section-heading"><div><p class="eyebrow">読み込みプレビュー</p><h2>{{ fileName }}</h2></div><span>Schema v{{ preview.schemaVersion }}</span></div>
      <div class="preview-counts"><div><strong>{{ preview.userData.ownedHeroes.length }}</strong><span>所持武将</span></div><div><strong>{{ preview.userData.ownedSkills.length }}</strong><span>所持戦法</span></div><div><strong>{{ preview.userData.formations.length }}</strong><span>編成</span></div><div><strong>{{ preview.userData.unmatchedHeroes.length }}</strong><span>未一致</span></div></div>
      <div class="import-mode-grid"><button class="mode-card danger-mode" @click="apply('replace')"><strong>現在のデータを置き換える</strong><small>実行前に現在の状態を自動保護します</small></button><button class="mode-card" @click="apply('merge')"><strong>現在のデータと統合する</strong><small>凸数は高い方、覚醒はいずれかを採用</small></button></div>
    </section>
    <section class="panel recovery-panel"><div><h3>誤って置き換えた場合</h3><p>置き換え前のリカバリースナップショットがあれば戻せます。</p></div><button class="button button-quiet" @click="restore">直前の状態に戻す</button></section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { catalogMeta } from '../catalog'
import { createBackup, downloadBackup, parseBackup } from '../domain/backup'
import { readUserData } from '../db'
import { useAppState } from '../state'
import type { BackupEnvelope } from '../types'
const state = useAppState(); const preview = ref<BackupEnvelope | null>(null); const fileName = ref(''); const error = ref(''); const dragging = ref(false)
async function exportData() { downloadBackup(createBackup(await readUserData(), catalogMeta.databaseVersion)); state.notify('バックアップを書き出しました。') }
async function readFile(file?: File) { if (!file) return; error.value = ''; preview.value = null; try { if (file.size > 5_000_000) throw new Error('ファイルが大きすぎます。'); preview.value = parseBackup(await file.text()); fileName.value = file.name } catch (caught) { error.value = caught instanceof Error ? caught.message : '読み込みに失敗しました。' } }
function onFileInput(event: Event) { readFile((event.target as HTMLInputElement).files?.[0]) }
function onDrop(event: DragEvent) { dragging.value = false; readFile(event.dataTransfer?.files[0]) }
async function apply(mode: 'replace' | 'merge') { if (!preview.value) return; if (mode === 'replace' && !confirm('現在のデータを置き換えますか？直前の状態は自動保護されます。')) return; await state.applyImport({ ...preview.value.userData, importMetadata: { ...preview.value.userData.importMetadata, id: 'main', lastBackupImportAt: new Date().toISOString() } }, mode); preview.value = null }
async function restore() { const restored = await state.restoreRecovery(); if (!restored) state.notify('戻せるスナップショットがありません。', 'info') }
</script>
