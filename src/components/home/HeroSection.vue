<script setup>
import { computed } from 'vue'
import MediaFigure from '../ui/MediaFigure.vue'
import KeyFacts from '../ui/KeyFacts.vue'
import { ArrowDown, ArrowRight, Location } from '@element-plus/icons-vue'
import { scrollToSection } from '../../lib/travel.js'

const props = defineProps({
  hero: { type: Object, required: true },
  copy: { type: Object, required: true },
  itinerary: { type: Array, required: true },
  gates: { type: Array, required: true },
  summary: { type: Object, required: true },
  resumeDoc: { type: Object, default: null },
})

const emit = defineEmits(['navigate', 'credit'])

// 首屏只保留旅行规模；当天班次和硬节点留给每日速查。
const hudFacts = computed(() => [
  { label: '旅行日期', value: '10.02—10.11', detail: '2026 · 从出发到回家' },
  { label: '同行伙伴', value: '4 人 · 1 车', detail: '理想 L8 · 双驾驶员轮换' },
  { label: '沿途落脚', value: '8 晚 · 2 间', detail: '既有住宿已订 · 钟点房另核' },
  { label: props.summary.isPartial ? '全程自驾' : '计划自驾', value: props.summary.isPartial ? '待复核' : `≈ ${props.summary.plannedDrivingDistanceKm.toLocaleString('zh-CN')} km`, detail: props.summary.isPartial ? `已测分段≈${props.summary.plannedDrivingDistanceKm.toLocaleString('zh-CN')}km，进镇导行未计` : '含D7绕行预算与条件独库段', tone: 'route' },
])
</script>

<template>
  <section id="heroSection" class="hero-section">
    <div class="hero-windshield">
      <div class="hero-view">
        <div class="hero-copy">
          <span class="hero-kicker"><i aria-hidden="true" /> 2026 · 国庆北疆自驾</span>
          <p class="hero-overline" aria-hidden="true">A JOURNEY INTO AUTUMN</p>
          <h1>一路向北，<br>去<em>秋天</em>里。</h1>
          <p class="hero-lede">{{ copy['hero-summary'] }}</p>
          <div class="hero-actions">
            <button type="button" class="primary-btn hero-route-action" @click="scrollToSection('dailyGuide')">打开每日速查 <ArrowRight aria-hidden="true" /></button>
            <button type="button" class="hero-secondary-action" @click="scrollToSection('routeOverview')">查看十日路线 <ArrowDown aria-hidden="true" /></button>
          </div>
          <button v-if="resumeDoc" type="button" class="resume-chip" @click="emit('navigate', resumeDoc.file)">
            <span class="resume-chip__label">接着上次读</span>
            <strong>{{ resumeDoc.title }}</strong>
            <ArrowRight aria-hidden="true" />
          </button>
          <p v-else class="hero-footnote">十天风景、热饭与好好休息，都在这本路书里。</p>
        </div>
        <div class="hero-photograph">
          <MediaFigure :image="hero" variant="hero" eager @credit="emit('credit')" />
          <div class="hero-edition" aria-label="十天的北疆旅程"><strong>10</strong><span>DAYS OF<br>WANDER</span></div>
          <div class="hero-location"><Location aria-hidden="true" /><span>{{ hero.place }}</span><span class="hero-location__season">AUTUMN / 2026</span></div>
        </div>
      </div>
      <KeyFacts class="hero-hud" :items="hudFacts" aria-label="路书概览" />
    </div>
  </section>
</template>
