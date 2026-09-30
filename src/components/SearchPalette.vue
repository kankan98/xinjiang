<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { Close, Search } from '@element-plus/icons-vue'
import { documents, loadChapterSearchIndex } from '../data/roadbook.js'
import { buildSearchIndex, matchDocument } from '../lib/search.js'
import { readRecentSearches, writeRecentSearches } from '../lib/storage.js'

const props = defineProps({
  open: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'navigate'])

const query = ref('')
const bodyIndex = ref(null)
const loading = ref(false)
const loadError = ref(false)
const activeIndex = ref(0)
const recentSearches = ref([])
const suggestedKeywords = ['赛里木湖', '白哈巴', '独库', '无人机', '预算']
const panelRef = ref(null)
const inputRef = ref(null)
const resultsRef = ref(null)
let loadToken = 0
let returnFocus = null

const groupMeta = [
  { id: 'overview', label: '总览与研究' },
  { id: 'days', label: '每日 RoadBook' },
  { id: 'topics', label: '专题手册' },
]

const suggestedFiles = [
  '03-全书一致性与政策时效性复核.md',
  'Day0-香港-乌鲁木齐.md',
  '专题-景区百科.md',
  '专题-新疆旅行应急宝典.md',
]

const hasQuery = computed(() => Boolean(query.value.trim()))
const searchIndex = computed(() => buildSearchIndex(documents, bodyIndex.value || {}))

const grouped = computed(() => {
  let index = 0
  if (!hasQuery.value) {
    const items = suggestedFiles
      .map((file) => documents.find((doc) => doc.file === file))
      .filter(Boolean)
      .map((doc) => ({ doc, matches: [], snippet: doc.summary, index: index++ }))
    return [{ id: 'suggested', label: '常用入口', items }]
  }
  const matched = documents
    .map((doc) => matchDocument(doc, query.value, searchIndex.value))
    .filter((result) => result.matches.length)
  return groupMeta
    .map((group) => ({
      ...group,
      items: matched
        .filter((result) => result.doc.group === group.id)
        .map((result) => ({ ...result, index: index++ })),
    }))
    .filter((group) => group.items.length)
})

const flatResults = computed(() => grouped.value.flatMap((group) => group.items))
const resultCount = computed(() => (hasQuery.value ? flatResults.value.length : 0))
const activeDescendant = computed(() => {
  const target = flatResults.value[activeIndex.value]
  return target ? `search-palette-option-${target.index}` : undefined
})

const statusText = computed(() => {
  if (!hasQuery.value) return '输入关键词，或直接打开常用入口'
  if (loadError.value) return '全文索引载入失败，当前仅匹配标题、摘要与标签'
  if (loading.value && !bodyIndex.value) return '正在载入全文索引，先匹配标题与摘要…'
  return resultCount.value ? `${resultCount.value} 个匹配章节` : '没有匹配结果'
})

async function loadFullTextIndex() {
  if (bodyIndex.value || loading.value) return
  const token = ++loadToken
  loading.value = true
  loadError.value = false
  try {
    const index = await loadChapterSearchIndex()
    if (token === loadToken) bodyIndex.value = index
  } catch {
    if (token === loadToken) loadError.value = true
  } finally {
    if (token === loadToken) loading.value = false
  }
}

function snippetParts(text) {
  const needle = query.value.trim()
  const at = needle ? text.toLowerCase().indexOf(needle.toLowerCase()) : -1
  if (at < 0) return [{ text, hit: false }]
  return [
    { text: text.slice(0, at), hit: false },
    { text: text.slice(at, at + needle.length), hit: true },
    { text: text.slice(at + needle.length), hit: false },
  ].filter((part) => part.text)
}

function close() {
  emit('close')
}

function openResult(result) {
  const keyword = query.value.trim()
  if (keyword) {
    recentSearches.value = [keyword, ...recentSearches.value.filter((item) => item !== keyword)].slice(0, 6)
    writeRecentSearches(recentSearches.value)
  }
  emit('navigate', result.doc.file, '')
  close()
}

function applyRecent(keyword) {
  query.value = keyword
  nextTick(() => inputRef.value?.focus({ preventScroll: true }))
}

function clearRecent() {
  recentSearches.value = []
  writeRecentSearches([])
}

function scrollActiveIntoView() {
  nextTick(() => {
    resultsRef.value?.querySelector('.is-active')?.scrollIntoView({ block: 'nearest' })
  })
}

function onKeydown(event) {
  if (event.isComposing) return
  if (event.key === 'Escape') {
    event.preventDefault()
    close()
    return
  }
  if (event.key === 'Tab') {
    trapTab(event)
    return
  }
  // 搜索框保留 Home / End 编辑文本；建议词和关闭按钮使用原生 Enter 行为。
  if (event.target !== inputRef.value) return
  const count = flatResults.value.length
  if (!count) return
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    activeIndex.value = (activeIndex.value + 1) % count
    scrollActiveIntoView()
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    activeIndex.value = (activeIndex.value - 1 + count) % count
    scrollActiveIntoView()
  } else if (event.key === 'Enter') {
    event.preventDefault()
    const target = flatResults.value[activeIndex.value]
    if (target) openResult(target)
  }
}

