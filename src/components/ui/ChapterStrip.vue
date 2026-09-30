<script setup>
import { nextTick, onMounted, ref, watch } from 'vue'
import { chapterCode } from '../../lib/chapter.js'
import { revealInHorizontalScroll } from '../../lib/travel.js'

const props = defineProps({
  docs: { type: Array, default: () => [] },
  current: { type: Object, default: null },
  label: { type: String, default: '本卷章节导航' },
})

const emit = defineEmits(['navigate'])

const track = ref(null)

function shortTitle(doc) {
  return doc.title.replace(/^Day\s*\d+\s*·\s*/i, '')
}

async function revealCurrent() {
  await nextTick()
  revealInHorizontalScroll(track.value, track.value?.querySelector('.chapter-strip__item.is-current'))
}

function onKeydown(event) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  const buttons = [...(track.value?.querySelectorAll('button') || [])]
  const index = buttons.indexOf(event.target.closest('button'))
  if (index < 0 || !buttons.length) return
  event.preventDefault()
  const nextIndex = event.key === 'Home'
    ? 0
    : event.key === 'End'
      ? buttons.length - 1
      : (index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length
  buttons[nextIndex]?.focus({ preventScroll: true })
  revealInHorizontalScroll(track.value, buttons[nextIndex])
}

watch(() => props.current?.file, revealCurrent)
onMounted(revealCurrent)
</script>

<template>
  <nav class="chapter-strip" :aria-label="label">
    <div ref="track" class="chapter-strip__track" tabindex="0" @keydown="onKeydown">
      <button
        v-for="doc in docs"
        :key="doc.file"
        type="button"
        class="chapter-strip__item"
        :class="{ 'is-current': current?.file === doc.file }"
        :aria-current="current?.file === doc.file ? 'page' : undefined"
        :aria-label="`打开${doc.title}`"
        @click="emit('navigate', doc.file)"
      >
        <b>{{ chapterCode(doc, docs) }}</b>
        <span>{{ shortTitle(doc) }}</span>
      </button>
    </div>
  </nav>
</template>
