import { createHash } from 'node:crypto'
import { access, readdir, readFile } from 'node:fs/promises'
import { dirname, extname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { foodJourney, dayExperiences, gateLabels, tripProfile } from '../src/data/travel-experience.js'
import { overnightStays, shortStay, stayAlternatives } from '../src/data/accommodation.js'
import { annotateDayRoutes } from '../src/data/route-annotations.js'
import { plannedDrivingKm } from '../src/lib/travel.js'

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const srcRoot = resolve(workspaceRoot, 'src')
const pagesRoot = resolve(srcRoot, 'pages/chapters')
const manifest = JSON.parse(await readFile(resolve(srcRoot, 'data/roadbook.manifest.json'), 'utf8'))
const imageManifest = JSON.parse(await readFile(resolve(srcRoot, 'data/images.manifest.json'), 'utf8'))
const runtime = JSON.parse(await readFile(resolve(srcRoot, 'data/roadbook-runtime.json'), 'utf8'))
const searchIndex = JSON.parse(await readFile(resolve(srcRoot, 'generated/search-index.generated.json'), 'utf8'))
const guides = JSON.parse(await readFile(resolve(srcRoot, 'data/daily-guides.json'), 'utf8'))
const schedules = JSON.parse(await readFile(resolve(srcRoot, 'generated/day-schedules.generated.json'), 'utf8'))
const routes = annotateDayRoutes(JSON.parse(await readFile(resolve(srcRoot, 'data/day-routes.json'), 'utf8')))
const errors = []
const forbiddenCurrentSourceReferences = [
  'docs/route-v3',
  'route-v3.1-数据包',
  '_backup-202608',
  'roadbook-runtime.generated.json',
]

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map((entry) => {
    const path = resolve(directory, entry.name)
    return entry.isDirectory() ? listFiles(path) : [path]
  }))
  return nested.flat()
}

function assert(condition, message) {
  if (!condition) errors.push(message)
}

const sourceFiles = await listFiles(srcRoot)
const currentSourceFiles = sourceFiles.filter((file) => ['.js', '.json', '.vue'].includes(extname(file).toLowerCase()))
for (const file of currentSourceFiles) {
  const source = await readFile(file, 'utf8')
  for (const reference of forbiddenCurrentSourceReferences) {
    assert(!source.includes(reference), `现行源码仍引用旧约定 ${reference}：${relative(workspaceRoot, file)}`)
  }
}
const markdownFiles = sourceFiles.filter((file) => extname(file).toLowerCase() === '.md')
assert(markdownFiles.length === 0, `src/ 仍包含 Markdown：${markdownFiles.map((file) => relative(workspaceRoot, file)).join(', ')}`)

const documentIds = new Set(manifest.documents.map((document) => document.file))
const expectedComponents = new Set(manifest.documents.map((document) => (
  resolve(pagesRoot, document.group, document.file.replace(/\.md$/i, '.vue'))
)))
const actualComponents = new Set((await listFiles(pagesRoot)).filter((file) => extname(file) === '.vue'))
const chapterSources = new Map(await Promise.all(manifest.documents.map(async (doc) => [
  doc.file, await readFile(resolve(pagesRoot, doc.group, doc.file.replace(/\.md$/i, '.vue')), 'utf8').catch(() => ''),
])))
const sectionIds = new Map([...chapterSources].map(([file, source]) => [file, new Set([...source.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]))]))

function assertTarget(file, section, label) {
  assert(documentIds.has(file), `${label}：章节不存在 ${file}`)
  if (section) assert(sectionIds.get(file)?.has(section), `${label}：段落不存在 ${file} #${section}`)
}

assert(manifest.documents.length === 23, `章节数量应为 23，实际为 ${manifest.documents.length}`)
assert(actualComponents.size === expectedComponents.size, `章节组件数量应为 ${expectedComponents.size}，实际为 ${actualComponents.size}`)

