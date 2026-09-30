<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import rawDayRoutes from '../../data/day-routes.json'
import { annotateDayRoutes } from '../../data/route-annotations.js'
import { navigationUrl, plannedDrivingKm } from '../../lib/travel.js'
const dayRoutes = annotateDayRoutes(rawDayRoutes)

const props = defineProps({
  day: { type: String, required: true }, // 形如 "D2"，对应 roadbook-runtime 的 meta.day
})

// 地图按需展开，让日程和文章先进入阅读视野；打印时由样式强制完整展开。
const open = ref(false)
const toggleOpen = () => { open.value = !open.value }

// 紧凑渲染模式：地图实际渲染宽度不足 560px 时（手机整幅/桌面图例侧排），
// 编号圈放大、线宽加粗、隐藏图上名称（名称由图例承担）
const compact = ref(false)
let resizeObserver = null
const scrollRef = ref(null)
onMounted(() => {
  if (typeof ResizeObserver !== 'function') return
  resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) compact.value = entry.contentRect.width > 0 && entry.contentRect.width < 560
  })
  if (scrollRef.value) resizeObserver.observe(scrollRef.value)
})
onBeforeUnmount(() => { resizeObserver?.disconnect(); resizeObserver = null })

const data = computed(() => dayRoutes.days[props.day] || null)

const KIND_STYLE = {
  hub: { color: 'var(--color-info)', label: '枢纽' },
  stay: { color: 'var(--color-route)', label: '住宿' },
  food: { color: 'var(--color-sand)', label: '餐饮' },
  scene: { color: 'var(--color-success)', label: '景点' },
  parking: { color: 'var(--color-success)', label: '停车' },
  service: { color: 'var(--color-muted)', label: '服务区' },
  optional: { color: 'var(--color-alert)', label: '可选' },
}

const MODE_STYLE = {
  drive: { stroke: 'var(--color-route)', width: 3, dash: '0', glow: true, label: '自驾' },
  taxi: { stroke: 'var(--color-info)', width: 2.6, dash: '4 3', label: '出租车' },
  transfer: { stroke: 'var(--color-info)', width: 2.4, dash: '3 4', label: '民宿接驳' },
  'estimated-drive': { stroke: 'var(--color-sand)', width: 3, dash: '6 4', label: '条件自驾 · 估算' },
  rail: { stroke: 'var(--color-info)', width: 2.4, dash: '7 5', label: '火车' },
  flight: { stroke: 'var(--color-alert-deep)', width: 2.4, dash: '8 6', label: '航班' },
  shuttle: { stroke: 'var(--color-success)', width: 2.4, dash: '6 5', label: '区间车' },
  bus: { stroke: 'var(--color-success)', width: 2.4, dash: '6 5', label: '公交／巴士' },
  walk: { stroke: 'var(--color-muted)', width: 2.2, dash: '2 4', label: '步行/接驳' },
}

const PAD = { x: 48, top: 48, bottom: 36 }
const CANVAS_W = 760
const CANVAS_H = 680

