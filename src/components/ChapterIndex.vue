<script setup>
import { computed } from 'vue'
import SectionHeading from './ui/SectionHeading.vue'
import ChapterCard from './ui/ChapterCard.vue'

const props = defineProps({
  results: Array,
  images: Object,
  filter: String,
  total: Number,
})

const emit = defineEmits(['filter'])

const filterOptions = [
  { value: 'all', label: '全部' },
  { value: 'overview', label: '总览与研究' },
  { value: 'days', label: '每日路线' },
  { value: 'topics', label: '专题手册' },
]

const isCurated = computed(() => props.filter === 'all')

// 三卷面板：按卷册分组全部平铺，卷名取自文档数据
const volumeOrder = [
  { value: 'overview', vol: 'VOL.I' },
  { value: 'days', vol: 'VOL.II' },
  { value: 'topics', vol: 'VOL.III' },
]
const volumes = computed(() => volumeOrder
  .map((volume) => ({
    ...volume,
    items: props.results.filter((result) => result.doc.group === volume.value),
  }))
  .filter((volume) => volume.items.length)
  .map((volume) => ({ ...volume, label: volume.items[0].doc.groupLabel })))

const indexCopy = computed(() => {
  if (!isCurated.value) return {
    eyebrow: '章节索引 / 按任务进入',
    title: filterOptions.find((option) => option.value === props.filter)?.label || '全部章节',
    description: '完整列出当前卷册，目录行保留路线摘要与关键标签。',
  }
  return {
    eyebrow: `06 / THE FIELD MANUAL · ${props.total} CHAPTERS`,
    title: '一本路书，随时翻到需要的那页。',
    description: '行程、住宿、美食与应急，分卷收好。也可以按 Ctrl K，直接搜索你需要的信息。',
  }
})
</script>

<template>
  <section id="contentSection" class="content-section" :class="{ 'is-home-index': isCurated, 'is-overview-index': filter === 'overview', 'is-filter-view': filter !== 'all' }" tabindex="-1">
    <SectionHeading
      class="content-head"
      :eyebrow="indexCopy.eyebrow"
      :title="indexCopy.title"
      :description="indexCopy.description"
    >
      <template #meta><div class="content-count">{{ `${results.length} 个章节 · 全书 ${total}` }}</div></template>
    </SectionHeading>
    <div class="chapter-index-toolbar">
      <el-segmented class="filter-row" :model-value="filter" :options="filterOptions" aria-label="章节筛选" @change="emit('filter', $event)" />
      <p class="search-scope">{{ isCurated ? '切换卷册查看完整目录' : `当前范围：${filterOptions.find((option) => option.value === filter)?.label}` }}</p>
    </div>
    <div v-if="results.length" class="chapter-volumes" :class="{ 'is-curated': isCurated }">
      <section
        v-for="volume in volumes"
        :key="volume.value"
        class="chapter-volume"
        :aria-label="`${volume.vol} ${volume.label}`"
      >
        <header class="chapter-volume__head">
          <b class="chapter-volume__no readout" aria-hidden="true">{{ volume.vol }}</b>
          <strong class="chapter-volume__name">{{ volume.label }}</strong>
          <span class="chapter-volume__count">{{ volume.items.length }} 篇</span>
        </header>
        <div class="chapter-volume__rows">
          <ChapterCard
            v-for="(result, index) in volume.items"
            :key="result.doc.file"
            :doc="result.doc"
            :snippet="result.snippet"
            :index="index"
          />
        </div>
      </section>
    </div>
    <el-empty v-else class="empty-state" description="当前卷册暂无章节">
      <template #image><span class="empty-mark">没有匹配结果</span></template>
      <p>可切换卷册，或用全局搜索（Ctrl K）直达任意章节。</p>
      <el-button type="primary" plain round @click="emit('filter', 'all')">查看全部章节</el-button>
    </el-empty>
  </section>
</template>
