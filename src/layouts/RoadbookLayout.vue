<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import AppFooter from '../components/AppFooter.vue'
import AppHeader from '../components/AppHeader.vue'
import ImageCredits from '../components/ImageCredits.vue'
import SearchPalette from '../components/SearchPalette.vue'
import SidebarNavigation from '../components/SidebarNavigation.vue'
import MobileCommandBar from '../components/ui/MobileCommandBar.vue'
import { documents, getDocumentByFile, getDocumentBySlug, images, roadbook } from '../data/roadbook.js'
import { readTheme, writeLastChapter, writePlannerState, writeTheme } from '../lib/storage.js'
import { scrollToSection } from '../lib/travel.js'

const route = useRoute()
const router = useRouter()
const menuOpen = ref(false)
const searchOpen = ref(false)
const creditsOpen = ref(false)
const readingProgress = ref(0)
const theme = ref(readTheme() || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'))
let toastInstance = null
let progressFrame = null
let menuReturnFocus = null

const current = computed(() => route.name === 'chapter' ? getDocumentBySlug(String(route.params.slug || '')) : null)
const filterLabel = computed(() => ({
  all: '内容索引',
  overview: '总览与研究',
  days: '每日路线',
  topics: '专题手册',
})[route.meta.filter || 'all'])

function showToast(message) {
  toastInstance?.close()
  toastInstance = ElMessage({
    message,
    type: 'info',
    duration: 2200,
    showClose: true,
    customClass: 'roadbook-message',
  })
}

async function navigate(file, section = '') {
  const document = getDocumentByFile(file)
  if (!document) {
    showToast('链接的章节不存在或已改名。')
    return
  }

  menuOpen.value = false
  searchOpen.value = false
  await router.push({
    name: 'chapter',
    params: { slug: document.slug },
    query: section ? { section } : undefined,
  })
}

async function openIndex(filter = 'all') {
  const routeName = filter === 'all' ? 'home' : filter
  menuOpen.value = false
  searchOpen.value = false
  if (route.name !== routeName) await router.push({ name: routeName })
  await nextTick()
  // 统一把视线锚定在筛选工具栏的吸顶位置：切换卷册后从列表开头读起
  const toolbar = document.querySelector('.chapter-index-toolbar')
  toolbar?.scrollIntoView({ block: 'start', behavior: 'auto' })
  const target = document.getElementById('contentSection')
  if (target) {
    target.tabIndex = -1
    target.focus({ preventScroll: true })
  }
}

function setFilter(filter) {
  openIndex(filter)
}

async function openHome() {
  menuOpen.value = false
  searchOpen.value = false
  if (route.name !== 'home') await router.push({ name: 'home' })
  await nextTick()
  window.scrollTo({ top: 0, behavior: 'instant' })
  const heading = document.querySelector('.hero-copy h1')
  heading?.setAttribute('tabindex', '-1')
  heading?.focus({ preventScroll: true })
}

async function browseDays() {
  await openIndex('days')
  document.getElementById('contentSection')?.scrollIntoView({ block: 'start', behavior: 'smooth' })
}

async function openDailyGuide() {
  if (current.value?.dayMeta) writePlannerState('selected-day', current.value.dayMeta.day)
  menuOpen.value = false
  searchOpen.value = false
  if (route.name !== 'home') await router.push({ name: 'home' })
  await nextTick()
  // 等待路由的默认回顶完成，再执行用户选择的板块定位。
  await new Promise((resolve) => window.requestAnimationFrame(resolve))
  scrollToSection('dailyGuide')
}

function openCredit(asset = roadbook.homeHero) {
  const target = document.getElementById(`credit-${asset}`)
  if (!target) return
  creditsOpen.value = true
  nextTick(() => {
    target.tabIndex = -1
    target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    target.focus({ preventScroll: true })
  })
}

function handleAction(action) {
  if (action === 'toggle-menu') {
    const nextOpen = !menuOpen.value
    searchOpen.value = false
    menuOpen.value = nextOpen
  }
  if (action === 'toggle-search') {
    const nextOpen = !searchOpen.value
    menuOpen.value = false
    searchOpen.value = nextOpen
  }
  if (action === 'open-all') openHome()
  if (action === 'open-daily') openDailyGuide()
  if (action === 'toggle-theme') {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
    writeTheme(theme.value)
  }
  if (action === 'print') {
    if (!current.value) showToast('请先打开一个章节，再打印。')
    else window.print()
  }
}

function trapFocus(event, container) {
  if (event.key !== 'Tab' || !container) return
  const items = [...container.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])')]
    .filter((item) => item.offsetParent !== null)
  if (!items.length) return
  const first = items[0]
  const last = items.at(-1)
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

function onKeydown(event) {
  if (menuOpen.value) trapFocus(event, document.getElementById('sidebar'))
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    searchOpen.value = !searchOpen.value
    menuOpen.value = false
  }
  if (event.key === 'Escape') {
    menuOpen.value = false
  }
  // 章节页内 ←/→ 翻相邻章节（输入框、面板、组件内已处理的按键不拦截）
  if (
    current.value
    && !menuOpen.value
    && !searchOpen.value
    && !event.defaultPrevented
    && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')
  ) {
    const tag = event.target?.tagName
    if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A', 'SUMMARY'].includes(tag) || event.target?.isContentEditable) return
    const groupDocs = documents.filter((doc) => doc.group === current.value.group)
    const index = groupDocs.findIndex((doc) => doc.file === current.value.file)
    const target = event.key === 'ArrowRight' ? groupDocs[index + 1] : groupDocs[index - 1]
    if (target) {
      event.preventDefault()
      navigate(target.file)
    }
  }
}