for (const componentPath of expectedComponents) {
  assert(actualComponents.has(componentPath), `缺少章节组件：${relative(workspaceRoot, componentPath)}`)
  if (!actualComponents.has(componentPath)) continue

  const source = await readFile(componentPath, 'utf8')
  assert(source.includes('<template>'), `章节组件缺少 template：${relative(workspaceRoot, componentPath)}`)
  assert(!source.includes(['v', 'html'].join('-')), `章节组件不得使用动态 HTML：${relative(workspaceRoot, componentPath)}`)

  const ids = [...source.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1])
  assert(new Set(ids).size === ids.length, `章节内存在重复 id：${relative(workspaceRoot, componentPath)}`)

  const checks = [...source.matchAll(/data-check-index="(\d+)"/g)].map((match) => Number(match[1]))
  assert(checks.every((value, index) => value === index), `Checklist 序号不连续：${relative(workspaceRoot, componentPath)}`)

  for (const match of source.matchAll(/data-doc="([^"]+)"/g)) {
    assert(documentIds.has(match[1]), `章节内链目标不存在：${match[1]}（${relative(workspaceRoot, componentPath)}）`)
  }
  for (const match of source.matchAll(/<a\b[^>]*>/g)) {
    const target = match[0].match(/data-doc="([^"]+)"/)?.[1]
    const section = match[0].match(/data-section="([^"]+)"/)?.[1]
    if (target) assertTarget(target, section, relative(workspaceRoot, componentPath))
  }

  for (const match of source.matchAll(/src="@\/assets\/images\/([^"]+)"/g)) {
    try {
      await access(resolve(srcRoot, 'assets/images', match[1]))
    } catch {
      errors.push(`章节图片不存在：${match[1]}（${relative(workspaceRoot, componentPath)}）`)
    }
  }
}

for (const componentPath of actualComponents) {
  assert(expectedComponents.has(componentPath), `存在未登记章节组件：${relative(workspaceRoot, componentPath)}`)
}

assert(Object.keys(imageManifest.images).length === 28, `图片数量应为 28，实际为 ${Object.keys(imageManifest.images).length}`)
for (const [id, image] of Object.entries(imageManifest.images)) {
  const imagePath = resolve(srcRoot, 'assets/images', image.file)
  try {
    await access(imagePath)
    const bytes = await readFile(imagePath)
    const sha256 = createHash('sha256').update(bytes).digest('hex')
    assert(bytes.byteLength === image.byteLength, `图片字节数与清单不符：${id}`)
    assert(sha256 === image.sha256, `图片 SHA-256 与清单不符：${id}`)
  } catch {
    errors.push(`图片清单资源不存在：${id} -> ${image.file}`)
  }
}

assert(runtime.itinerary.length === 10, `每日行程应为 10，实际为 ${runtime.itinerary.length}`)
assert(runtime.gates.length === 7, `临行闸门应为 7，实际为 ${runtime.gates.length}`)
const itineraryByDay = new Map(runtime.itinerary.map((item) => [item.meta.day, item]))
const plannedDistance = runtime.summary.drivingDays.reduce((total, day) => {
  const item = itineraryByDay.get(day)
  assert(Boolean(item), `计划驾驶里程引用了不存在的行程：${day}`)
  return total + Number(item?.meta.distance || 0)
}, 0)
assert(
  Math.round(plannedDistance) === runtime.summary.plannedDrivingDistanceKm,
  `计划驾驶里程应为 ${Math.round(plannedDistance)} km，实际为 ${runtime.summary.plannedDrivingDistanceKm} km`,
)
const minutes = (value) => {
  const match = value?.match(/^(\d+) h (\d+) min$/)
  assert(Boolean(match), `驾驶时间格式无效：${value}`)
  return match ? Number(match[1]) * 60 + Number(match[2]) : 0
}
const drivingMinutes = runtime.summary.drivingDays.reduce((sum, day) => sum + minutes(itineraryByDay.get(day)?.meta.driveTime), 0)
assert(drivingMinutes === minutes(runtime.summary.plannedDrivingTime), '汇总纯驾驶时间与逐日数据不一致')
assert(new Set(runtime.summary.drivingDays).size === runtime.summary.drivingDays.length, '汇总重复计算驾驶日')
const hotelTotal = runtime.itinerary.slice(0, tripProfile.nights).reduce((sum, item) => {
  const amount = item.meta.stay.match(/¥([\d,.]+)/)?.[1]
  assert(Boolean(amount), `${item.meta.day} 缺少已订住宿金额`)
  return sum + Number(amount?.replaceAll(',', '') || 0)
}, 0)
assert(Math.abs(hotelTotal - tripProfile.hotels) < 0.005, '预算已订住宿金额与八晚订单摘要不一致')
for (const stay of overnightStays) {
  const item = itineraryByDay.get(stay.day)
  const amount = Number(item?.meta.stay.match(/¥([\d,.]+)/)?.[1].replaceAll(',', ''))
  assert(Math.round(amount * 100) === stay.cents, `${stay.day} 住宿摘要与用户回填价格不一致`)
  const chapterAmounts = [...(chapterSources.get(item?.file) || '').matchAll(/¥([\d,.]+)/g)].map((match) => Math.round(Number(match[1].replaceAll(',', '')) * 100))
  assert(chapterAmounts.includes(stay.cents), `${stay.day} 正文缺少当前主选房价`)
}
assert(itineraryByDay.get('D8').meta.stay.includes(`¥${shortStay.cents / 100}`), 'D8 摘要缺少两间三小时钟点房金额')
for (const option of stayAlternatives) assertTarget(option.file, option.section, `住宿备选 ${option.id}`)
assert(dayExperiences.D0.time === '18:45' && routes.days.D0.legs.find((leg) => leg.mode === 'flight')?.note.includes('18:45'), 'D0 航班摘要与地图未同步到用户最新时刻')
const d0Source = chapterSources.get('Day0-香港-乌鲁木齐.md') || ''
assert(['18:45', '14:30', '15:00', '16:30'].every((token) => d0Source.includes(token)), 'D0 正文缺少最新航班或口岸时刻')
assert(d0Source.includes('不安排机场闲逛'), 'D0 正文缺少已确认取消机场闲逛的执行口径')
const d1Source = chapterSources.get('Day1-乌鲁木齐-布尔津.md') || ''
assert(['12:30', '14:33', '15:30', '16:00', '11:00'].every((token) => d1Source.includes(token)), 'D1 正文缺少最新火车、起床或取车时刻')

