<script setup>
import { computed, ref } from 'vue'
import { dayExperiences } from '../../data/travel-experience.js'

const props = defineProps({ itinerary: { type: Array, required: true } })
const emit = defineEmits(['navigate'])
const measure = ref('time')
const selectedDay = ref('D1')
const days = computed(() => props.itinerary.filter(({ meta }) => meta.distance).map(({ doc, meta }) => {
  const hours = Number(meta.driveTime.match(/(\d+)\s*h/)?.[1] || 0)
  const minutes = Number(meta.driveTime.match(/(\d+)\s*min/)?.[1] || 0)
  const shortDate = meta.date.replace(/(\d+) 月 (\d+) 日/, (_, month, day) => `${month}.${day.padStart(2, '0')}`)
  return { doc, meta, shortDate, minutes: hours * 60 + minutes, km: Number(meta.distance), experience: dayExperiences[meta.day] }
}))
const maximum = computed(() => Math.max(1, ...days.value.map(valueOf)))
const selected = computed(() => days.value.find(({ meta }) => meta.day === selectedDay.value) || days.value[0])
function valueOf(day) { return measure.value === 'time' ? day.minutes : day.km }
function reading(day) {
  return measure.value === 'time' ? `${Math.floor(day.minutes / 60)}时${String(day.minutes % 60).padStart(2, '0')}分` : `${day.meta.distance} km`
}
</script>

<template>
  <section class="journey-rhythm" aria-labelledby="journeyRhythmTitle">
    <header class="journey-rhythm__head">
      <div>
        <p class="journey-rhythm__eyebrow">八天自驾 · 轻重有数</p>
        <h3 id="journeyRhythmTitle">哪天赶路，哪天慢慢看</h3>
        <p>把路上的时间摊开，读懂每天的节奏。</p>
      </div>
      <div class="journey-rhythm__switch" role="group" aria-label="切换行车对比指标">
        <button type="button" :aria-pressed="measure === 'time'" @click="measure = 'time'">驾驶时间</button>
        <button type="button" :aria-pressed="measure === 'distance'" @click="measure = 'distance'">自驾里程</button>
      </div>
    </header>
    <p class="journey-rhythm__caption" id="journeyRhythmNote">按主选方案比较，纯驾驶不含用餐、休息、候车与游览。<strong>D7 按官方绕行预算约300km、6h</strong>，含余量，非完整路线实测；D8 以唐布拉与独库北段可通行为前提。D0、D9 为航班与地面接驳日。</p>
    <div class="journey-rhythm__chart" role="group" aria-label="选择一天查看行车与住宿" aria-describedby="journeyRhythmNote">
      <button v-for="day in days" :key="day.meta.day" type="button" class="journey-rhythm__day" :class="{ 'is-partial': day.meta.isPartial }" :aria-pressed="selectedDay === day.meta.day" :aria-label="`${day.meta.day}，${day.meta.date}，${day.meta.isEstimate ? '官方绕行预算，' : day.meta.isPartial ? '已测路段，进镇导行未计，' : ''}${reading(day)}${day.meta.day === 'D8' ? '，唐布拉条件主选' : ''}`" @click="selectedDay = day.meta.day">
        <span class="journey-rhythm__value">{{ reading(day) }}</span>
        <span class="journey-rhythm__track" aria-hidden="true"><span :style="{ height: `${valueOf(day) / maximum * 100}%` }" /></span>
        <strong>{{ day.meta.day }}</strong>
        <span class="journey-rhythm__date">{{ day.shortDate }}</span>
        <small>{{ day.meta.isEstimate ? '绕行预算' : day.meta.isPartial ? '仅已测段' : day.meta.day === 'D8' ? '条件主选' : '主选方案' }}</small>
      </button>
    </div>
    <div v-if="selected" class="journey-rhythm__detail" aria-live="polite" aria-atomic="true">
      <div>
        <span>{{ selected.meta.day }} · {{ selected.experience?.pace }}</span>
        <h4>{{ selected.experience?.title || selected.doc.title }}</h4>
        <p>{{ selected.experience?.place }}</p>
        <p class="journey-rhythm__stay">今晚：{{ selected.meta.stay }}</p>
        <p v-if="selected.meta.distanceNote" class="journey-rhythm__missing">{{ selected.meta.distanceNote }}</p>
      </div>
      <button type="button" class="journey-rhythm__link" @click="emit('navigate', selected.doc.file)">读 {{ selected.meta.day }} 完整日程 <span aria-hidden="true">↗</span></button>
    </div>
  </section>
</template>

