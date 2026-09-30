<script setup>
import { computed, markRaw, ref, shallowRef, watch } from 'vue'
import { useRoute } from 'vue-router'
import ChapterReader from '../components/ChapterReader.vue'
import { documents, getDocumentBySlug, images } from '../data/roadbook.js'

defineEmits(['back', 'navigate', 'credit', 'toast'])

const route = useRoute()
const contentComponent = shallowRef(null)
const loading = ref(false)
const loadError = ref(false)
let loadRequest = 0

const document = computed(() => getDocumentBySlug(String(route.params.slug || '')))
const routeSection = computed(() => String(route.query.section || ''))

watch(document, async (nextDocument) => {
  const request = ++loadRequest
  contentComponent.value = null
  loadError.value = false
  if (!nextDocument) return

  loading.value = true
  try {
    const module = await nextDocument.load()
    if (request === loadRequest) contentComponent.value = markRaw(module.default)
  } catch (error) {
    console.error(`Failed to load chapter: ${nextDocument.file}`, error)
    if (request === loadRequest) loadError.value = true
  } finally {
    if (request === loadRequest) loading.value = false
  }
}, { immediate: true })
</script>

<template>
  <ChapterReader
    v-if="document"
    :doc="document"
    :documents="documents"
    :images="images"
    :content-component="contentComponent"
    :loading="loading"
    :load-error="loadError"
    :route-section="routeSection"
    @back="$emit('back', document.group)"
    @navigate="(file, section) => $emit('navigate', file, section)"
    @credit="$emit('credit', $event)"
    @toast="$emit('toast', $event)"
  />
</template>
