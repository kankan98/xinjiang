<script setup>
import { computed } from 'vue'
import { dayExperiences } from '../../data/travel-experience.js'
const props = defineProps({
  item: { type: Object, required: true }, // { doc, meta }
  index: { type: Number, required: true },
  active: { type: Boolean, default: false },
})

const emit = defineEmits(['navigate', 'hover'])
const experience = computed(() => dayExperiences[props.item.meta.day] || {})
</script>

<template>
  <button
    type="button"
    class="itin-cell"
    :class="{ 'is-active': active }"
    :aria-label="`打开${item.doc.title}`"
    @click="emit('navigate', item.doc.file)"
    @focusin="emit('hover', index)"
    @mouseenter="emit('hover', index)"
    @mouseleave="emit('hover', null)"
    @blur="emit('hover', null)"
  >
    <span class="itin-day-block">
      <b class="itin-day">{{ item.meta.day }}</b>
      <span class="itin-date">{{ item.meta.date }}</span>
    </span>
    <span class="itin-copy">
      <strong class="itin-route">{{ experience.place || item.meta.route }}</strong>
      <span class="itin-focus">{{ experience.highlight || item.meta.focus }}</span>
      <span class="itin-drive">{{ item.meta.distance ? `${item.meta.isEstimate ? '绕行驾驶预算' : item.meta.isPartial ? '已测段驾驶' : '计划驾驶'} ${item.meta.driveTime}${item.meta.isPartial ? '，进镇段待核' : ''}` : '航班与地面接驳' }}</span>
    </span>
    <span class="itin-km" :class="{ 'is-empty': !item.meta.distance }">
      <b>{{ item.meta.isPartial ? '待核' : (item.meta.distance || '接驳') }}</b>
      <span v-if="item.meta.distance">{{ item.meta.isPartial ? '全日' : 'KM' }}</span>
      <span class="itin-arrow" aria-hidden="true">↗</span>
    </span>
  </button>
</template>
