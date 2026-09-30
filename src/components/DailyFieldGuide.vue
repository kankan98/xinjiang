<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import SectionHeading from './ui/SectionHeading.vue'
import SourceChip from './ui/SourceChip.vue'
import { dayExperiences } from '../data/travel-experience.js'
import { readPlannerState, writePlannerState } from '../lib/storage.js'
import { revealInHorizontalScroll } from '../lib/travel.js'

const props = defineProps({ guides: { type: Array, required: true }, itinerary: { type: Array, required: true } })
const emit = defineEmits(['navigate'])
const savedDay = readPlannerState('selected-day', 'D0')
const selectedIndex = ref(Math.max(0, props.guides.findIndex((guide) => guide.day === savedDay)))
const tabs = ref([])
const tabTrack = ref(null)
let railObserver = null
const activeGuide = computed(() => props.guides[selectedIndex.value] || props.guides[0])
const metaByFile = computed(() => new Map(props.itinerary.map((item) => [item.doc.file, item.meta])))
const activeMeta = computed(() => metaByFile.value.get(activeGuide.value?.file) || {})
const experience = computed(() => dayExperiences[activeGuide.value?.day] || {})
const stateLabels = { documented: '行程建议', conditional: '满足条件再安排', pending: '出发前确认', notApplicable: '休整优先' }

watch(activeGuide, (guide) => { if (guide) writePlannerState('selected-day', guide.day) })
watch(selectedIndex, async () => { await nextTick(); revealSelectedDay() })
function revealSelectedDay() { revealInHorizontalScroll(tabTrack.value, tabs.value[selectedIndex.value]) }
function selectDay(index, focus = false) {
  selectedIndex.value = Math.max(0, Math.min(props.guides.length - 1, index))
  if (focus) nextTick(() => {
    tabs.value[selectedIndex.value]?.focus({ preventScroll: true })
    revealSelectedDay()
  })
}
function onKey(event, index) {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  const count = props.guides.length
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? count - 1 : (index + (['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1) + count) % count
  selectDay(next, true)
}
onMounted(() => {
  revealSelectedDay()
  if ('ResizeObserver' in window && tabTrack.value) {
    railObserver = new ResizeObserver(revealSelectedDay)
    railObserver.observe(tabTrack.value)
  }
})
onBeforeUnmount(() => railObserver?.disconnect())
</script>

<template>
  <section id="dailyGuide" class="field-guide experience-section" aria-labelledby="fieldGuideTitle" role="region">
    <SectionHeading eyebrow="02 / THE DAILY GUIDE" title="每一天，都心里有数。" description="先看今天的重点，再展开吃、穿、住、行、玩。上次查看的日期会为你保留。" heading-id="fieldGuideTitle">
      <template #actions><span class="section-pill">10 天 · 随时翻阅</span></template>
    </SectionHeading>
    <div class="field-navigation">
      <span class="field-navigation__label">{{ activeMeta.date }} <span aria-hidden="true">·</span> 第 {{ selectedIndex + 1 }} / {{ guides.length }} 天</span>
      <div class="field-navigation__actions">
        <button type="button" :disabled="selectedIndex === 0" aria-label="查看上一天" @click="selectDay(selectedIndex - 1)"><ArrowLeft aria-hidden="true" /><span>上一天</span></button>
        <button type="button" :disabled="selectedIndex === guides.length - 1" aria-label="查看下一天" @click="selectDay(selectedIndex + 1)"><span>下一天</span><ArrowRight aria-hidden="true" /></button>
      </div>
    </div>
    <div ref="tabTrack" class="field-tabs" role="tablist" aria-label="选择 D0 至 D9 每日攻略">
      <button v-for="(guide, index) in guides" :id="`daily-field-tab-${guide.day}`" :key="guide.day" :ref="(el) => { if (el) tabs[index] = el }" type="button" role="tab" :tabindex="selectedIndex === index ? 0 : -1" :aria-selected="selectedIndex === index" :aria-controls="`daily-field-panel-${guide.day}`" @click="selectDay(index)" @keydown="onKey($event, index)">
        <strong>{{ guide.day }}</strong><span>{{ metaByFile.get(guide.file)?.date.replace(' 月 ', '.').replace(' 日', '') }}</span>
      </button>
    </div>
    <article v-if="activeGuide" :id="`daily-field-panel-${activeGuide.day}`" :key="activeGuide.day" class="field-panel" role="tabpanel" :aria-labelledby="`daily-field-tab-${activeGuide.day}`" tabindex="0">
      <header class="field-panel__header">
        <div><span class="field-panel__eyebrow">{{ activeGuide.day }} · {{ activeMeta.date }} <i aria-hidden="true">/</i> {{ experience.pace }}</span><h3>{{ experience.title }}</h3><p class="field-panel__route">{{ experience.place }}</p><p class="field-panel__intro">{{ experience.highlight }}</p></div>
        <div class="field-clock"><span>{{ experience.timeLabel }}</span><strong>{{ experience.time }}</strong><small>全程北京时间</small></div>
      </header>
      <dl class="field-facts"><div><dt>{{ activeMeta.isEstimate ? '计划里程（估算）' : activeMeta.isPartial ? '已测路段' : (activeMeta.distance ? '计划自驾' : '交通') }}</dt><dd>{{ activeMeta.distance ? `${activeMeta.distance} km${activeMeta.isPartial ? '（进镇未计）' : ''}` : '航班 + 地面接驳' }}</dd></div><div><dt>{{ activeMeta.isEstimate ? '绕行驾驶预算' : activeMeta.isPartial ? '已测段驾驶' : '纯驾驶参考' }}</dt><dd>{{ activeMeta.driveTime || '当天不自驾' }}</dd></div><div><dt>今晚落脚</dt><dd>{{ activeMeta.stay }}</dd></div></dl>
      <div class="field-boundary"><span>今天记住</span><p>{{ activeGuide.hardStop }}</p></div>
      <div class="field-categories">
        <details v-for="item in activeGuide.categories" :key="item.key" class="field-category">
          <summary><span class="field-category__mark">{{ item.label }}</span><span><strong>{{ item.summary }}</strong><small>{{ stateLabels[item.state] }}</small></span><b class="field-category__expand" aria-hidden="true">+</b></summary>
          <div class="field-category__details"><ul><li v-for="action in item.actions" :key="action">{{ action }}</li></ul><p>{{ item.boundary }}</p></div>
        </details>
      </div>
      <details class="field-schedule">
        <summary><span>展开当天时间表</span><small>{{ activeGuide.schedule.length }} 个安排 · 与正式日程同步</small></summary>
        <ol><li v-for="(entry, index) in activeGuide.schedule" :key="`${activeGuide.day}-${index}`" :class="{ 'is-key': entry.key }"><time>{{ entry.time }}</time><div><strong>{{ entry.event }}</strong><p v-if="entry.note">{{ entry.note }}</p></div></li></ol>
      </details>
      <footer class="field-panel__footer"><details class="field-sources"><summary>参考资料与查询入口</summary><div><SourceChip v-for="source in activeGuide.evidence" :key="source.url" :label="source.label" :href="source.url" variant="muted" compact /></div><p>入口不代表已完成当日核验，班次和放行仍以临行答复为准。</p></details><button type="button" class="primary-btn" @click="emit('navigate', activeGuide.file)">查看 {{ activeGuide.day }} 完整日程 <span aria-hidden="true">↗</span></button></footer>
    </article>
  </section>
</template>