function shortName(name) {
  return name.split(/[（(·]/)[0].trim()
}

function labelWidth(text) {
  let width = 0
  for (const ch of text) width += /[\u2E80-\uFFFD]/.test(ch) ? 11 : 6
  return width
}

// —— 墨卡托投影 + 信箱式适配：viewBox 最接近 760×680 设计稿，窄高路线按高度封顶居中 ——
const layout = computed(() => {
  if (!data.value) return null
  const pois = data.value.pois
  const legs = data.value.legs
  const pts = []
  for (const leg of legs) for (const [lng, lat] of leg.points) pts.push([lng, lat])
  for (const poi of pois) pts.push([poi.lng, poi.lat])
  const merc = (lng, lat) => [lng * (Math.PI / 180), Math.log(Math.tan(Math.PI / 4 + (lat * (Math.PI / 180)) / 2))]
  const projected = pts.map(([lng, lat]) => merc(lng, lat))
  const minX = Math.min(...projected.map((p) => p[0]))
  const maxX = Math.max(...projected.map((p) => p[0]))
  const minY = Math.min(...projected.map((p) => p[1]))
  const maxY = Math.max(...projected.map((p) => p[1]))
  const dx = Math.max(maxX - minX, 1e-5)
  const dy = Math.max(maxY - minY, 1e-5)
  const scale = Math.min((CANVAS_W - PAD.x * 2) / dx, (CANVAS_H - PAD.top - PAD.bottom) / dy)
  const innerW = dx * scale
  const innerH = dy * scale
  const width = Math.max(340, innerW + PAD.x * 2)
  const height = Math.max(280, innerH + PAD.top + PAD.bottom)
  const offsetX = (width - innerW) / 2
  const offsetY = (height - innerH) / 2
  const toXY = (lng, lat) => {
    const [mx, my] = merc(lng, lat)
    return [offsetX + (mx - minX) * scale, offsetY + (maxY - my) * scale]
  }
  return { pois, legs, toXY, width, height, tall: width < 560 }
})

// 点位画布坐标：编号圈过近时按小步级联挪开，并记录偏移用于画引线
// 窄屏下编号圈更大（r≈17），碰撞间距与级联步长同步放大
const poisXY = computed(() => {
  if (!layout.value) return []
  const minGap = compact.value ? 39 : 15
  const stepUnit = compact.value ? 17 : 8
  const placed = []
  return layout.value.pois.map((poi) => {
    const [trueX, trueY] = layout.value.toXY(poi.lng, poi.lat)
    let x = trueX
    let y = trueY
    const clash = () => placed.some((p) => Math.hypot(p.x - x, p.y - y) < minGap)
    if (clash()) {
      outer: for (let step = 1; step <= 7; step++) {
        const ring = [[step * stepUnit, 0], [-step * stepUnit, 0], [0, step * stepUnit], [0, -step * stepUnit], [step * stepUnit, step * stepUnit], [-step * stepUnit, step * stepUnit], [step * stepUnit, -step * stepUnit], [-step * stepUnit, -step * stepUnit]]
        for (const [ox, oy] of ring) {
          x = trueX + ox
          y = trueY + oy
          if (!clash()) break outer
        }
      }
    }
    // 级联后钳制回画布（含编号圈半径），避免点簇被 viewBox 边缘裁切
    const chipR = compact.value ? 17 : 8
    x = Math.min(Math.max(x, chipR + 2), layout.value.width - chipR - 2)
    y = Math.min(Math.max(y, chipR + 2), layout.value.height - chipR - 2)
    const point = { ...poi, trueX, trueY, x, y, moved: Math.hypot(x - trueX, y - trueY) > 3 }
    placed.push(point)
    return point
  })
})

// 可选加项点位：与最近主线点之间画浅虚线，表达"折返加项"而非主线
const optionalLinks = computed(() => {
  if (!layout.value) return []
  const mainPois = poisXY.value.filter((p) => p.kind !== 'optional')
  const links = []
  for (const poi of poisXY.value.filter((p) => p.kind === 'optional')) {
    const nearest = mainPois.reduce((best, p) => {
      const d = Math.hypot(p.trueX - poi.trueX, p.trueY - poi.trueY)
      return !best || d < best.d ? { p, d } : best
    }, null)
    if (nearest) links.push({ id: `opt-${poi.id}`, from: nearest.p, to: poi })
  }
  return links
})

// —— 段路径：自驾取真实折线，其余为示意直线/航线弧 ——
const legShapes = computed(() => {
  if (!layout.value) return []
  const { toXY } = layout.value
  const byId = Object.fromEntries(poisXY.value.map((p) => [p.id, p]))
  return data.value.legs.map((leg, index) => {
    const style = MODE_STYLE[leg.mode] || MODE_STYLE.shuttle
    let path = ''
    let arrow = null
    if (['drive', 'taxi', 'estimated-drive'].includes(leg.mode) && leg.points.length > 1) {
      path = leg.points.map(([lng, lat], i) => `${i ? 'L' : 'M'}${toXY(lng, lat).map((v) => v.toFixed(1)).join(' ')}`).join(' ')
      // 中点方向箭头
      const xy = leg.points.map(([lng, lat]) => toXY(lng, lat))
      let total = 0
      const segs = []
      for (let i = 1; i < xy.length; i++) {
        const len = Math.hypot(xy[i][0] - xy[i - 1][0], xy[i][1] - xy[i - 1][1])
        segs.push(len)
        total += len
      }
      let remain = total / 2
      for (let i = 0; i < segs.length; i++) {
        if (remain <= segs[i]) {
          const t = remain / (segs[i] || 1)
          const x = xy[i][0] + (xy[i + 1][0] - xy[i][0]) * t
          const y = xy[i][1] + (xy[i + 1][1] - xy[i][1]) * t
          const angle = (Math.atan2(xy[i + 1][1] - xy[i][1], xy[i + 1][0] - xy[i][0]) * 180) / Math.PI
          if (segs[i] > 14) arrow = { x, y, angle }
          break
        }
        remain -= segs[i]
      }
    } else {
      const a = byId[leg.from]
      const b = byId[leg.to]
      if (!a || !b) return null
      if (leg.mode === 'flight') {
        // 大圆弧：取起终点中垂线方向偏移，朝画面上方拱起
        const mx = (a.x + b.x) / 2
        const my = (a.y + b.y) / 2
        const dx = b.x - a.x
        const dy = b.y - a.y
        const dist = Math.hypot(dx, dy) || 1
        const k = Math.min(dist * 0.22, 96)
        let cx = mx - (dy / dist) * k
        let cy = my + (dx / dist) * k
        if (cy > my) { cx = mx + (dy / dist) * k; cy = my - (dx / dist) * k }
        path = `M${a.x.toFixed(1)} ${a.y.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`
      } else {
        path = `M${a.x.toFixed(1)} ${a.y.toFixed(1)} L${b.x.toFixed(1)} ${b.y.toFixed(1)}`
      }
    }
    const fromPoi = byId[leg.from]
    const toPoi = byId[leg.to]
    return { ...leg, index, style, path, arrow, fromPoi, toPoi }
  }).filter(Boolean)
})

// —— 点位标签避让：候选位与已放置标签、编号圈求最小重叠；全部冲突时取重叠面积最小者 ——
const placedLabels = computed(() => {
  if (!layout.value) return []
  const boxes = []
  const result = []
  const sorted = [...poisXY.value].sort((a, b) => (a.y - b.y) || (a.x - b.x))
  const overlapArea = (a, b) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0))
  const chipBoxes = poisXY.value.map((poi) => ({ x0: poi.x - 10, y0: poi.y - 10, x1: poi.x + 10, y1: poi.y + 10 }))
  for (const poi of sorted) {
    const text = shortName(poi.name)
    const w = labelWidth(text)
    const h = 15
    const candidates = [
      { x: poi.x + 13, y: poi.y + 4, anchor: 'start' },
      { x: poi.x - 13, y: poi.y + 4, anchor: 'end' },
      { x: poi.x, y: poi.y - 14, anchor: 'middle' },
      { x: poi.x, y: poi.y + 23, anchor: 'middle' },
      { x: poi.x + 12, y: poi.y - 11, anchor: 'start' },
      { x: poi.x + 12, y: poi.y + 15, anchor: 'start' },
      { x: poi.x + 16, y: poi.y - 18, anchor: 'start' },
      { x: poi.x - 16, y: poi.y - 18, anchor: 'end' },
    ]
    let best = null
    let bestScore = null
    for (const [index, cand] of candidates.entries()) {
      const x0 = cand.anchor === 'start' ? cand.x : cand.anchor === 'end' ? cand.x - w : cand.x - w / 2
      const box = { x0, y0: cand.y - h + 3, x1: x0 + w, y1: cand.y + 4 }
      const area = boxes.reduce((sum, b) => sum + overlapArea(box, b), 0)
      const chipArea = chipBoxes.reduce((sum, b) => sum + overlapArea(box, b), 0)
      const inside = box.x0 > 2 && box.y0 > 2 && box.x1 < layout.value.width - 2 && box.y1 < layout.value.height - 2
      const score = area + chipArea * 6 + (inside ? 0 : 1500) + index * 2
      if (bestScore === null || score < bestScore) { best = cand; bestScore = score }
    }
    const w0 = best.anchor === 'start' ? best.x : best.anchor === 'end' ? best.x - w : best.x - w / 2
    boxes.push({ x0: w0, y0: best.y - h + 3, x1: w0 + w, y1: best.y + 4 })
    result.push({ poi, text, ...best })
  }
  return result
})

