import { createRouter, createWebHashHistory } from 'vue-router'
import { getDocumentByFile, getDocumentBySlug } from '../data/roadbook.js'
import { buildChapterRoute, parseLegacyRoute } from '../lib/router.js'

function migrateLegacyHash() {
  const hash = window.location.hash
  if (!hash || hash.startsWith('#/')) return

  const legacy = parseLegacyRoute(hash)
  const document = legacy && !legacy.invalid ? getDocumentByFile(legacy.doc) : null
  const route = document ? buildChapterRoute(document.file, legacy.section) : '/'
  history.replaceState(null, '', `${location.pathname}${location.search}#${route}`)
}

migrateLegacyHash()

const categoryRoutes = [
  { path: '/', name: 'home', filter: 'all' },
  { path: '/overview', name: 'overview', filter: 'overview' },
  { path: '/days', name: 'days', filter: 'days' },
  { path: '/topics', name: 'topics', filter: 'topics' },
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    ...categoryRoutes.map(({ path, name, filter }) => ({
      path,
      name,
      component: () => import('../pages/HomePage.vue'),
      meta: { filter },
    })),
    {
      path: '/chapter/:slug',
      name: 'chapter',
      component: () => import('../pages/ChapterPage.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.name === 'chapter' && to.query.section) return false
    // 卷册索引页之间切换（章节筛选 tab）保持滚动位置，列表原地更新
    const indexRoutes = ['home', 'overview', 'days', 'topics']
    if (indexRoutes.includes(to.name) && indexRoutes.includes(from.name)) return false
    return { top: 0, behavior: 'instant' }
  },
})

router.beforeEach((to) => {
  if (window.location.hash.startsWith('#doc=')) {
    const legacy = parseLegacyRoute(window.location.hash)
    const document = legacy && !legacy.invalid ? getDocumentByFile(legacy.doc) : null
    if (!document) return { name: 'home', replace: true }
    return {
      name: 'chapter',
      params: { slug: document.slug },
      query: legacy.section ? { section: legacy.section } : undefined,
      replace: true,
    }
  }

  if (to.name === 'chapter' && !getDocumentBySlug(String(to.params.slug || ''))) {
    return { name: 'home', replace: true }
  }
})

window.addEventListener('hashchange', (event) => {
  const legacyHash = new URL(event.newURL).hash
  if (!legacyHash.startsWith('#doc=')) return

  const legacy = parseLegacyRoute(legacyHash)
  const document = legacy && !legacy.invalid ? getDocumentByFile(legacy.doc) : null
  if (!document) {
    router.replace({ name: 'home' })
    return
  }

  router.replace({
    name: 'chapter',
    params: { slug: document.slug },
    query: legacy.section ? { section: legacy.section } : undefined,
  })
})
