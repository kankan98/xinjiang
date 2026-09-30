<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import ChapterIndex from '../components/ChapterIndex.vue'
import HomeOverview from '../components/HomeOverview.vue'
import { documents, gates, getDocumentBySlug, images, itinerary, roadbook } from '../data/roadbook.js'
import { readLastChapter } from '../lib/storage.js'

defineEmits(['navigate', 'filter', 'credit', 'browse-days', 'back', 'toast'])

const route = useRoute()

const filter = computed(() => route.meta.filter || 'all')
const results = computed(() => documents
  .filter((document) => filter.value === 'all' || document.group === filter.value)
  .map((document) => ({ doc: document, snippet: document.summary })))

// 上次读到的章节（进入首页时读取一次）
const resumeDoc = getDocumentBySlug(readLastChapter() || '')
</script>

<template>
  <div class="home-page">
    <HomeOverview
      v-if="filter === 'all'"
      :hero="images[roadbook.homeHero]"
      :images="images"
      :copy="roadbook.homepageCopy"
      :itinerary="itinerary"
      :gates="gates"
      :intelligence="roadbook.intelligence"
      :summary="roadbook.summary"
      :resume-doc="resumeDoc"
      @navigate="(file, section) => $emit('navigate', file, section)"
      @credit="$emit('credit', roadbook.homeHero)"
      @browse-days="$emit('browse-days')"
    />
    <ChapterIndex
      :results="results"
      :images="images"
      :filter="filter"
      :total="documents.length"
      @navigate="$emit('navigate', $event)"
      @filter="$emit('filter', $event)"
    />
  </div>
</template>