const hoverNo = ref(0)
const activeNo = computed(() => hoverNo.value)

// 窄屏整幅适配后整图约缩小到 0.4 倍：线宽与虚线同步加粗，保证可读
function strokeWidth(leg) {
  return compact.value ? leg.style.width * 1.7 : leg.style.width
}
function dashFor(leg) {
  if (!leg.style.dash || leg.style.dash === '0') return undefined
  const k = compact.value ? 1.7 : 1
  return leg.style.dash.split(' ').map((v) => (Number(v) * k).toFixed(1)).join(' ')
}

const amapUri = computed(() => {
  if (data.value?.manualStart) return ''
  const leg = data.value?.legs.find((item) => item.mode === 'drive')
  if (!leg) return ''
  return navigationUrl(data.value.pois.find((poi) => poi.id === leg.from), data.value.pois.find((poi) => poi.id === leg.to))
})

// 折叠头部里的紧凑读数：自驾总里程
const driveKm = computed(() => {
  if (!data.value) return '0'
  return (data.value.plannedDistanceKm ?? plannedDrivingKm(data.value.legs)).toFixed(1)
})

const bodyId = computed(() => `day-route-map-body-${props.day}`)

const legsSummary = computed(() => {
  if (!data.value) return []
  const byId = Object.fromEntries(data.value.pois.map((p) => [p.id, p]))
  return data.value.legs.map((leg) => {
    const style = MODE_STYLE[leg.mode] || MODE_STYLE.shuttle
    const from = byId[leg.from]
    const to = byId[leg.to]
    const route = `${shortName(from.name)} ${leg.roundTrip ? '⇄' : '→'} ${shortName(to.name)}`
    const hasDistance = leg.km !== undefined && leg.km !== null && leg.km !== '' && Number.isFinite(Number(leg.km)) && Number(leg.km) >= 0
    const metric = hasDistance ? (leg.mode === 'walk' && Number(leg.km) < 1 ? `${Math.round(Number(leg.km) * 1000)} m` : `${leg.km} km${leg.roundTrip ? ' 单程' : ''}`) : ''
    const rawTime = leg.durationSeconds && leg.mode === 'walk'
      ? `${Math.floor(leg.durationSeconds / 60)} min ${leg.durationSeconds % 60} s`
      : leg.time
    const time = leg.plannedTime ? `原查询 ${rawTime}；排程 ${leg.plannedTime}` : rawTime
    const detail = [metric, time, ...(leg.roundTrip && hasDistance ? [`往返约 ${(Number(leg.km) * 2).toFixed(1)} km`] : []), leg.note, ...(leg.roads || []).slice(0, 3), ...(leg.queriedAt ? [`查询 ${leg.queriedAt}`] : [])].filter(Boolean)
    return { id: `${leg.from}-${leg.to}`, icon: style.label, stroke: style.stroke, route, detail, href: ['drive', 'taxi'].includes(leg.mode) && leg.navigation !== false ? navigationUrl(from, to) : '' }
  })
})
</script>

