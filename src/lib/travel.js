import { shortStay } from '../data/accommodation.js'

export function scrollToSection(id) {
  const target = document.getElementById(id)
  if (!target) return
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
  target.setAttribute('tabindex', '-1')
  target.focus({ preventScroll: true })
}

// 仅移动横向轨道；scrollIntoView 会把章节标题或整页一并带离当前位置。
export function revealInHorizontalScroll(container, item) {
  if (!container || !item) return
  const bounds = container.getBoundingClientRect()
  const target = item.getBoundingClientRect()
  const inset = Math.min(12, Math.max(0, (bounds.width - target.width) / 2))
  let offset = 0
  if (target.left < bounds.left + inset) offset = target.left - bounds.left - inset
  else if (target.right > bounds.right - inset) offset = target.right - bounds.right + inset
  if (offset) container.scrollTo({ left: container.scrollLeft + offset, behavior: 'instant' })
}

export function plannedDrivingKm(legs) {
  return legs.reduce((total, leg) => {
    if (!['drive', 'estimated-drive'].includes(leg.mode)) return total
    const km = Number(leg.km)
    return total + (Number.isFinite(km) && km >= 0 ? km * (leg.roundTrip ? 2 : 1) : 0)
  }, 0)
}

// URLSearchParams 负责唯一一次编码，避免中文名称被二次转义。
export function navigationUrl(from, to) {
  if (!from || !to) return ''
  const point = (poi) => `${poi.lng},${poi.lat},${poi.name}`
  return `https://uri.amap.com/navigation?${new URLSearchParams({ from: point(from), to: point(to), mode: 'car', coordinate: 'gaode', callnative: '0' })}`
}

export const budgetDefaults = Object.freeze({
  rental: 4489, rail: '', tickets: '', room: shortStay.cents / 100, transfers: '', extras: '',
  mealPerPersonDay: 120, energyTotal: 1500,
})

export const budgetFields = Object.freeze([
  { key: 'rental', label: '原7天租车与保险（延期另计）' },
  { key: 'rail', label: '4 人两程火车票' },
  { key: 'tickets', label: '全员景区票与景交' },
  { key: 'room', label: '两间钟点房' },
  { key: 'transfers', label: '境内出租车等接驳' },
  { key: 'extras', label: '写真、收费道路、停车与退改等' },
])

// 旧版按里程估算油电；保留用户改过的估算总额，未改过的旧默认采用新回填值。
const legacyEnergyDefaults = { drivingKm: 2574, litersPer100Km: 6.6, fuelPrice: 8.5 }
function savedEnergyTotal(input) {
  const values = Object.entries(legacyEnergyDefaults).map(([key, fallback]) => {
    const raw = input[key]
    const number = typeof raw === 'number' || (typeof raw === 'string' && raw.trim()) ? Number(raw) : NaN
    return Number.isFinite(number) && number >= 0 && number <= 1000000 ? number : fallback
  })
  if (values.every((value, index) => value === Object.values(legacyEnergyDefaults)[index])) return budgetDefaults.energyTotal
  const [km, liters, price] = values
  const total = Math.round(km * liters / 100 * price * 100) / 100
  return Number.isFinite(total) && total <= 1000000 ? total : budgetDefaults.energyTotal
}

export function normalizeBudget(value) {
  const input = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  return Object.fromEntries(Object.entries(budgetDefaults).map(([key, fallback]) => {
    if (key === 'energyTotal' && !Object.hasOwn(input, key)) return [key, savedEnergyTotal(input)]
    const raw = input[key]
    if ((typeof raw !== 'number' && typeof raw !== 'string') || String(raw).trim() === '') return [key, fallback]
    const number = Number(raw)
    return [key, Number.isFinite(number) && number >= 0 && number <= 1000000 ? number : fallback]
  }))
}

export function calculateBudget(values, profile) {
  const data = normalizeBudget(values)
  const known = profile.flights + profile.hotels
  const meals = data.mealPerPersonDay * profile.people * profile.days
  const energy = data.energyTotal
  const entered = budgetFields.reduce((total, field) => total + Number(data[field.key] || 0), 0)
  const missing = budgetFields.filter((field) => data[field.key] === '').map((field) => field.label)
  const total = known + meals + energy + entered
  const room = Number(data.room || 0)
  return { known, room, fixed: known + room, meals, energy, entered, missing, total, perPerson: total / profile.people }
}
