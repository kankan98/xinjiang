// 2026-09-30 D7改汉庭：用户回填两间高级大床房¥294.22已订；其余金额保留各自回填日期。
// 全部为人民币、两间房合计；金额不代表新增预订或已付款。
// 用分记录房价，备选只替换同一晚，不与原房重复相加。
export const overnightStays = Object.freeze([
  { day: 'D0', date: '10-02', name: '维斯顿国际酒店（乌鲁木齐站北广场店）', cents: 49000 },
  { day: 'D1', date: '10-03', name: '柒朵轻居酒店（喀纳斯塔桥店）', cents: 95600 },
  { day: 'D2', date: '10-04', name: '在云端民宿', cents: 176000 },
  { day: 'D3', date: '10-05', name: '布尔津鸿宇福瑞酒店（喀纳斯塔桥店）', cents: 59760 },
  { day: 'D4', date: '10-06', name: '奎屯希尔顿欢朋', cents: 51800 },
  { day: 'D5', date: '10-07', name: '季枫国际酒店（赛里木湖景区店）', cents: 67053 },
  { day: 'D6', date: '10-08', name: '伊宁上海城解放西路亚朵酒店', cents: 59157 },
  { day: 'D7', date: '10-09', name: '汉庭酒店（新源天鹅湖店）', cents: 29422 },
])

export const shortStay = Object.freeze({
  date: '10-10', name: '桔子酒店（乌鲁木齐高铁站店）',
  rooms: 2, start: '20:30', end: '23:30', hours: 3, cents: 19800,
  status: '价格已回填，预订状态待确认',
})

export const stayAlternatives = Object.freeze([
  {
    id: 'jinghe', day: 'D4', dateLabel: '10 月 6 日',
    name: '季枫国际酒店（精河乌伊路店）', cents: 36000, rooms: '2 间优享智能大床房',
    primaryName: '奎屯希尔顿欢朋', primaryCents: 51800,
    note: '多赶一段路，换次日更早到赛湖。布尔津至候选门店约 631 km / 7 h 18 min；建议D4 09:00发车，按直接去精河、服务区午餐分支执行；不套乌尔禾餐厅主线，改进店须重算全线。先核退改与门店名称。',
    file: 'Day4-白哈巴-克拉玛依-奎屯.md', section: '精河住宿备选',
  },
])

// 10-09 另有一张已订的备用房：伊宁上海城解放西路亚朵（雅致大床房，两间 ¥560.5，10-09 入住、10-10 退房）。
// 这些旧D7订单退出当前路线，仅保留退改责任，不能直接替换汉庭并沿用D8时间。
export const reserveStays = Object.freeze([
  { day: 'D7', date: '10-09', name: '尼勒克禧苑汀云民宿', cents: 55300, status: '退出当前主线，退改待核' },
  { day: 'D7', date: '10-09', name: '云舒·小院休闲美宿（蜜蜂小镇店）', cents: 52200, status: '退出当前主线，退改待核' },
  { day: 'D7', date: '10-09', name: '伊宁上海城解放西路亚朵酒店', cents: 56050, rooms: '2 间雅致大床房', status: '已订备用，不替换主选' },
])

export function normalizeStayChoices(value) {
  const input = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  return Object.fromEntries(stayAlternatives.map((option) => [
    option.day, input[option.day] === option.id ? option.id : 'primary',
  ]))
}

export function calculateStayPlan(value) {
  const choices = normalizeStayChoices(value)
  const baselineCents = overnightStays.reduce((sum, stay) => sum + stay.cents, 0)
  const selected = stayAlternatives.filter((option) => choices[option.day] === option.id)
  const savingsCents = selected.reduce((sum, option) => sum + option.primaryCents - option.cents, 0)
  return { choices, selected, total: (baselineCents - savingsCents) / 100, savings: savingsCents / 100 }
}