function trapTab(event) {
  const panel = panelRef.value
  if (!panel) return
  const items = [...panel.querySelectorAll('input, button:not([disabled]), [tabindex]:not([tabindex="-1"])')]
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

watch(() => props.open, async (open) => {
  if (!open) {
    document.documentElement.classList.remove('search-open')
    if (returnFocus?.isConnected) nextTick(() => returnFocus.focus({ preventScroll: true }))
    return
  }
  returnFocus = document.activeElement
  query.value = ''
  activeIndex.value = 0
  recentSearches.value = readRecentSearches()
  document.documentElement.classList.add('search-open')
  await nextTick()
  inputRef.value?.focus({ preventScroll: true })
  await loadFullTextIndex()
})

watch(query, () => {
  activeIndex.value = 0
})

watch(flatResults, (results) => { activeIndex.value = Math.min(activeIndex.value, Math.max(0, results.length - 1)) })

onBeforeUnmount(() => {
  document.documentElement.classList.remove('search-open')
})
</script>

<template>
  <Teleport to="body">
    <Transition name="palette">
      <div v-if="open" class="search-palette-scrim" @click="close" @keydown="onKeydown">
        <div
          ref="panelRef"
          class="search-palette"
          role="dialog"
          aria-modal="true"
          aria-label="搜索 RoadBook"
          @click.stop
        >
          <div class="search-palette__field">
            <Search class="search-palette__icon" aria-hidden="true" />
            <input
              ref="inputRef"
              v-model="query"
              type="search"
              class="search-palette__input"
              placeholder="搜索章节、地点、政策…"
              autocomplete="off"
              role="combobox"
              aria-expanded="true"
              aria-controls="search-palette-results"
              :aria-activedescendant="activeDescendant"
              aria-label="搜索章节、地点、政策"
              enterkeyhint="go"
            >
            <button v-if="hasQuery" type="button" class="search-palette__clear" aria-label="清空搜索" @click="applyRecent('')"><Close aria-hidden="true" /></button>
            <kbd class="search-palette__esc">Esc</kbd>
            <button type="button" class="search-palette__cancel" @click="close">取消</button>
            <el-button text circle class="search-palette__close" :icon="Close" aria-label="关闭搜索" @click="close" />
          </div>
          <div v-if="!hasQuery" class="search-palette__suggestions">
            <span>从这里找起</span>
            <div><button v-for="keyword in suggestedKeywords" :key="keyword" type="button" @click="applyRecent(keyword)">{{ keyword }} <span aria-hidden="true">↗</span></button></div>
          </div>
          <p class="search-palette__status" role="status" aria-live="polite">{{ statusText }}</p>
          <div v-if="loadError" class="search-palette__error" role="alert">
            <span>正文搜索暂不可用，标题与摘要搜索仍可使用。</span>
            <button type="button" @click="loadFullTextIndex">重试</button>
          </div>
          <div v-if="!hasQuery && recentSearches.length" class="search-palette__recent">
            <span class="search-palette__recent-label">最近搜索</span>
            <button
              v-for="keyword in recentSearches"
              :key="keyword"
              type="button"
              class="search-palette__recent-chip"
              @click="applyRecent(keyword)"
            >{{ keyword }}</button>
            <button type="button" class="search-palette__recent-clear" @click="clearRecent">清除</button>
          </div>
          <div
            id="search-palette-results"
            ref="resultsRef"
            class="search-palette__results"
            role="listbox"
            aria-label="匹配章节"
          >
            <div v-for="group in grouped" :key="group.id" class="search-palette__group" role="group" :aria-label="group.label">
              <p class="search-palette__group-label eyebrow accent">{{ group.label }}<span>{{ group.items.length }}</span></p>
              <div
                v-for="item in group.items"
                :id="`search-palette-option-${item.index}`"
                :key="item.doc.file"
                class="search-palette__item"
                :class="{ 'is-active': item.index === activeIndex }"
                role="option"
                :aria-selected="item.index === activeIndex"
                tabindex="-1"
                @click="openResult(item)"
                @mousemove="activeIndex = item.index"
              >
                <span class="search-palette__kicker">{{ item.doc.kicker }}</span>
                <div class="search-palette__item-body">
                  <strong>{{ item.doc.title }}</strong>
                  <span class="search-palette__snippet"><template v-for="(part, partIndex) in snippetParts(item.snippet)" :key="partIndex"><mark v-if="part.hit">{{ part.text }}</mark><template v-else>{{ part.text }}</template></template></span>
                </div>
                <span v-if="item.matches.length" class="search-palette__matches" aria-label="命中字段"><i v-for="match in item.matches" :key="match">{{ match }}</i></span>
              </div>
            </div>
          </div>
          <div v-if="hasQuery && !flatResults.length" class="search-palette__empty">
            <strong>没有找到“{{ query.trim() }}”</strong>
            <p>换个关键词试试，比如地名（喀纳斯）、主题（加油）或章节名（预算）。</p>
          </div>
          <div class="search-palette__hints" aria-hidden="true">
            <span><kbd>↑</kbd><kbd>↓</kbd> 选择</span>
            <span><kbd>Enter</kbd> 打开</span>
            <span><kbd>Esc</kbd> 关闭</span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