function beforePrint() {
  if (!current.value) {
    document.body.classList.add('print-index')
    return
  }
  const used = new Set([...document.querySelectorAll('#mainContent [data-asset]')].map((node) => node.dataset.asset).filter(Boolean))
  document.querySelectorAll('.credit-item').forEach((item) => item.classList.toggle('print-relevant', used.has(item.id.replace(/^credit-/, ''))))
  creditsOpen.value = true
}

function afterPrint() {
  document.body.classList.remove('print-index')
  document.querySelectorAll('.credit-item').forEach((item) => item.classList.remove('print-relevant'))
}

function commitReadingProgress() {
  progressFrame = null
  if (!current.value) {
    readingProgress.value = 0
    return
  }
  const scrollable = document.documentElement.scrollHeight - window.innerHeight
  readingProgress.value = scrollable > 0
    ? Math.min(100, Math.max(0, Math.round((window.scrollY / scrollable) * 100)))
    : 0
}

function updateReadingProgress() {
  if (progressFrame !== null) return
  progressFrame = window.requestAnimationFrame(commitReadingProgress)
}

watch(menuOpen, (open, wasOpen) => {
  document.documentElement.classList.toggle('menu-open', open)
  if (open) {
    menuReturnFocus = document.activeElement
    nextTick(() => document.querySelector('.sidebar-close')?.focus())
  } else if (wasOpen && menuReturnFocus?.isConnected) {
    nextTick(() => menuReturnFocus?.focus({ preventScroll: true }))
  }
})

watch(searchOpen, (open, wasOpen) => {
  if (open) menuOpen.value = false
})

watch(theme, (value) => {
  document.documentElement.dataset.theme = value
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', value === 'dark' ? '#171B18' : '#FAF9F5')
}, { immediate: true })

