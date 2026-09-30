<script setup>
import { computed } from 'vue'
import MetricBars from '../ui/MetricBars.vue'

const props = defineProps({
  dayMeta: { type: Object, required: true },
})

// 路线卡片读数：距离 / 纯驾驶 / 今晚住宿，缺项自动隐藏
const facts = computed(() => [
  { label: props.dayMeta.isEstimate ? '计划里程（估算）' : props.dayMeta.isPartial ? '已测路段' : '距离', value: props.dayMeta.distance ? `${props.dayMeta.distance} km${props.dayMeta.isPartial ? '（不含进镇）' : ''}` : '' },
  { label: props.dayMeta.isEstimate ? '驾驶预算' : props.dayMeta.isPartial ? '已测段驾驶' : '纯驾驶', value: props.dayMeta.driveTime || '' },
  { label: '里程口径', value: props.dayMeta.distanceNote || '', fullWidth: true },
  { label: '今晚', value: props.dayMeta.stay || '', fullWidth: true },
  { label: '备选', value: props.dayMeta.stayAlternative || '', fullWidth: true },
].filter((fact) => fact.value))
</script>

<template>
  <div class="day-brief">
    <p v-if="dayMeta.route" class="day-brief-route">
      <small>今日路线</small>
      <span>{{ dayMeta.route }}</span>
    </p>
    <dl v-if="facts.length" class="day-brief-facts" aria-label="当日行车与住宿读数">
      <div v-for="fact in facts" :key="fact.label" class="day-brief-fact" :class="{ 'is-full-width': fact.fullWidth }">
        <dt>{{ fact.label }}</dt>
        <dd>{{ fact.value }}</dd>
      </div>
    </dl>
    <MetricBars :metrics="dayMeta.stars" />
  </div>
</template>
