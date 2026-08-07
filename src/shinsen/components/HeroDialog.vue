<template>
  <div class="modal-backdrop" role="presentation" @click.self="$emit('close')">
    <section class="modal hero-dialog" role="dialog" aria-modal="true" :aria-label="`${hero.name}の詳細`">
      <button class="modal-close" type="button" aria-label="閉じる" @click="$emit('close')">×</button>
      <div class="hero-dialog-head">
        <img :src="hero.portrait" :alt="hero.name" />
        <div><p class="eyebrow">{{ hero.faction }} ・ COST {{ hero.cost }}</p><h2>{{ hero.name }}</h2><p class="kana">{{ hero.nameKana }}</p><p class="stars">{{ '★'.repeat(hero.rarity) }}</p></div>
      </div>
      <dl class="stats-grid">
        <div><dt>武勇</dt><dd>{{ hero.stats.valor }}</dd></div><div><dt>統率</dt><dd>{{ hero.stats.leadership }}</dd></div>
        <div><dt>知略</dt><dd>{{ hero.stats.intelligence }}</dd></div><div><dt>政務</dt><dd>{{ hero.stats.politics }}</dd></div><div><dt>速度</dt><dd>{{ hero.stats.speed }}</dd></div>
      </dl>
      <section class="detail-block"><h3>固有戦法</h3><strong>{{ hero.uniqueSkill }}</strong><p v-if="uniqueSkillData">{{ uniqueSkillData.description }}</p><small v-if="uniqueSkillData">{{ uniqueSkillData.type }}<template v-if="uniqueSkillData.activationRate"> ・ 発動確率 {{ uniqueSkillData.activationRate }}</template></small></section>
      <section class="detail-block"><h3>特性</h3><div v-for="trait in hero.traits" :key="trait.name" class="trait-row" :class="{ locked: draft.breakthrough < trait.unlockBreakthrough }"><div><strong>{{ trait.name }}</strong><small>{{ trait.unlockBreakthrough }}凸で解放</small></div><p>{{ trait.description }}</p></div></section>
      <section class="detail-block"><h3>兵種関連特性</h3><div v-if="troopTraits.length" class="reason-row"><span v-for="trait in troopTraits" :key="trait.name">{{ trait.name }}</span></div><p v-else class="muted">兵種レベルに関する特性はありません。</p></section>
      <section class="detail-block personal-block">
        <h3>所持状態</h3>
        <div class="form-grid"><label>凸数<select v-model.number="draft.breakthrough"><option v-for="n in 6" :key="n-1" :value="n-1">{{ n-1 === 5 ? '満凸' : `${n-1}凸` }}</option></select></label><label class="check-label"><input v-model="draft.awakened" type="checkbox" />覚醒済み</label></div>
        <div class="form-grid"><label>装着戦法1<select v-model="draft.equippedSkillIds[0]"><option value="">未設定</option><option v-for="skill in ownedSkillOptions" :key="skill.id" :value="skill.id" :disabled="draft.equippedSkillIds[1] === skill.id">{{ skill.name }}</option></select></label><label>装着戦法2<select v-model="draft.equippedSkillIds[1]"><option value="">未設定</option><option v-for="skill in ownedSkillOptions" :key="skill.id" :value="skill.id" :disabled="draft.equippedSkillIds[0] === skill.id">{{ skill.name }}</option></select></label></div>
        <p v-if="!ownedSkillOptions.length" class="muted">「所持戦法」で戦法を登録すると装着できます。</p>
        <label>タグ<input v-model="tagsText" type="text" placeholder="主力, 攻城" /></label>
        <label>備考<textarea v-model="draft.note" rows="3" placeholder="運用メモを入力"></textarea></label>
        <div class="modal-actions"><button v-if="owned" class="button button-danger" type="button" @click="$emit('remove', hero.id)">所持から外す</button><button class="button button-primary" type="button" @click="save">保存</button></div>
      </section>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, toRaw } from 'vue'
import { skills } from '../catalog'
import { useAppState } from '../state'
import type { Hero, OwnedHero } from '../types'
const props = defineProps<{ hero: Hero; owned?: OwnedHero }>()
const emit = defineEmits<{ close: []; save: [record: OwnedHero]; remove: [heroId: string] }>()
const state = useAppState()
const source = props.owned ? toRaw(props.owned) : null
const draft = reactive<OwnedHero>(source ? { ...source, tags: [...source.tags], equippedSkillIds: [...(source.equippedSkillIds ?? []), '', ''].slice(0, 2) } : { heroId: props.hero.id, breakthrough: 0, awakened: false, note: '', tags: [], equippedSkillIds: ['', ''], updatedAt: new Date().toISOString() })
const tagsText = ref(draft.tags.join(', '))
const uniqueSkillData = computed(() => skills.find((skill) => skill.name === props.hero.uniqueSkill))
const ownedSkillOptions = computed(() => { const ids = new Set(state.ownedSkills.value.map((item) => item.skillId)); return skills.filter((skill) => ids.has(skill.id)) })
const troopTraits = computed(() => props.hero.traits.filter((trait) => /足軽|槍術|騎兵|馬術|弓兵|弓術|鉄砲|砲術|器術/.test(trait.name)))
function save() { draft.tags = tagsText.value.split(/[,、]/).map((tag) => tag.trim()).filter(Boolean); const equippedSkillIds = [...new Set(draft.equippedSkillIds.filter(Boolean))].slice(0, 2); emit('save', { ...draft, tags: [...draft.tags], equippedSkillIds }); emit('close') }
</script>
