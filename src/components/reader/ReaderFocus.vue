<script setup>
import { ArrowRight, Clock, Guide, Reading, Warning } from '@element-plus/icons-vue'
import { buildChapterHash } from '../../lib/router.js'

defineProps({
  file: { type: String, required: true },
  items: { type: Array, required: true },
})
defineEmits(['navigate'])

const icons = { key: Clock, risk: Warning, info: Guide }
</script>

<template>
  <section v-if="items.length" class="reader-focus" aria-labelledby="readerFocusTitle">
    <div class="reader-focus__head">
      <h2 id="readerFocusTitle"><Reading aria-hidden="true" />本章先读</h2>
      <span>{{ items.length }} 个重点 · 点选直达</span>
    </div>
    <div class="reader-focus__grid">
      <a
        v-for="(item, index) in items"
        :key="`${item.section}-${index}`"
        class="reader-focus__item"
        :data-reading-tone="item.tone"
        :href="buildChapterHash(file, item.section)"
        @click.prevent="$emit('navigate', item.section)"
      >
        <span class="reader-focus__label"><component :is="icons[item.tone]" aria-hidden="true" />{{ item.label }}</span>
        <strong class="reader-focus__title">{{ item.title }}</strong>
        <p class="reader-focus__detail">{{ item.detail }}</p>
        <ArrowRight class="reader-focus__arrow" aria-hidden="true" />
      </a>
    </div>
  </section>
</template>
