<script setup>
import { computed, nextTick, watch } from 'vue'
import { Close } from '@element-plus/icons-vue'
import { chapterCode } from '../lib/chapter.js'
import KeyFacts from './ui/KeyFacts.vue'

const props = defineProps({
  open: Boolean,
  documents: Array,
  current: Object,
  policy: String,
})

defineEmits(['close', 'navigate', 'filter'])

const groups = [
  { id: 'overview', label: '总览与研究', description: '路线逻辑与复核依据' },
  { id: 'days', label: '每日 RoadBook', description: '按天执行与现场决策' },
  { id: 'topics', label: '专题手册', description: '车辆、预算与应急' },
]

const tripFacts = [
  { label: '行程', value: '10 月 2—11 日', detail: '十日 · 4 人' },
  { label: '交通', value: '香港往返', detail: 'HB862 / HX457' },
  { label: '车辆', value: '理想L8（实车待核）', detail: '奎屯站停车场取还 · 10.3 15:30取 / 10.10 17:00—17:30抵服务点' },
  { label: '返程', value: '还车后乘火车', detail: '新源 → 独库北段 / 高速 → 奎屯 → 乌鲁木齐 → 香港' },
]

const grouped = computed(() => Object.fromEntries(groups.map((group) => [
  group.id,
  props.documents.filter((doc) => doc.group === group.id),
])))

watch(() => props.open, async (open) => {
  if (!open || !props.current) return
  await nextTick()
  document.querySelector('.sidebar .nav-chapter.current')?.scrollIntoView({
    block: 'center',
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
  })
})
</script>

<template>
  <el-drawer
    :model-value="open"
    direction="ltr"
    size="min(340px, calc(100vw - 36px))"
    :with-header="false"
    :append-to-body="false"
    modal-class="sidebar-scrim"
    class="roadbook-drawer"
    aria-label="RoadBook 目录"
    @close="$emit('close')"
  >
    <aside id="sidebar" class="sidebar" aria-label="RoadBook 目录" :aria-hidden="String(!open)" :inert="!open">
      <div class="brand-lockup">
        <div class="brand-mark" aria-hidden="true">北</div>
        <div><span class="eyebrow">北疆自驾 · 2026</span><p class="brand-title">新疆北疆<br>自驾路书</p></div>
        <el-button text circle class="sidebar-close" :icon="Close" aria-label="关闭目录" @click="$emit('close')" />
      </div>
      <p class="sidebar-intro">按“先判断、再执行、后复核”的顺序进入内容，不必从头翻完整本。</p>
      <KeyFacts class="trip-stamp" :items="tripFacts" aria-label="本次行程摘要" compact />
      <nav class="primary-nav" aria-label="章节分组">
        <div class="nav-disclosures">
          <section v-for="group in groups" :key="group.id" class="nav-group" :class="{ 'is-active': current?.group === group.id }">
            <div class="nav-group-head">
              <span class="nav-button-copy"><b class="eyebrow accent">{{ group.label }}</b><small>{{ group.description }}</small></span>
              <el-button text class="nav-group-filter" @click="$emit('filter', group.id)">查看索引<span class="nav-count">{{ grouped[group.id].length }}</span></el-button>
            </div>
            <div :id="`nav-group-${group.id}`" class="nav-chapters">
              <el-button v-for="doc in grouped[group.id]" :key="doc.file" text class="nav-chapter" :class="{ current: current?.file === doc.file }" :aria-current="current?.file === doc.file ? 'page' : undefined" @click="$emit('navigate', doc.file)">
                <span class="nav-chapter-code">{{ chapterCode(doc, grouped[group.id]) }}</span>
                <span class="nav-chapter-title">{{ doc.title.replace(/^Day\s*\d+\s*·\s*/i, '') }}</span>
              </el-button>
            </div>
          </section>
        </div>
        <el-button plain class="nav-all" @click="$emit('filter', 'all')"><span>＋</span><span>全部章节</span><span class="nav-count">{{ documents.length }}</span></el-button>
      </nav>
      <div class="sidebar-foot"><div class="live-dot"><i class="led-dot ok" aria-hidden="true" /><span>{{ policy }}</span></div><p>未完成的证件与订单现在补核；游览日前一天及出发前再查动态通行、班次和天气。</p></div>
    </aside>
  </el-drawer>
</template>
