<template>
  <article class="hero-card" :class="{ owned: Boolean(owned) }">
    <button class="hero-visual" :class="{ 'image-failed': failed }" type="button" @click="$emit('detail', hero)" :aria-label="`${hero.name}の詳細`">
      <img :src="failed ? placeholder : hero.portrait" :alt="hero.name" loading="lazy" decoding="async" @error="failed = true" />
      <span class="rarity">{{ '★'.repeat(hero.rarity) }}</span>
      <span class="cost">COST {{ hero.cost }}</span>
      <span v-if="hero.weaponArt" class="art-mark">{{ hero.weaponArt.name }}</span>
    </button>
    <div class="hero-card-body">
      <div><h3>{{ hero.name }}</h3><p>{{ hero.faction }}<span>・</span>{{ hero.clan }}</p></div>
      <button class="cycle-button" type="button" @click="$emit('cycle', hero.id)">
        <template v-if="owned"><strong>{{ owned.breakthrough === 5 ? '満凸' : `${owned.breakthrough}凸` }}</strong><small>{{ owned.awakened ? '覚醒済み' : '所持' }}</small></template>
        <template v-else><strong>＋</strong><small>未所持</small></template>
      </button>
    </div>
  </article>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Hero, OwnedHero } from '../types'
defineProps<{ hero: Hero; owned?: OwnedHero }>()
defineEmits<{ cycle: [heroId: string]; detail: [hero: Hero] }>()
const failed = ref(false)
const placeholder = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
</script>
