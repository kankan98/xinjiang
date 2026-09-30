<script setup>
import { ref } from 'vue'
import RouteMap from './RouteMap.vue'
import ItineraryLedger from './ItineraryLedger.vue'
import JourneyRhythm from './JourneyRhythm.vue'
import SectionHeading from '../ui/SectionHeading.vue'

defineProps({
  copy: { type: Object, required: true },
  itinerary: { type: Array, required: true },
})

defineEmits(['navigate'])

// 日期表保留逐日 hover / focus 高亮。
const activeIndex = ref(null)
function setActive(index) {
  activeIndex.value = index
}
</script>

<template>
  <section id="routeOverview" class="route-overview" aria-labelledby="routeOverviewTitle">
    <SectionHeading
      class="route-overview-head"
      eyebrow="01 / THE NORTHERN CIRCUIT"
      title="从金色山林，走到湛蓝湖畔。"
      description="两段火车接上奎屯取还车，八晚住宿串起北疆与伊犁。先看沿途的远近，再翻到想读的那一天。"
      heading-id="routeOverviewTitle"
    >
      <template #meta><span class="section-pill">北疆 + 伊犁 · 十日环线</span></template>
      <template #actions><el-button text class="route-derivation-link" @click="$emit('navigate', '02-路线推导.md')">这条路线为什么这样走 <span>↗</span></el-button></template>
    </SectionHeading>

    <div class="route-console">
      <div class="route-principle">
        <span aria-hidden="true">N↗</span>
        <div><strong>住得踏实，走得从容</strong><p>{{ copy['route-logic'] }}</p></div>
      </div>
      <details class="route-map-fold"><summary>展开全程路线示意图 <span>可全屏放大 ↗</span></summary><RouteMap /></details>
    </div>
    <JourneyRhythm :itinerary="itinerary" @navigate="$emit('navigate', $event)" />
    <ItineraryLedger :itinerary="itinerary" :active-index="activeIndex" @navigate="$emit('navigate', $event)" @hover="setActive" />
  </section>
</template>
