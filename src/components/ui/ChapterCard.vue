<script setup>
import { computed } from 'vue'
import { buildChapterHash } from '../../lib/router.js'

const props = defineProps({
  doc: { type: Object, required: true },
  snippet: { type: String, default: '' },
  image: { type: Object, default: null },
  index: { type: Number, required: true },
  featured: { type: Boolean, default: false },
  directoryRow: { type: Boolean, default: false },
})

const hash = computed(() => buildChapterHash(props.doc.file))
</script>

<template>
  <a
    class="chapter-card"
    :class="`is-${doc.group}`"
    :href="hash"
    :aria-label="`打开${doc.title}`"
  >
    <span class="chapter-card__kicker" aria-hidden="true">{{ doc.kicker }}</span>
    <span class="chapter-card__body">
      <strong class="chapter-card__title">{{ doc.title }}</strong>
      <span v-if="snippet" class="chapter-card__snippet">{{ snippet }}</span>
      <span v-if="doc.tags?.length" class="chapter-card__tags">
        <span v-for="tag in doc.tags" :key="tag">{{ tag }}</span>
      </span>
    </span>
    <span class="chapter-card__arrow" aria-hidden="true">→</span>
  </a>
</template>
