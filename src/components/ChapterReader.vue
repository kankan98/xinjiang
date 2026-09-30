<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ArrowLeft, ArrowUp, Close, Refresh, Tickets } from '@element-plus/icons-vue'
import ReaderOutline from './ReaderOutline.vue'
import RouteLoadingState from './RouteLoadingState.vue'
import ChapterStrip from './ui/ChapterStrip.vue'
import EvidenceTags from './ui/EvidenceTags.vue'
import MediaFigure from './ui/MediaFigure.vue'
import ReaderDayBrief from './reader/ReaderDayBrief.vue'
import ReaderFocus from './reader/ReaderFocus.vue'
import DayRouteMap from './reader/DayRouteMap.vue'
import { readChecks, readPlannerState, writeChecks, writePlannerState } from '../lib/storage.js'
import { readingFocus } from '../data/reading-focus.js'
import { decorateReadingSections, transformScheduleTables } from '../lib/reader-priorities.js'

const props = defineProps({
  doc: Object,
  documents: Array,
  images: Object,
  contentComponent: Object,
  loading: Boolean,
  loadError: Boolean,
  routeSection: String,
})

const emit = defineEmits(['back', 'navigate', 'credit', 'toast'])
const body = ref(null)
const toc = ref([])
const tocToggle = ref(null)
const mobileTocOpen = ref(false)
const activeSection = ref('')
const checks = ref(new Set())
const checkTotal = ref(0)
const showBackTop = ref(false)
const readerSize = ref(readPlannerState('reader-size', 'standard') === 'large' ? 'large' : 'standard')
watch(readerSize, (value) => writePlannerState('reader-size', value))
let headingObserver = null
let headingSyncFrame = null
let trackedHeadings = []
let restoreTocFocus = true

const groupDocs = computed(() => props.documents.filter((item) => item.group === props.doc.group))
const docIndex = computed(() => groupDocs.value.findIndex((item) => item.file === props.doc.file))
const previous = computed(() => groupDocs.value[docIndex.value - 1] || null)
const next = computed(() => groupDocs.value[docIndex.value + 1] || null)
const dayMeta = computed(() => props.doc.dayMeta)
const focusItems = computed(() => readingFocus[props.doc.file] || [])
const hero = computed(() => props.doc.heroImage ? props.images[props.doc.heroImage] : null)
const titleParts = computed(() => props.doc.title.split(/(\s*[→·]\s*)/))
const sectionCount = computed(() => toc.value.filter((item) => item.level === 2).length)
const activeTocIndex = computed(() => Math.max(0, toc.value.findIndex((item) => item.id === activeSection.value)))
const activeTocPosition = computed(() => toc.value.length ? activeTocIndex.value + 1 : 0)

function loadChecks() {
  checks.value = readChecks(props.doc.file)
}

function syncActiveHeading() {
  headingSyncFrame = null
  if (!trackedHeadings.length) return
  const readingLine = window.innerHeight * 0.24
  let candidate = trackedHeadings[0]
  for (const heading of trackedHeadings) {
    if (heading.getBoundingClientRect().top <= readingLine) candidate = heading
    else break
  }
  if (candidate.id && candidate.id !== activeSection.value) activeSection.value = candidate.id
}

function scheduleActiveHeadingSync() {
  if (headingSyncFrame !== null) return
  headingSyncFrame = window.requestAnimationFrame(syncActiveHeading)
}

function observeHeadings(headings) {
  headingObserver?.disconnect()
  trackedHeadings = headings
  if (!headings.length) return
  if ('IntersectionObserver' in window) {
    headingObserver = new IntersectionObserver(scheduleActiveHeadingSync, {
      rootMargin: '-24% 0px -72% 0px',
      threshold: [0, 1],
    })
    headings.forEach((heading) => headingObserver.observe(heading))
  }
  scheduleActiveHeadingSync()
}

function syncDom() {
  if (!body.value) return
  transformScheduleTables(body.value)
  decorateReadingSections(body.value)
  const headings = [...body.value.querySelectorAll('h2, h3')]
  const nextToc = headings.map((heading) => ({
    id: heading.id,
    text: heading.textContent,
    level: heading.tagName === 'H3' ? 3 : 2,
    tone: heading.dataset.readingTone,
    priorityLabel: heading.dataset.readingLabel,
  }))
  if (JSON.stringify(nextToc) !== JSON.stringify(toc.value)) toc.value = nextToc
  observeHeadings(headings)
  const checkboxes = body.value.querySelectorAll('input[data-check-index]')
  checkTotal.value = checkboxes.length
  checkboxes.forEach((box) => {
    box.checked = checks.value.has(Number(box.dataset.checkIndex))
  })
  if (props.routeSection) {
    const targetId = props.routeSection
    activeSection.value = targetId
    const target = document.getElementById(targetId)
    target?.scrollIntoView({ block: 'start', behavior: 'instant' })
  }
}

