<script setup>
import { computed } from 'vue'

// 复用型微型指标：把每日行程 meta 里的 1–5 分值渲染成带刻度的条形。
// 值来自路书数据（风景指数 / 摄影价值 / 驾驶压力 / 体力负荷），非展示层编造。
const props = defineProps({
  metrics: { type: Object, default: () => ({}) },
})

const rows = computed(() => [
  { key: '风景指数', abbr: '风景', tone: 'info' },
  { key: '摄影价值', abbr: '摄影', tone: 'info' },
  { key: '驾驶压力', abbr: '驾驶', tone: 'alert' },
  { key: '体力负荷', abbr: '体力', tone: 'route' },
].filter((entry) => Number(props.metrics?.[entry.key]) > 0))
</script>

<template>
  <ul v-if="rows.length" class="metric-bars" role="list" aria-label="当日指数">
    <li
      v-for="item in rows"
      :key="item.key"
      class="metric-bar"
      :class="`is-${item.tone}`"
      :title="`${item.abbr} ${metrics[item.key]}/5`"
    >
      <span class="metric-bar__label">{{ item.abbr }}</span>
      <span class="metric-bar__sr">{{ Number(metrics[item.key]) }} / 5</span>
      <span class="metric-bar__track" aria-hidden="true">
        <i
          v-for="level in 5"
          :key="level"
          :class="{ 'is-on': level <= Number(metrics[item.key]) }"
        />
      </span>
    </li>
  </ul>
</template>