<template>
  <section v-if="data" class="day-route-map" aria-label="今日线路图与分段交通">
    <header class="day-route-map-head">
      <button type="button" class="day-route-map-toggle" :aria-expanded="open" :aria-controls="bodyId" @click="toggleOpen">
        <span class="day-route-map-title">
          <small>ROUTE PLOT · 高德底图与路线注释</small>
          <strong>今日线路图</strong>
        </span>
        <span class="day-route-map-summary">{{ data.pois.length }} 点位 · {{ data.legs.length }} 段 · {{ Number(driveKm) ? `图示${data.isEstimate ? '绕行预算' : data.isPartial ? '已测' : '自驾'}约 ${driveKm} km${data.isEstimate ? ' · 含余量，非全线实测' : data.isPartial ? ' · 进镇段待核' : ''}` : '当天无租车自驾' }}</span>
        <span class="day-route-map-chevron" :class="{ 'is-open': open }" aria-hidden="true">▾</span>
      </button>
      <a v-if="amapUri" class="day-route-map-link" :href="amapUri" target="_blank" rel="noreferrer">导航至自驾首站 ↗</a>
    </header>
    <div v-show="open" :id="bodyId" class="day-route-map-body">
      <div class="day-route-map-plot">
      <div ref="scrollRef" class="day-route-map-scroll">
      <svg :viewBox="`0 0 ${layout.width} ${layout.height}`" :class="compact ? 'is-narrow' : (layout.tall ? 'is-tall' : 'is-wide')" role="img" :aria-label="`今日线路图：${data.title}`">
        <!-- 段：先画衬底再画主线 -->
        <g v-for="leg in legShapes" :key="`casing-${leg.index}`">
          <path v-if="leg.style.glow" :d="leg.path" fill="none" stroke="var(--color-deep)" :stroke-width="compact ? 10 : 6.5" stroke-linecap="round" stroke-linejoin="round" />
        </g>
        <path
          v-for="leg in legShapes"
          :key="`line-${leg.index}`"
          :d="leg.path"
          fill="none"
          :stroke="leg.style.stroke"
          :stroke-width="strokeWidth(leg)"
          :stroke-dasharray="dashFor(leg)"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <g v-for="leg in legShapes.filter((item) => item.arrow)" :key="`arrow-${leg.index}`" :transform="`translate(${leg.arrow.x.toFixed(1)} ${leg.arrow.y.toFixed(1)}) rotate(${leg.arrow.angle.toFixed(1)}) scale(${compact ? 2 : 1})`">
          <path d="M-3.2 -3.4 L4.6 0 L-3.2 3.4 Z" :fill="leg.style.stroke" stroke="var(--color-paper)" stroke-width="0.8" />
        </g>
        <!-- 可选加项与主线点的浅虚线 -->
        <line
          v-for="link in optionalLinks"
          :key="link.id"
          :x1="link.from.trueX" :y1="link.from.trueY" :x2="link.to.trueX" :y2="link.to.trueY"
          stroke="var(--color-alert)" :stroke-width="compact ? 3 : 1.6" stroke-dasharray="3 5" opacity="0.55"
        />
        <!-- 级联挪位的编号圈画引线回到真实位置 -->
        <line
          v-for="entry in placedLabels.filter((item) => item.poi.moved)"
          :key="`leader-${entry.poi.id}`"
          :x1="entry.poi.trueX" :y1="entry.poi.trueY" :x2="entry.poi.x" :y2="entry.poi.y"
          stroke="var(--color-muted-2)" :stroke-width="compact ? 2.2 : 1" stroke-dasharray="2 2"
        />
        <!-- 点位：窄屏放大编号圈、隐藏名称标签（名称见下方图例） -->
        <g
          v-for="entry in placedLabels"
          :key="entry.poi.id"
          class="day-route-poi"
          :class="{ 'is-hover': activeNo === entry.poi.no }"
          @mouseenter="hoverNo = entry.poi.no"
          @mouseleave="hoverNo = 0"
        >
          <title>{{ entry.poi.name }} · {{ entry.poi.note }}</title>
          <circle v-if="entry.poi.kind === 'optional'" :cx="entry.poi.x" :cy="entry.poi.y" :r="compact ? 26 : 12.5" fill="none" :stroke="KIND_STYLE[entry.poi.kind].color" :stroke-width="compact ? 2.4 : 1.4" stroke-dasharray="2.5 2.5" opacity="0.9" />
          <circle :cx="entry.poi.x" :cy="entry.poi.y" :r="compact ? 17 : 8" fill="var(--color-deep)" :stroke="KIND_STYLE[entry.poi.kind].color" :stroke-width="compact ? 3.2 : 2" />
          <text :x="entry.poi.x" :y="entry.poi.y + (compact ? 6.5 : 3.2)" text-anchor="middle" class="day-route-poi-no" :fill="KIND_STYLE[entry.poi.kind].color">{{ entry.poi.no }}</text>
          <text v-if="!compact" :x="entry.x" :y="entry.y" :text-anchor="entry.anchor" class="day-route-poi-label">{{ entry.text }}</text>
        </g>
      </svg>
      </div>
      </div>
      <div class="day-route-map-side">
      <ol class="day-route-legend" aria-label="今日点位清单">
      <li
        v-for="poi in data.pois"
        :key="poi.id"
        :class="{ 'is-hover': activeNo === poi.no }"
        @mouseenter="hoverNo = poi.no"
        @mouseleave="hoverNo = 0"
      >
        <span class="day-route-legend-no" :style="{ borderColor: KIND_STYLE[poi.kind].color, color: KIND_STYLE[poi.kind].color }">{{ poi.no }}</span>
        <span class="day-route-legend-body">
          <strong>{{ poi.name }}</strong>
          <small>{{ poi.note }}<template v-if="poi.kind === 'optional'">（可选加项，不计入主线）</template></small>
        </span>
      </li>
    </ol>
    <ul class="day-route-legs" aria-label="今日分段里程">
      <li v-for="leg in legsSummary" :key="leg.id">
        <span class="day-route-leg-chip" :style="{ color: leg.stroke, borderColor: leg.stroke }">{{ leg.icon }}</span>
        <span class="day-route-leg-route">{{ leg.route }}</span>
        <span class="day-route-leg-detail">{{ leg.detail.join(' · ') }}</span>
        <a v-if="leg.href" class="day-route-segment-link" :href="leg.href" target="_blank" rel="noreferrer" :aria-label="`在高德查看 ${leg.route}`">查看此段 ↗</a>
      </li>
    </ul>
      <p class="day-route-map-note">高德点位与分段时间保留查询记录（{{ data.fetchedAt || dayRoutes.fetchedAt }}），执行注释校订于 {{ dayRoutes.annotatedAt }}。图示里程含标出的餐饮与市区短途，往返计两次，出租车另列；正文采用复核后的排程基线，时间与里程可能略有不同。{{ data.geometryNote || '独库虚线是条件自驾估算，不是区间车或放行依据。' }}请分段导航，临行再核通行与开放。</p>
      </div>
    </div>
  </section>
</template>
