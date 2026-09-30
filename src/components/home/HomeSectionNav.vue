<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { revealInHorizontalScroll, scrollToSection } from '../../lib/travel.js'

// 首页锚点导航：滚动时高亮当前板块，点击平滑定位到对应章节。
// 用 button 而非 <a href="#…">，避免与 hash 路由（#/chapter/…）冲突。
const links = [
  { id: 'routeOverview', label: '十日路线', num: '01' },
  { id: 'dailyGuide', label: '每日速查', num: '02' },
  { id: 'foodJourney', label: '沿途美食', num: '03' },
  { id: 'tripBudget', label: '预算试算', num: '04' },
  { id: 'intelligence', label: '出行准备', num: '05' },
  { id: 'contentSection', label: '随行手册', num: '06' },
]

const active = ref('')
const navigation = ref(null)
const track = ref(null)
let frame = null
let resizeObserver = null

function scrollTo(id) {
  scrollToSection(id)
}

function syncActive() {
  frame = null
  const readingLine = (document.querySelector('.site-head')?.offsetHeight || 0) + (navigation.value?.offsetHeight || 0) + 36
  const passed = links.filter(({ id }) => (document.getElementById(id)?.getBoundingClientRect().top ?? Infinity) <= readingLine)
  active.value = passed.at(-1)?.id || ''
}

function scheduleSync() {
  if (frame === null) frame = requestAnimationFrame(syncActive)
}

watch(active, async () => {
  await nextTick()
  revealInHorizontalScroll(track.value, track.value?.querySelector('.is-active'))
})

onMounted(() => {
  window.addEventListener('scroll', scheduleSync, { passive: true })
  window.addEventListener('resize', scheduleSync)
  if ('ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(scheduleSync)
    const page = navigation.value?.closest('.home-page')
    if (page) resizeObserver.observe(page)
  }
  scheduleSync()
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', scheduleSync)
  window.removeEventListener('resize', scheduleSync)
  resizeObserver?.disconnect()
  if (frame !== null) cancelAnimationFrame(frame)
})
</script>

<template>
  <nav ref="navigation" class="home-section-nav" aria-label="本页章节">
    <span class="home-section-nav__caption" aria-hidden="true">你的旅途指南</span>
    <div ref="track" class="home-section-nav__track">
      <button
        v-for="link in links"
        :key="link.id"
        type="button"
        class="home-section-nav__link"
        :class="{ 'is-active': active === link.id }"
        :aria-current="active === link.id ? 'true' : undefined"
        @click="scrollTo(link.id)"
      >
        <span class="home-section-nav__num" aria-hidden="true">{{ link.num }}</span>
        {{ link.label }}
      </button>
    </div>
  </nav>
</template>