watch(current, (document) => {
  if (document) writeLastChapter(document.slug)
  const title = document ? `${document.title} · 新疆北疆 RoadBook` : '新疆北疆 RoadBook · 2026 国庆自驾'
  const description = document ? document.summary : '2026 国庆新疆北疆自驾 RoadBook：执行、摄影、能源与应急一体化路书。'
  window.document.title = title
  for (const selector of ['meta[name="description"]', 'meta[property="og:description"]', 'meta[name="twitter:description"]']) {
    window.document.querySelector(selector)?.setAttribute('content', description)
  }
  window.document.querySelector('meta[property="og:title"]')?.setAttribute('content', title)
  window.document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', title)
  const schema = window.document.getElementById('roadbook-schema')
  if (schema) schema.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: title,
    inLanguage: 'zh-CN',
    description,
    hasPart: documents.map((item) => ({ '@type': 'CreativeWork', name: item.title, description: item.summary })),
  })
  window.document.body.classList.toggle('reading', Boolean(document))
}, { immediate: true })

watch(() => route.fullPath, async () => {
  menuOpen.value = false
  searchOpen.value = false
  await nextTick()
  if (route.name === 'chapter' && !route.query.section) {
    window.scrollTo({ top: 0, behavior: 'instant' })
    const title = document.getElementById('readerTitle')
    if (title) {
      title.tabIndex = -1
      title.focus({ preventScroll: true })
    }
  }
  updateReadingProgress()
})

onMounted(() => {
  window.addEventListener('beforeprint', beforePrint)
  window.addEventListener('afterprint', afterPrint)
  document.addEventListener('keydown', onKeydown)
  window.addEventListener('scroll', updateReadingProgress, { passive: true })
  window.addEventListener('resize', updateReadingProgress)
  nextTick(() => {
    if (current.value && !route.query.section) window.scrollTo({ top: 0, behavior: 'instant' })
    updateReadingProgress()
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeprint', beforePrint)
  window.removeEventListener('afterprint', afterPrint)
  document.removeEventListener('keydown', onKeydown)
  window.removeEventListener('scroll', updateReadingProgress)
  window.removeEventListener('resize', updateReadingProgress)
  if (progressFrame !== null) window.cancelAnimationFrame(progressFrame)
  document.documentElement.classList.remove('menu-open', 'search-open')
  document.body.classList.remove('reading')
  toastInstance?.close()
})
</script>

<template>
  <a class="skip-link" href="#mainContent" @click.prevent="scrollToSection('mainContent')">跳至正文</a>
  <div class="app-shell">
    <SidebarNavigation
      :open="menuOpen"
      :documents="documents"
      :current="current"
      :policy="roadbook.homepageCopy['policy-baseline']"
      @close="menuOpen = false"
      @navigate="navigate"
      @filter="setFilter"
    />
    <div class="main-shell" :class="{ 'is-reading': current }">
      <AppHeader
        :current="current"
        :filter-label="filterLabel"
        :search-open="searchOpen"
        :menu-open="menuOpen"
        :theme="theme"
        :version="roadbook.homepageCopy.version"
        @action="handleAction"
      />
      <SearchPalette :open="searchOpen" @close="searchOpen = false" @navigate="navigate" />
      <div
        v-if="current"
        class="reading-progress"
        role="progressbar"
        aria-label="当前章节阅读进度"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-valuenow="readingProgress"
      ><span :style="{ width: `${readingProgress}%` }" /></div>
      <main id="mainContent" class="page-content" tabindex="-1">
        <RouterView v-slot="{ Component }">
          <component
            :is="Component"
            @navigate="navigate"
            @filter="setFilter"
            @back="openIndex"
            @browse-days="browseDays"
            @credit="openCredit"
            @toast="showToast"
          />
        </RouterView>
      </main>
      <ImageCredits :images="images" :open="creditsOpen" @update:open="creditsOpen = $event" />
      <AppFooter
        :version="roadbook.homepageCopy.version"
        :planned-driving-distance-km="roadbook.summary.plannedDrivingDistanceKm"
        :is-partial="roadbook.summary.isPartial"
        @navigate="navigate"
      />
      <MobileCommandBar
        :menu-open="menuOpen"
        :search-open="searchOpen"
        :reading="Boolean(current)"
        :theme="theme"
        @action="handleAction"
        @filter="setFilter"
      />
    </div>
  </div>
</template>
