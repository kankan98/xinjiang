<script setup>
import HeroSection from './home/HeroSection.vue'
import HomeSectionNav from './home/HomeSectionNav.vue'
import RouteOverview from './home/RouteOverview.vue'
import DailyFieldGuide from './DailyFieldGuide.vue'
import TripIntelligence from './TripIntelligence.vue'
import ImageStrip from './ui/ImageStrip.vue'
import SectionHeading from './ui/SectionHeading.vue'
import FoodJourney from './home/FoodJourney.vue'
import TripBudget from './home/TripBudget.vue'
import TravelEssentials from './home/TravelEssentials.vue'

const props = defineProps({
  hero: Object,
  images: Object,
  copy: Object,
  itinerary: Array,
  gates: Array,
  intelligence: Object,
  summary: Object,
  resumeDoc: { type: Object, default: null },
})

const emit = defineEmits(['navigate', 'credit', 'browse-days'])

// 影像速写：按路线顺序取沿途代表性照片，点击进入对应章节
const photoStops = [
  { image: props.images?.['burqin'], day: 'D1', file: 'Day1-乌鲁木齐-布尔津.md' },
  { image: props.images?.['baihaba-autumn'], day: 'D2', file: 'Day2-布尔津-白哈巴.md' },
  { image: props.images?.['kanas-lake'], day: 'D3', file: 'Day3-白哈巴-喀纳斯全天.md' },
  { image: props.images?.['karamay-pumpjacks'], day: 'D4', file: 'Day4-白哈巴-克拉玛依-奎屯.md' },
  { image: props.images?.['sayram-sunset-2026'], day: 'D5', file: 'Day5-奎屯-赛里木湖.md' },
  { image: props.images?.['ili-river-sunset'], day: 'D6', file: 'Day6-赛里木湖-伊宁.md' },
  { image: props.images?.['g217-north'], day: 'D8', file: 'Day8-尼勒克-乌鲁木齐.md' },
].filter((stop) => stop.image)
</script>

<template>
  <HomeSectionNav />

  <HeroSection
    :hero="hero"
    :copy="copy"
    :itinerary="itinerary"
    :gates="gates"
    :summary="summary"
    :resume-doc="resumeDoc"
    @navigate="(...args) => $emit('navigate', ...args)"
    @credit="$emit('credit')"
  />

  <RouteOverview
    :copy="copy"
    :itinerary="itinerary"
    @navigate="(...args) => $emit('navigate', ...args)"
  />

  <DailyFieldGuide
    :guides="intelligence.dailyGuides"
    :itinerary="itinerary"
    @navigate="(...args) => emit('navigate', ...args)"
  />

  <FoodJourney @navigate="(...args) => emit('navigate', ...args)" />
  <TripBudget @navigate="(...args) => emit('navigate', ...args)" />

  <section id="photoStrip" class="photo-strip-section" aria-labelledby="photoStripTitle">
    <SectionHeading
      class="photo-strip-head"
      eyebrow="北疆影像速写"
      title="沿途的风景，先翻几页"
      description="按路线顺序挑选的沿途影像，图注保留作者与授权；点击任一帧进入当天章节。"
      heading-id="photoStripTitle"
    >
      <template #meta><span class="photo-strip-stat">{{ photoStops.length }} FRAMES · CC LICENSED</span></template>
    </SectionHeading>
    <ImageStrip :images="photoStops" @navigate="(...args) => $emit('navigate', ...args)" />
  </section>

  <TripIntelligence
    :intelligence="intelligence"
    :gates="gates"
    @navigate="(...args) => emit('navigate', ...args)"
  />
  <TravelEssentials @navigate="(...args) => emit('navigate', ...args)" />
</template>
