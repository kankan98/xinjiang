<script setup>
import ItineraryCell from '../ui/ItineraryCell.vue'

defineProps({
  itinerary: { type: Array, required: true },
  activeIndex: { type: Number, default: null },
})

const emit = defineEmits(['navigate', 'hover'])
</script>

<template>
  <div class="itinerary-ledger">
    <div class="route-days-head">
      <span>按日进入</span>
      <small>点击一天，查看完整日程 ↗</small>
    </div>
    <div class="itinerary-rows">
      <ItineraryCell
        v-for="(item, index) in itinerary"
        :key="item.doc.file"
        :item="item"
        :index="index"
        :active="activeIndex === index"
        @navigate="emit('navigate', $event)"
        @hover="emit('hover', $event)"
      />
    </div>
  </div>
</template>
