<script setup>
import { computed, nextTick, ref, watch } from 'vue'

const props = defineProps({
  items: { type: Array, default: () => [] },
  activeSection: { type: String, default: '' },
})

const emit = defineEmits(['navigate'])
const tocBody = ref(null)

const tocItems = computed(() => {
  let sectionNumber = 0
  return props.items.map((item) => {
    const number = item.level === 2 ? String(++sectionNumber).padStart(2, '0') : ''
    return { ...item, number }
  })
})

watch(() => props.activeSection, async (id) => {
  if (!id) return
  await nextTick()
  const el = globalThis.CSS?.escape ? CSS.escape(id) : id
  const active = tocBody.value?.querySelector(`.toc__link[data-section="${el}"]`)
  const container = tocBody.value?.closest('.toc')
  if (!active || !container) return
  const bounds = container.getBoundingClientRect()
  const target = active.getBoundingClientRect()
  if (target.top < bounds.top) container.scrollTop += target.top - bounds.top
  else if (target.bottom > bounds.bottom) container.scrollTop += target.bottom - bounds.bottom
})
</script>

<template>
  <nav class="toc" aria-label="本章目录">
    <ol ref="tocBody" class="toc__list">
      <li
        v-for="item in tocItems"
        :key="item.id"
        :class="['toc__item', `is-level-${item.level}`, { 'is-active': activeSection === item.id }]"
      >
        <a
          class="toc__link"
          :class="{ 'is-active': activeSection === item.id }"
          :data-section="item.id"
          :data-reading-tone="item.tone"
          :href="`#${encodeURIComponent(item.id)}`"
          :aria-current="activeSection === item.id ? 'location' : undefined"
          @click.prevent="$emit('navigate', item.id)"
        >
          <span v-if="item.level === 2" class="toc__mark toc__index" aria-hidden="true">{{ item.number }}</span>
          <span v-else class="toc__mark toc__dot" aria-hidden="true" />
          <span class="toc__text">{{ item.text }}</span>
          <span v-if="item.priorityLabel" class="toc__priority">{{ item.tone === 'risk' ? '必看' : item.tone === 'info' ? '备选' : '重点' }}</span>
          <span v-if="activeSection === item.id" class="toc__active" aria-hidden="true" />
        </a>
      </li>
    </ol>
    <p v-if="!items.length" class="toc-empty">本章暂无可跳转的小节。</p>
  </nav>
</template>