function handleBodyClick(event) {
  const credit = event.target.closest('[data-action="open-credit"][data-asset]')
  if (credit) {
    event.preventDefault()
    emit('credit', credit.dataset.asset)
    return
  }
  const link = event.target.closest('[data-doc]')
  if (!link) return
  event.preventDefault()
  emit('navigate', link.dataset.doc, link.dataset.section || '')
}

function handleBodyChange(event) {
  const box = event.target.closest('input[data-check-index]')
  if (!box) return
  const nextChecks = new Set(checks.value)
  const index = Number(box.dataset.checkIndex)
  if (box.checked) nextChecks.add(index)
  else nextChecks.delete(index)
  checks.value = nextChecks
  writeChecks(props.doc.file, nextChecks)
}

function resetChecks() {
  checks.value = new Set()
  writeChecks(props.doc.file, checks.value)
  syncDom()
  emit('toast', '本章勾选已重置。')
}

function updateBackTop() {
  showBackTop.value = window.scrollY > window.innerHeight * 1.6
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
}

function openMobileToc() {
  restoreTocFocus = true
  mobileTocOpen.value = true
}

function closeMobileToc({ restoreFocus = true } = {}) {
  restoreTocFocus = restoreFocus
  mobileTocOpen.value = false
}

function handleMobileTocClosed() {
  if (restoreTocFocus) tocToggle.value?.focus()
  restoreTocFocus = true
}

function handleMobileTocOpened() {
  nextTick(() => document.querySelector('.reader-aside-modal .reader-tools-close')?.focus())
}

function navigateSection(section) {
  activeSection.value = section
  closeMobileToc({ restoreFocus: false })
  emit('navigate', props.doc.file, section)
  nextTick(() => {
    const target = document.getElementById(section)
    if (!target) return
    window.requestAnimationFrame(() => {
      target.scrollIntoView({ block: 'start', behavior: 'instant' })
      target.tabIndex = -1
      target.focus({ preventScroll: true })
      scheduleActiveHeadingSync()
    })
  })
}

watch(() => [props.doc.file, props.contentComponent], async ([file], [previousFile] = []) => {
  if (file !== previousFile) loadChecks()
  await nextTick()
  syncDom()
}, { immediate: true })

watch(() => props.routeSection, async () => {
  await nextTick()
  syncDom()
})

onMounted(() => {
  syncDom()
  updateBackTop()
  window.addEventListener('scroll', updateBackTop, { passive: true })
  window.addEventListener('scroll', scheduleActiveHeadingSync, { passive: true })
})
onBeforeUnmount(() => {
  headingObserver?.disconnect()
  if (headingSyncFrame !== null) window.cancelAnimationFrame(headingSyncFrame)
  window.removeEventListener('scroll', updateBackTop)
  window.removeEventListener('scroll', scheduleActiveHeadingSync)
})
</script>

