<template>
  <div class="page-stack">
    <section class="page-intro"><div><p class="eyebrow">{{ state.ownedSkills.value.length }} / {{ skills.length }}個</p><h2>所持戦法</h2><p>戦法名または読みで検索し、所持状況を記録できます。</p></div></section>
    <section class="filter-panel"><label class="search-field"><span>⌕</span><input v-model="query" type="search" placeholder="戦法を検索" /></label><div class="filter-row"><select v-model="type" aria-label="戦法種類"><option value="all">すべての種類</option><option v-for="item in types" :key="item" :value="item">{{ item }}</option></select><label class="check-label"><input v-model="ownedOnly" type="checkbox" />所持のみ</label></div></section>
    <section class="skill-list"><article v-for="skill in filtered" :key="skill.id" :class="{ owned: ownedIds.has(skill.id) }"><button class="skill-check" type="button" :aria-label="`${skill.name}の所持を切り替え`" @click="state.toggleSkill(skill.id)">{{ ownedIds.has(skill.id) ? '✓' : '＋' }}</button><div><div class="skill-title"><strong>{{ skill.name }}</strong><span>{{ skill.rarity }} ・ {{ skill.type }}</span></div><p>{{ skill.description || '説明は未収録です。' }}</p><small v-if="skill.activationRate">発動確率 {{ skill.activationRate }}</small></div></article></section>
  </div>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import { skills } from '../catalog'
import { matchesJapaneseName } from '../domain/normalize'
import { useAppState } from '../state'
const state = useAppState(); const query = ref(''); const type = ref('all'); const ownedOnly = ref(false)
const types = [...new Set(skills.map((skill) => skill.type))].sort()
const ownedIds = computed(() => new Set(state.ownedSkills.value.map((skill) => skill.skillId)))
const filtered = computed(() => skills.filter((skill) => matchesJapaneseName(query.value, skill.name, skill.nameKana) && (type.value === 'all' || skill.type === type.value) && (!ownedOnly.value || ownedIds.value.has(skill.id))))
</script>
