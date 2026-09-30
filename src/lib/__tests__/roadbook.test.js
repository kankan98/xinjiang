import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { documents, gates, images, itinerary, loadChapterSearchIndex, summary } from '../../data/roadbook.js'
import { tripIntelligence } from '../../data/trip-intelligence.js'
import { tripProfile, foodJourney } from '../../data/travel-experience.js'
import { calculateStayPlan, normalizeStayChoices, shortStay } from '../../data/accommodation.js'
import rawRoutes from '../../data/day-routes.json'
import schedules from '../../generated/day-schedules.generated.json'
import { annotateDayRoutes } from '../../data/route-annotations.js'
import ItineraryCell from '../../components/ui/ItineraryCell.vue'
import d7Source from '../../pages/chapters/days/Day7-伊宁-那拉提-唐布拉-尼勒克.vue?raw'
import { slugify, stableSectionId } from '../headings.js'
import { buildChapterRoute, buildRoute, parseRoute } from '../router.js'
import { buildSearchIndex, matchDocument } from '../search.js'
import { budgetDefaults, budgetFields, calculateBudget, navigationUrl, normalizeBudget, plannedDrivingKm } from '../travel.js'
import { readChecks, readPlannerState, writeChecks, writePlannerState } from '../storage.js'

describe('RoadBook content contract', () => {
  it('loads all registered chapters and licensed images', () => {
    expect(documents).toHaveLength(23)
    expect(Object.keys(images)).toHaveLength(28)
    expect(['overview', 'days', 'topics'].map((group) => documents.filter((doc) => doc.group === group).length)).toEqual([5, 10, 8])
    for (const doc of documents.filter((doc) => doc.heroImage)) expect(images[doc.heroImage]).toBeTruthy()
    expect(documents.find((doc) => doc.file.startsWith('Day1-')).heroImage).toBe('burqin')
    expect(images['baihaba-line'].author).toBe('用户提供')
  })

  it('sums planned driving distance and time, including the D5 round trip', () => {
    const driving = itinerary.filter((item) => summary.drivingDays.includes(item.meta.day))
    expect(driving).toHaveLength(8)
    expect(Math.round(driving.reduce((sum, { meta }) => sum + Number(meta.distance), 0))).toBe(summary.plannedDrivingDistanceKm)
    const minutes = (value) => { const [h, m] = value.match(/\d+/g).map(Number); return h * 60 + m }
    expect(driving.reduce((sum, { meta }) => sum + minutes(meta.driveTime), 0)).toBe(minutes(summary.plannedDrivingTime))
    expect(summary.plannedDrivingDistanceKm).toBe(2337)
    expect(summary.plannedDrivingTime).toBe('35 h 02 min')
    expect(summary.isPartial).toBe(false)
    expect(summary.includesEstimate).toBe(true)
    expect(summary.missingDrivingSegments).toEqual([])
    const d5 = driving.find(({ meta }) => meta.day === 'D5').meta
    expect(Number(d5.transferDistance) + Number(d5.scenicDistance)).toBeCloseTo(Number(d5.distance))
  })

  it('covers all ten days with chapter-derived schedules and five practical categories', () => {
    expect(tripIntelligence.dailyGuides.map((guide) => guide.day)).toEqual(Array.from({ length: 10 }, (_, index) => `D${index}`))
    for (const guide of tripIntelligence.dailyGuides) {
      expect(guide.schedule).toEqual(schedules[guide.file])
      expect(guide.schedule.length).toBeGreaterThanOrEqual(4)
      expect(guide.schedule.every((entry) => entry.time && entry.event)).toBe(true)
      expect(guide.categories.map((category) => category.label)).toEqual(['吃', '穿', '住', '行', '玩'])
      expect(guide.categories.every((category) => category.summary && category.boundary && category.actions.length)).toBe(true)
      expect(guide.evidence.every((source) => source.label && source.url && source.status)).toBe(true)
    }
  })

  it('keeps seven gates and moves the Duku fallback to the D8 return', async () => {
    expect(gates.map((gate) => gate.id)).toEqual(['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7'])
    expect(gates.find((gate) => gate.id === 'G1').pass).toContain('电子票离线保存')
    expect(gates.find((gate) => gate.id === 'G7').pass).toMatch(/6-19\s*正式指南/)
    expect(gates.find((gate) => gate.id === 'G7').fallback).toMatch(/441\.7\s*km/)
    const body = await loadChapterSearchIndex()
    const d7 = body['Day7-伊宁-那拉提-唐布拉-尼勒克.md']
    expect(d7Source).toContain('id="独库不通时怎么走"')
    expect(d7).toContain('D8 封路方案')
    expect(d7).toContain('08:00')
    expect(d7).toContain('16:15')
    expect(d7).toContain('库尔德宁')
    expect(tripIntelligence.dailyGuides.find((guide) => guide.day === 'D8').hardStop).toContain('23:30')
    expect(schedules['Day1-乌鲁木齐-布尔津.md'][0].time).toContain('11:00')
    expect(schedules['Day8-尼勒克-乌鲁木齐.md'].some((row) => row.time === '09:40' && row.event.includes('出发'))).toBe(true)
  })

  it('does not turn reference links or the consultation draft into live verification', () => {
    expect(tripIntelligence.verifiedAt).toBe('2026-09-06')
    expect(tripIntelligence.reviewedAt).toBe('2026-09-30')
    const official = tripIntelligence.dailyGuides.find((g) => g.day === 'D8').evidence.find((source) => source.url.includes('btzx.com.cn'))
    expect(official).toBeTruthy()
    expect(official.verifiedAt).toBeUndefined()
    expect(official.status).toMatch(/^reviewed-/)
    for (const guide of tripIntelligence.dailyGuides.filter((g) => ['D0', 'D9'].includes(g.day))) {
      expect(guide.evidence.every((s) => !s.verifiedAt)).toBe(true)
      expect(guide.evidence.some((s) => s.status === 'reviewed-schedule' && s.reviewedAt === '2026-09-29')).toBe(true)
      expect(guide.evidence.filter((s) => s.status === 'reference-only').every((s) => !s.reviewedAt)).toBe(true)
    }
    expect(foodJourney).toHaveLength(6)
  })

  it('keeps the D3 arrival deadline distinct from its bus departure across reading surfaces', async () => {
    const index = await loadChapterSearchIndex()
    const schedule = schedules['Day3-白哈巴-喀纳斯全天.md']
    expect(schedule.some((row) => row.time === '15:45' && row.event.includes('抵达白哈巴'))).toBe(true)
    for (const name of ['Day3-白哈巴-喀纳斯全天.md', '专题-理想L8新疆自驾指南.md']) {
      const text = index[name].replace(/\s+/g, '')
      expect(text).toContain('14:30')
      expect(text).toContain('16:30')
      expect(text).not.toContain('16:00前从喀纳斯乘车返村')
    }
  })

  it('labels the D3 distance as self-driving mileage', () => {
    const item = itinerary.find(({ meta }) => meta.day === 'D3')
    const wrapper = mount(ItineraryCell, { props: { item, index: 3 } })
    expect(wrapper.find('.itin-km').text()).toContain('140.4')
    expect(wrapper.find('.itin-km').text()).not.toContain('单程')
  })

  it('supports current chapter routes and old hash links', () => {
    expect(buildChapterRoute('Day4-白哈巴-克拉玛依-奎屯.md', '今日主题')).toBe('/chapter/Day4-%E7%99%BD%E5%93%88%E5%B7%B4-%E5%85%8B%E6%8B%89%E7%8E%9B%E4%BE%9D-%E5%A5%8E%E5%B1%AF?section=%E4%BB%8A%E6%97%A5%E4%B8%BB%E9%A2%98')
    expect(parseRoute(buildRoute('Day3-白哈巴-喀纳斯全天.md', '今日主题'))).toEqual({ doc: 'Day3-白哈巴-喀纳斯全天.md', section: '今日主题' })
    expect(parseRoute('#anything-else')).toEqual({ invalid: true })
    const seen = new Map()
    expect(slugify('临行硬闸门！')).toBe('临行硬闸门')
    expect(stableSectionId('提醒', seen)).toBe('提醒')
    expect(stableSectionId('提醒', seen)).toBe('提醒-2')
  })

  it('loads chapter components and full-text search on demand', async () => {
    const day = documents.find((doc) => doc.file === 'Day2-布尔津-白哈巴.md')
    expect((await day.load()).default).toBeTruthy()
    const index = buildSearchIndex(documents, await loadChapterSearchIndex())
    expect(matchDocument(day, '白哈巴', index).matches).toContain('正文')
    expect(matchDocument(day, 'Day2', index).matches).toContain('标签')
    expect(matchDocument(day, '铁热克提', index).matches).toContain('正文')
  })
})

