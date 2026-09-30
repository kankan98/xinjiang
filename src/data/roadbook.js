import manifest from './roadbook.manifest.json'
import imageManifest from './images.manifest.json'
import runtime from './roadbook-runtime.json'
import { tripIntelligence } from './trip-intelligence.js'
import { chapterSlug } from '../lib/router.js'

const imageModules = import.meta.glob('../assets/images/*.{webp,jpg}', {
  eager: true,
  query: '?url',
  import: 'default',
})
const chapterModules = import.meta.glob('../pages/chapters/**/*.vue')
const imageUrls = new Map(
  Object.entries(imageModules).map(([modulePath, url]) => [modulePath.split('/').at(-1), url]),
)
const dayMetaByFile = new Map(runtime.itinerary.map((item) => [item.file, item.meta]))

export const images = Object.freeze(Object.fromEntries(
  Object.entries(imageManifest.images).map(([id, image]) => {
    const src = imageUrls.get(image.file)
    if (!src) throw new Error(`图片资源不存在：${id}`)
    return [id, { ...image, src }]
  }),
))

export const documents = Object.freeze(manifest.documents.map((document) => {
  const componentPath = `../pages/chapters/${document.group}/${document.file.replace(/\.md$/i, '.vue')}`
  const load = chapterModules[componentPath]
  if (!load) throw new Error(`章节组件不存在：${componentPath}`)
  return Object.freeze({
    ...document,
    slug: chapterSlug(document.file),
    dayMeta: dayMetaByFile.get(document.file) || null,
    load,
  })
}))

const documentsByFile = new Map(documents.map((document) => [document.file, document]))
const documentsBySlug = new Map(documents.map((document) => [document.slug, document]))

export const days = Object.freeze(documents.filter((document) => document.group === 'days'))
export const itinerary = Object.freeze(runtime.itinerary.map((item) => {
  const doc = documentsByFile.get(item.file)
  if (!doc) throw new Error(`行程数据引用了不存在的章节文档：${item.file}`)
  return Object.freeze({ doc, meta: item.meta })
}))
export const gates = Object.freeze(runtime.gates)
export const summary = Object.freeze(runtime.summary)

export const roadbook = Object.freeze({
  homeHero: manifest.homeHero,
  homepageCopy: Object.freeze(manifest.homepageCopy),
  intelligence: tripIntelligence,
  sectionImages: Object.freeze(manifest.sectionImages),
  summary,
  images,
  documents,
})

export function getDocumentByFile(file) {
  return documentsByFile.get(file) || null
}

export function getDocumentBySlug(slug) {
  return documentsBySlug.get(slug) || null
}

export async function loadChapterSearchIndex() {
  const module = await import('../generated/search-index.generated.json')
  return module.default
}