for (const gate of runtime.gates) {
  assert(Boolean(gateLabels[gate.id]), `缺少行前清单标签：${gate.id}`)
  assertTarget(gate.file, gate.id === 'G7' ? '独库不通时怎么走' : '临行硬闸门', gate.id)
}
for (const food of foodJourney) assertTarget(food.file, food.section, `美食卡 ${food.id}`)
assert(guides.length === tripProfile.days && Object.keys(schedules).length === tripProfile.days, '每日速查或时间表不完整')
assert(new Set(guides.map((guide) => guide.day)).size === tripProfile.days, '每日速查有重复日期')
for (const guide of guides) {
  assertTarget(guide.file, null, `每日速查 ${guide.day}`)
  assert(itineraryByDay.get(guide.day)?.file === guide.file, `${guide.day} 速查与日程对应错误`)
  assert(guide.categories.map((category) => category.label).join('') === '吃穿住行玩', `${guide.day} 缺少攻略类别`)
  assert(schedules[guide.file]?.length >= 4, `${guide.day} 时间表不完整`)
  assert(Boolean(dayExperiences[guide.day]), `${guide.day} 缺少简短体验摘要`)
}

const modes = new Set(['drive', 'estimated-drive', 'taxi', 'transfer', 'bus', 'rail', 'flight', 'shuttle', 'walk'])
for (const [day, route] of Object.entries(routes.days)) {
  const poiIds = new Set(route.pois.map((poi) => poi.id))
  assert(poiIds.size === route.pois.length, `${day} 地图点位 ID 重复`)
  for (const leg of route.legs) {
    assert(poiIds.has(leg.from) && poiIds.has(leg.to), `${day} 路段端点不存在：${leg.from} → ${leg.to}`)
    assert(modes.has(leg.mode), `${day} 未定义交通类型 ${leg.mode}`)
    assert(leg.points?.length >= 2 && leg.points.every((point) => point.length === 2 && point.every(Number.isFinite)), `${day} 折线数据不完整`)
  }
  const mapKm = plannedDrivingKm(route.legs)
  const baselineKm = Number(itineraryByDay.get(day)?.meta.distance || 0)
  if (route.isEstimate && route.plannedDistanceKm != null) {
    assert(Number.isFinite(route.plannedDistanceKm) && route.plannedDistanceKm >= mapKm, `${day} 全天预算不能低于已测分段`)
    assert(route.plannedDistanceKm === baselineKm && itineraryByDay.get(day)?.meta.isEstimate, `${day} 地图与正文预算口径不一致`)
    assert(route.geometryNote.includes('非高德完整路线实测'), `${day} 预算必须说明实测限制`)
  } else assert(mapKm + 1 >= baselineKm, `${day} 地图自驾遗漏正文路段：${mapKm} / ${baselineKm} km`)
  if (['D0', 'D9'].includes(day)) assert(mapKm === 0, `${day} 出租车不能计为租车自驾`)
}
assert(JSON.stringify(annotateDayRoutes(routes)) === JSON.stringify(routes), '路线注释重复应用会改变数据')
assert(Object.keys(searchIndex).length === manifest.documents.length, '全文搜索索引不完整')
for (const document of manifest.documents) {
  assert(Object.hasOwn(searchIndex, document.file), `搜索索引缺少章节：${document.file}`)
}

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join('\n'))
  process.exit(1)
}

console.log(`Validation passed: ${manifest.documents.length} Vue chapters, ${runtime.itinerary.length} days, ${runtime.gates.length} gates, ${Object.keys(imageManifest.images).length} images, links, ids, checklists, and lazy-search data.`)