describe('route arithmetic and navigation', () => {
  it('excludes taxis and counts scenic return legs and estimated driving', () => {
    expect(plannedDrivingKm([{ mode: 'taxi', km: 100 }, { mode: 'rail', km: 200 }, { mode: 'drive', km: 29.3, roundTrip: true }, { mode: 'estimated-drive', km: 60 }])).toBeCloseTo(118.6)
    expect(plannedDrivingKm([{ mode: 'drive', km: 'bad' }, { mode: 'drive', km: -2 }])).toBe(0)
  })

  it('preserves original route evidence and applies annotations idempotently', () => {
    const before = JSON.stringify(rawRoutes)
    const once = annotateDayRoutes(rawRoutes)
    expect(JSON.stringify(rawRoutes)).toBe(before)
    expect(annotateDayRoutes(once)).toEqual(once)
    expect(once.fetchedAt).toBe(rawRoutes.fetchedAt)
    expect(plannedDrivingKm(once.days.D0.legs)).toBe(0)
    expect(plannedDrivingKm(once.days.D9.legs)).toBe(0)
    expect(once.days.D7.legs.filter((leg) => leg.mode === 'estimated-drive')).toHaveLength(1)
    expect(once.days.D7.isPartial).toBe(false)
    expect(once.days.D7.isEstimate).toBe(true)
    expect(once.days.D7.plannedDistanceKm).toBe(300)
    expect(once.days.D7.manualStart).toBe(true)
    expect(once.days.D7.legs.some((leg) => leg.mode === 'shuttle')).toBe(false)
    expect(once.days.D8.legs.find((leg) => leg.from === 'bll' && leg.to === 'qem').roads).toContain('315省道')
    expect(once.days.D2.legs.some((leg) => leg.from === 'knsHc' && leg.to === 'bhbYk')).toBe(true)
    expect(once.days.D4.pois.some((poi) => poi.kind === 'optional')).toBe(false)
    expect(once.days.D9.pois.find((poi) => poi.id === 'juzi').note).toContain('23:30')
  })

  it('counts only the selected D7 and D8 driving legs, keeping alternatives and walking separate', () => {
    const routes = annotateDayRoutes(rawRoutes)
    const d7 = routes.days.D7
    const d8 = routes.days.D8
    expect(d7.legs.find((leg) => leg.from === 'camp' && leg.to === 'qimeng')).toMatchObject({ mode: 'walk', roundTrip: true })
    expect(plannedDrivingKm(d7.legs)).toBeCloseTo(120.955, 3)
    const approach = d7.legs.find((leg) => leg.from === 'atour')
    expect(approach.km).toBeUndefined()
    expect(approach.navigation).toBe(false)
    expect(d7.legs.some((leg) => leg.from === 'ayou' || leg.to === 'ayou')).toBe(false)
    expect(d7.legs.some((leg) => leg.from === 'camp' && leg.to === 'kurd')).toBe(true)
    const driving = d8.legs.filter((leg) => leg.mode === 'drive')
    expect(driving.map(({ from, to }) => [from, to])).toEqual([['hanting', 'bll'], ['bll', 'qem'], ['qem', 'return']])
    expect(driving.reduce((sum, leg) => sum + leg.durationSeconds, 0)).toBe(18453)
    expect(plannedDrivingKm(d8.legs)).toBeCloseTo(276.657, 3)
    expect(d8.alternatives.map(({ km }) => km)).toEqual([314.139, 441.654])
    expect(routes.fetchedAt).toBe('2026-09-05')
    expect(d8.fetchedAt).toBe('2026-09-30')
    expect(driving.every((leg) => leg.queriedAt === '2026-09-30')).toBe(true)
  })

  it('keeps the return service point distinct from the station and its walk out of car mileage', () => {
    const d8 = annotateDayRoutes(rawRoutes).days.D8
    const service = d8.pois.find((poi) => poi.id === 'return')
    const station = d8.pois.find((poi) => poi.id === 'kty')
    expect([service.lng, service.lat]).not.toEqual([station.lng, station.lat])
    expect(d8.legs.find((leg) => leg.to === 'return')).toMatchObject({ from: 'qem', mode: 'drive' })
    const connection = d8.legs.find((leg) => leg.from === 'return' && leg.to === 'kty')
    expect(connection).toMatchObject({ mode: 'walk', km: 0.348, durationSeconds: 278, roundTrip: false })
    expect(plannedDrivingKm([connection])).toBe(0)
    expect(d8.legs.find((leg) => leg.from === 'kty' && leg.to === 'wlmqstn').mode).toBe('rail')
  })

  it('encodes Chinese navigation names exactly once and keeps endpoints distinct', () => {
    const from = { name: '奎屯站', lng: 84.900179, lat: 44.403616 }
    const to = { name: '布尔津 柒朵', lng: 86.877406, lat: 47.702818 }
    const url = new URL(navigationUrl(from, to))
    expect(url.searchParams.get('from')).toBe('84.900179,44.403616,奎屯站')
    expect(url.searchParams.get('to')).toBe('86.877406,47.702818,布尔津 柒朵')
    expect(url.searchParams.get('coordinate')).toBe('gaode')
    expect(navigationUrl(from, to)).not.toContain('%25')
    expect(navigationUrl(null, to)).toBe('')
  })
})