<style scoped>
.journey-rhythm { margin: 28px 0; padding: clamp(18px, 3vw, 32px); border: 1px solid var(--color-line); border-radius: var(--radius-lg); background: var(--color-surface); }
.journey-rhythm__head { display: flex; align-items: center; justify-content: space-between; gap: 20px; }
.journey-rhythm__eyebrow { margin: 0 0 8px; color: var(--color-route); font-size: 12px; letter-spacing: .1em; }
.journey-rhythm h3 { margin: 0 0 8px; font: 600 clamp(21px, 2.2vw, 28px)/1.4 var(--font-editorial); }
.journey-rhythm__head p:last-child { margin: 0; font-size: 14px; color: var(--color-ink-soft); }
.journey-rhythm__switch { display: flex; flex-shrink: 0; padding: 4px; gap: 4px; border: 1px solid var(--color-line); border-radius: var(--radius-sm); }
.journey-rhythm__switch button { min-height: 44px; padding: 8px 12px; border: 0; border-radius: 6px; background: transparent; color: var(--color-ink-soft); font: inherit; font-size: 13px; cursor: pointer; }
.journey-rhythm__switch button[aria-pressed="true"] { color: var(--color-on-route); background: var(--color-route); }
.journey-rhythm__caption { max-width: 78ch; margin: 20px 0 16px; color: var(--color-ink-soft); font-size: 13px; line-height: 1.9; }
.journey-rhythm__caption strong { color: var(--color-ink); font-weight: 600; }
.journey-rhythm__chart { display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 8px; }
.journey-rhythm__day { min-width: 0; display: flex; flex-direction: column; align-items: stretch; gap: 7px; padding: 12px 5px; border: 1px solid transparent; border-radius: var(--radius-sm); color: var(--color-ink); background: var(--color-surface-inset); font: inherit; cursor: pointer; }
.journey-rhythm__day:hover, .journey-rhythm__day[aria-pressed="true"] { border-color: var(--color-route); background: var(--color-route-wash); }
.journey-rhythm__day:focus-visible, .journey-rhythm__switch button:focus-visible, .journey-rhythm__link:focus-visible { outline: var(--focus-ring); outline-offset: 3px; }
.journey-rhythm__value { font-size: clamp(11px, 1.1vw, 14px); white-space: nowrap; font-variant-numeric: tabular-nums; }
.journey-rhythm__track { display: flex; align-items: flex-end; justify-content: center; height: 120px; border-bottom: 1px solid var(--color-line); }
.journey-rhythm__track > span { width: 46%; max-width: 40px; background: var(--color-info); border-radius: 4px 4px 0 0; }
.journey-rhythm__day[aria-pressed="true"] .journey-rhythm__track > span { background: var(--color-route); }
.journey-rhythm__day.is-partial .journey-rhythm__track > span { background: repeating-linear-gradient(135deg, var(--color-sand) 0 4px, var(--color-sand-wash) 4px 8px); border: 1px solid var(--color-sand); }
.journey-rhythm__day strong { margin-top: 3px; font: 600 22px/1 var(--font-display); }
.journey-rhythm__date { font-size: 12px; color: var(--color-ink-soft); white-space: nowrap; }
.journey-rhythm__day small { font-size: 11px; color: var(--color-muted); }
.journey-rhythm__detail { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--color-line); }
.journey-rhythm__detail > div { min-width: 0; }
.journey-rhythm__detail span { color: var(--color-route); font-size: 12px; }
.journey-rhythm h4 { margin: 6px 0; font: 600 19px/1.5 var(--font-editorial); }
.journey-rhythm__detail p { margin: 5px 0 0; color: var(--color-ink-soft); font-size: 14px; line-height: 1.8; overflow-wrap: anywhere; }
.journey-rhythm__detail .journey-rhythm__stay { font-size: 13px; }
.journey-rhythm__detail .journey-rhythm__missing { color: var(--color-sand-deep); font-size: 13px; }
.journey-rhythm__link { flex-shrink: 0; min-height: 44px; padding: 10px 14px; border: 1px solid var(--color-line); border-radius: var(--radius-sm); background: var(--color-surface); color: var(--color-route); font: inherit; font-size: 13px; cursor: pointer; }
@media (max-width: 639px) {
  .journey-rhythm__head, .journey-rhythm__detail { align-items: flex-start; flex-direction: column; gap: 16px; }
  .journey-rhythm__chart { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .journey-rhythm__value { font-size: 11px; }
  .journey-rhythm__track { height: 76px; }
  .journey-rhythm__day small { font-size: 10px; }
}
@media print { .journey-rhythm { break-inside: avoid; } .journey-rhythm__switch, .journey-rhythm__link { display: none; } }
</style>