<template>
  <section id="contentSection" class="content-section">
    <article class="reader" :data-reader-size="readerSize" aria-labelledby="readerTitle">
      <div class="reader-toolbar">
        <div class="reader-toolbar-start">
          <el-button text class="back-btn" :icon="ArrowLeft" @click="$emit('back')">返回章节索引</el-button>
          <el-tag round effect="plain" class="reader-status">{{ doc.groupLabel }} · {{ docIndex + 1 }} / {{ groupDocs.length }}</el-tag>
        </div>
        <div class="reader-toolbar-end">
          <span v-if="toc.length" class="reader-position">小节 {{ activeTocPosition }} / {{ toc.length }}</span>
          <button type="button" class="reader-font-toggle" :aria-pressed="readerSize === 'large'" aria-label="大字阅读" @click="readerSize = readerSize === 'large' ? 'standard' : 'large'"><span aria-hidden="true">Aa</span><span>大字阅读</span></button>
          <el-button ref="tocToggle" plain round class="reader-tools-toggle" :icon="Tickets" aria-controls="mobileToc" :aria-expanded="mobileTocOpen" @click="openMobileToc">本章导航</el-button>
        </div>
      </div>
      <div class="reader-layout">
        <div class="reader-main">
          <header class="reader-header">
            <div class="reader-header-grid">
              <div class="reader-header-copy">
                <span class="reader-kicker readout">{{ doc.kicker }}</span>
                <h1 id="readerTitle" tabindex="-1"><template v-for="(part, index) in titleParts" :key="index"><span v-if="index % 2 === 0" class="reader-title-part">{{ part }}</span><template v-else>{{ part }}</template></template></h1>
                <p>{{ doc.summary }}</p>
                <div class="reader-edition"><span>{{ dayMeta ? '随行日记 / DAILY JOURNAL' : doc.group === 'topics' ? '口袋指南 / FIELD GUIDE' : '行前案头 / TRIP NOTES' }}</span><span v-if="sectionCount">{{ sectionCount }} 个小节</span><span v-if="dayMeta">时间均为北京时间</span></div>
              </div>
              <ReaderFocus :file="doc.file" :items="focusItems" @navigate="navigateSection" />
              <div class="reader-hero">
                <MediaFigure
                  v-if="hero"
                  :image="hero"
                  variant="reader"
                  :asset-id="doc.heroImage"
                  eager
                  @credit="$emit('credit', doc.heroImage)"
                />
                <div v-else class="reader-hero-empty"><span>随行手册 / FIELD NOTES</span><strong>{{ doc.groupLabel }}，随时查阅。</strong><p>把重要的信息，带在身边。</p></div>
              </div>
            </div>
            <ReaderDayBrief v-if="dayMeta" :day-meta="dayMeta" class="reader-day-brief-band" />
          </header>
          <DayRouteMap v-if="dayMeta" :key="doc.file" :day="dayMeta.day" class="reader-day-map-block" />
          <div ref="body" class="markdown-body" @change="handleBodyChange" @click="handleBodyClick">
            <RouteLoadingState v-if="loading || loadError" :error="loadError" />
            <component :is="contentComponent" v-else-if="contentComponent" />
          </div>
          <div v-if="checkTotal" class="check-tools">
            <div class="check-progress"><span class="check-count">本章清单 · 已完成 {{ checks.size }} / {{ checkTotal }}</span><progress :value="checks.size" :max="checkTotal">{{ checks.size }} / {{ checkTotal }}</progress></div>
            <el-button plain round size="small" class="check-reset" :icon="Refresh" @click="resetChecks">重置本章勾选</el-button>
          </div>
          <ChapterStrip :docs="groupDocs" :current="doc" :label="`${doc.groupLabel}章节导航`" @navigate="(file) => $emit('navigate', file)" />
          <nav class="chapter-pagination" aria-label="相邻章节">
            <el-button plain class="chapter-page previous" :disabled="!previous" @click="previous && $emit('navigate', previous.file)"><span class="chapter-page-copy"><span>← 上一章</span><strong>{{ previous?.title || '已是本卷第一章' }}</strong></span></el-button>
            <el-button plain class="chapter-page next" :disabled="!next" @click="next && $emit('navigate', next.file)"><span class="chapter-page-copy"><span>下一章 →</span><strong>{{ next?.title || '已是本卷最后一章' }}</strong></span></el-button>
          </nav>
        </div>
        <aside class="reader-aside reader-aside-docked" aria-label="本章导航">
          <div class="reader-tools-head">
            <span class="aside-label">本章导航</span>
            <span class="reader-position-pill" aria-label="当前小节位置">{{ activeTocPosition }} / {{ toc.length }}</span>
          </div>
          <div v-if="toc.length" class="outline-meter"><span :style="{ width: `${(activeTocPosition / toc.length) * 100}%` }" /></div>
          <div class="aside-block"><ReaderOutline :items="toc" :active-section="activeSection" @navigate="navigateSection" /></div>
          <div class="aside-block aside-note">
            <span class="aside-label">随手翻阅</span>
            <EvidenceTags v-if="doc.tags?.length" :tags="doc.tags" label="本章关键词" compact />
            <p>路况、票务和营业按临行公告确认。旅途中先看当天安排，需要细节再查专题。</p>
            <a class="reader-emergency-link" href="#/chapter/专题-新疆旅行应急宝典?section=1-联系卡" @click.prevent="$emit('navigate', '专题-新疆旅行应急宝典.md', '1-联系卡')">应急联系与求助 →</a>
          </div>
        </aside>
      </div>
    </article>
    <el-drawer
      id="mobileToc"
      v-model="mobileTocOpen"
      direction="btt"
      size="min(78vh, 620px)"
      :with-header="false"
      :append-to-body="true"
      class="reader-aside reader-aside-modal"
      modal-class="reader-aside-scrim"
      aria-label="本章导航"
      @opened="handleMobileTocOpened"
      @closed="handleMobileTocClosed"
    >
      <div class="reader-tools-head"><span id="readerToolsTitle" class="aside-label">本章导航 · {{ activeTocPosition }} / {{ toc.length }}</span><el-button text class="reader-tools-close" :icon="Close" aria-label="关闭本章导航" @click="closeMobileToc()">关闭</el-button></div>
      <div v-if="toc.length" class="outline-meter"><span :style="{ width: `${(activeTocPosition / toc.length) * 100}%` }" /></div>
      <div class="aside-block"><ReaderOutline :items="toc" :active-section="activeSection" @navigate="navigateSection" /></div>
    </el-drawer>
    <Transition name="back-top">
      <button v-if="showBackTop" type="button" class="back-top" aria-label="回到本章顶部" @click="scrollToTop">
        <ArrowUp aria-hidden="true" />
      </button>
    </Transition>
  </section>
</template>