describe('budget and local reminders', () => {
  it('keeps unknown costs separate from a partial subtotal', () => {
    const result = calculateBudget(budgetDefaults, tripProfile)
    expect(result.known).toBeCloseTo(15877.92)
    expect(result.fixed).toBeCloseTo(16075.92)
    expect(result.meals).toBe(4800)
    expect(result.energy).toBe(1500)
    expect(result.total).toBeCloseTo(26864.92)
    expect(result.missing).toHaveLength(4)
    expect(budgetDefaults.rental).toBe(4489)
    expect(budgetDefaults.energyTotal).toBe(1500)
    const completed = calculateBudget({ ...budgetDefaults, ...Object.fromEntries(budgetFields.map(({ key }) => [key, 0])), rental: 3000 }, tripProfile)
    expect(completed.missing).toEqual([])
    expect(completed.total).toBeCloseTo(25177.92)
    expect(completed.perPerson * 4).toBeCloseTo(completed.total)
  })

  it('uses entered energy once, preserves zero and migrates custom legacy estimates without losing other costs', () => {
    const baseline = calculateBudget(budgetDefaults, tripProfile)
    expect(calculateBudget({ ...budgetDefaults, energyTotal: 1800 }, tripProfile).total - baseline.total).toBeCloseTo(300)
    expect(calculateBudget({ ...budgetDefaults, energyTotal: 0 }, tripProfile).total).toBeCloseTo(baseline.total - 1500)
    expect(normalizeBudget({ energyTotal: '' }).energyTotal).toBe(1500)
    expect(normalizeBudget({ energyTotal: -1 }).energyTotal).toBe(1500)
    expect(normalizeBudget({ energyTotal: 'not-a-number' }).energyTotal).toBe(1500)
    expect(normalizeBudget({ drivingKm: 2574, litersPer100Km: 6.6, fuelPrice: 8.5 }).energyTotal).toBe(1500)
    const migrated = normalizeBudget({ drivingKm: 3000, litersPer100Km: 7, fuelPrice: 8, rental: 3200, rail: 800 })
    expect(migrated).toMatchObject({ energyTotal: 1680, rental: 3200, rail: 800 })
    expect(normalizeBudget(migrated)).toEqual(migrated)
    expect(normalizeBudget({ drivingKm: 0 }).energyTotal).toBe(0)
    expect(normalizeBudget({ energyTotal: 1234.56, drivingKm: 3000, fuelPrice: 8 }).energyTotal).toBe(1234.56)
  })

  it('substitutes Jinghe once and ignores the retired D7 hotel choice', () => {
    expect(calculateStayPlan().total).toBe(5877.92)
    expect(calculateStayPlan({ D4: 'jinghe' }).total).toBe(5719.92)
    expect(calculateStayPlan({ D7: 'yunshu' }).total).toBe(5877.92)
    const both = calculateStayPlan({ D4: 'jinghe', D7: 'yunshu' })
    expect(both.total).toBe(5719.92)
    expect(both.savings).toBe(158)
    expect(both.selected).toHaveLength(1)
    const result = calculateBudget(budgetDefaults, { ...tripProfile, hotels: both.total })
    expect(result.fixed).toBeCloseTo(15917.92)
    expect(result.total).toBeCloseTo(26706.92)
    expect(shortStay).toMatchObject({ rooms: 2, hours: 3, cents: 19800, start: '20:30', end: '23:30' })
    expect(calculateBudget({ ...budgetDefaults, room: 0 }, tripProfile).total).toBeCloseTo(26666.92)
  })

  it('recovers invalid hotel choices independently and retains the quoted hourly-room default for old saved budgets', () => {
    for (const value of [null, [], 'jinghe', { D4: 'yunshu', D7: 'jinghe' }]) {
      expect(normalizeStayChoices(value)).toEqual({ D4: 'primary' })
    }
    expect(normalizeStayChoices({ D4: 'jinghe', D7: 'unknown' })).toEqual({ D4: 'jinghe' })
    expect(normalizeStayChoices({ D7: 'yunshu' })).toEqual({ D4: 'primary' })
    expect(normalizeBudget({ rental: 3000, room: '' })).toMatchObject({ rental: 3000, room: 198 })
    expect(normalizeBudget({ room: 396 }).room).toBe(396)
  })

  it('keeps the latest flight and alternate hotel instructions discoverable across daily reading and maps', async () => {
    const body = await loadChapterSearchIndex()
    const d0 = body['Day0-香港-乌鲁木齐.md']
    expect(d0).toContain('18:45')
    expect(d0).not.toContain('19:25')
    expect(d0).toContain('01:15')
    expect(d0).toContain('T2')
    expect(d0).not.toContain('00:35')
    expect(d0).toContain('14:30')
    expect(d0).toContain('15:00')
    expect(d0).toContain('16:30')
    expect(schedules['Day0-香港-乌鲁木齐.md'].some((row) => row.time.includes('18:45'))).toBe(true)
    expect(schedules['Day0-香港-乌鲁木齐.md'].some((row) => row.time.includes('14:30'))).toBe(true)
    expect(annotateDayRoutes(rawRoutes).days.D0.legs.find((leg) => leg.mode === 'flight').note).toContain('18:45')
    expect(body['Day4-白哈巴-克拉玛依-奎屯.md']).toContain('季枫国际酒店（精河乌伊路店）')
    expect(body['Day7-伊宁-那拉提-唐布拉-尼勒克.md']).toContain('汉庭酒店（新源天鹅湖店）')
    expect(itinerary.find(({ meta }) => meta.day === 'D7').meta.stay).toContain('294.22')
    expect(itinerary.find(({ meta }) => meta.day === 'D8').meta.focus).toContain('09:40')
  })

  it('normalizes corrupt, blank and out-of-range values without inventing zero costs', () => {
    for (const value of [null, [], 'invalid', false]) expect(normalizeBudget(value)).toEqual(budgetDefaults)
    const result = normalizeBudget({ rental: '', rail: '0', tickets: ' ', room: -10, transfers: {}, extras: [], mealPerPersonDay: '', drivingKm: Infinity, litersPer100Km: 1000001, fuelPrice: 'NaN' })
    expect(result).toEqual({ ...budgetDefaults, rail: 0 })
    expect(normalizeBudget({ rental: '1200.50' }).rental).toBe(1200.5)
  })

  it('round-trips versioned planner and chapter-check state and rejects bad storage', () => {
    writePlannerState('unit-budget', { rental: 100 })
    expect(readPlannerState('unit-budget', null)).toEqual({ rental: 100 })
    localStorage.setItem('roadbook:planner:v3.9:unit-corrupt', '{bad')
    expect(readPlannerState('unit-corrupt', [])).toEqual([])
    writeChecks('unit-chapter', new Set([0, 2]))
    expect([...readChecks('unit-chapter')]).toEqual([0, 2])
    localStorage.setItem('roadbook:check:v3.9:unit-bad', '["0",null,-1,1.2,3]')
    expect([...readChecks('unit-bad')]).toEqual([3])
    localStorage.setItem('roadbook:check:v3.9:unit-object', '{}')
    expect(readChecks('unit-object').size).toBe(0)
  })
})
