import fullReviewRoutes from './route-review-20260930.json' with { type: 'json' }
import septemberAdjustment from './route-adjustment-20260930.json' with { type: 'json' }
// 行程注释单独维护，保留高德原始折线与原查询日期。
// 同一处理同时供页面和再生成器使用；重复应用不会重复添加路段。
export function annotateDayRoutes(raw) {
  const result = { ...raw, annotatedAt: '2026-09-30', days: Object.fromEntries(Object.entries(raw.days).map(([day, value]) => [day, { ...value, pois: value.pois.map((poi) => ({ ...poi })), legs: value.legs.map((leg) => ({ ...leg })) }])) }
  const findPoi = (day, id) => result.days[day].pois.find((poi) => poi.id === id)
  const findLeg = (day, from, to) => result.days[day].legs.find((leg) => leg.from === from && leg.to === to)
  const note = (day, id, value) => { const poi = findPoi(day, id); if (poi) poi.note = value }
  const mode = (day, from, to, value, extra = {}) => { const leg = findLeg(day, from, to); if (leg) Object.assign(leg, { mode: value, ...extra }) }

  for (const day of ['D0', 'D9']) {
    const airport = findPoi(day, 'hkia')
    if (airport) airport.name = '香港国际机场（参考点）'
  }
  note('D0', 'weston', '约02:20入住，洗漱充电后约02:45熄灯')
  note('D0', 'szwan', '14:30 集合 · 15:00 起过关 · 四个24寸箱 · 港方现场找大尾箱／即时叫车')
  note('D0', 'hkia', '16:30 前到 T2 离境层，7 楼 Q 行段值机；HB862 18:45 → 次日 01:15（官网计划）')
  mode('D0', 'hkia', 'urc', 'flight', { note: 'HB862 18:45 → 次日 01:15，计划 6 h 30 min（9-29 核官网10-02班期）；实际客票和动态另核' })
  mode('D0', 'szwan', 'hkia', 'taxi', { note: '港方的士站找一辆大尾箱，或即时叫PRIME／MPT，承载四人四个24寸箱；15:00 起过关、16:30 前到 T2 目标' })
  mode('D0', 'urc', 'weston', 'taxi')
  note('D1', 'wlmqstn', '11:00 起床 · 12:00 前进站 · 12:30 发车')
  note('D1', 'kty', '14:33 抵站 · 15:30 取车 · 预留 30 min 验车')
  note('D1', 'kcwd', '吃法二：16:00—16:45取车后正餐，额外市区驾驶另计；不是取车前简餐点')
  note('D1', 'bzw', '巴扎屋晚间 18:30 后才可用 · 距站约 2.4 km')
  note('D2', 'myl', '早餐首选 · 24 小时 · 距柒朵步行约 400 m')
  note('D3', 'yhncg', '回城奶茶可选 · 10:00—22:00 · 距鸿宇福瑞步行约 870 m')
  note('D1', 'qiduo', '22:00—22:45 计划入住，延误先联系保房')
  note('D1', 'mayouyu', '夜抵首选 · 距柒朵步行约 450 m；超过 23:00 改简餐或路餐')
  // 取车前只吃站前步行圈简餐；正规餐厅仅作取车后可选分支。
  result.days.D1.legs = result.days.D1.legs.filter((leg) => !(leg.from === 'kty' && leg.to === 'kcwd'))
  for (const id of ['kcwd', 'bzw']) { const p = findPoi('D1', id); if (p) p.kind = 'optional' }
  // 9 月 29 日主选：D2 直达白哈巴、观鱼台；D3 三湾后提前出山。
  // 保留原查询文件；直达线只用已知端点画示意，不伪装成新查到的道路折线。
  const bayIds = ['sxw', 'ylw', 'wlw']
  const bays = bayIds.map((id) => findPoi('D3', id) || findPoi('D2', id)).filter(Boolean).map((poi) => ({ ...poi }))
  const d2 = result.days.D2
  d2.title = '主选：布尔津直达白哈巴 → 喀纳斯观鱼台 → 20:00 末班返白哈巴（备选 10:00 起床、14:00 到村留白哈巴）'
  d2.pois = d2.pois.filter((poi) => !['jdy', ...bayIds].includes(poi.id)).map((poi, index) => ({ ...poi, no: index + 1 }))
  d2.legs = d2.legs.filter((leg) => !['drive', 'estimated-drive'].includes(leg.mode) && !['jdy', 'trkt', ...bayIds].includes(leg.from) && !['jdy', 'trkt', ...bayIds].includes(leg.to))
  d2.legs.unshift({ from: 'qiduo', to: 'bhbPark', mode: 'estimated-drive', km: 140.8, time: '约 2.5—3 h', note: 'S232／219 国道铁热克提方向直达；140.8 km / 2 h 37 min 沿用 9-06 记录，折线仅示意，准入另核', roundTrip: false, source: 'planning-estimate', points: ['qiduo', 'trkt', 'bhbPark'].map((id) => { const p = findPoi('D2', id); return [p.lng, p.lat] }) })
  note('D2', 'qiduo', '08:00 起床 · 约 08:40 从布尔津直达白哈巴')
  note('D2', 'trkt', '主选直达线方向 · 指定检查入口与准入临行核对')
  note('D2', 'bhbPark', '约 11:30—12:00 到村 · 车停民宿或新村停车场附近；具体停车点另核')
  note('D2', 'zyd', '12:00 入住目标 · 12:30 出门乘村内 2 号线')
  note('D2', 'bhbYk', '村内 2 号线到达后换乘前往喀纳斯')
  note('D2', 'knsHc', '下午换观鱼台专线 · 20:00 末班返白哈巴；地图只标换乘中心，未定位观鱼台')
  mode('D2', 'bhbPark', 'zyd', 'transfer', { note: '按实际停车点步行或接驳至民宿；若停民宿附近可直接卸行李，新村坐标未精确核验' })
  mode('D2', 'zyd', 'bhbYk', 'bus', { roundTrip: true, note: '12:30 从民宿出发，步行至就近 2 号线站点；末班返村后的公交或民宿接驳另核' })
  mode('D2', 'bhbYk', 'knsHc', 'shuttle', { note: '白哈巴 → 喀纳斯坐右侧赏景；单程约 75 min，去程衔接另核；双向末班 20:00（用户 9-29 补充）' })
  const outbound = findLeg('D2', 'bhbYk', 'knsHc')
  if (outbound && !findLeg('D2', 'knsHc', 'bhbYk')) d2.legs.push({ from: 'knsHc', to: 'bhbYk', mode: 'shuttle', roundTrip: false, source: 'schematic', points: [...outbound.points].reverse() })
  mode('D2', 'knsHc', 'bhbYk', 'shuttle', { note: '19:30前候车，20:00末班夜间返白哈巴；白天此方向坐左侧赏景，约21:15抵游客中心，村内接驳另核' })

  const d3 = result.days.D3
  d3.title = '主选：神仙湾乘车 → 月亮湾徒步 → 卧龙湾 → 白哈巴 → 16:30 前出发去布尔津；16:00 前返村可选铁贾公路（备选三湾＋观鱼台，续住白哈巴）'
  for (const poi of bays) if (!findPoi('D3', poi.id)) d3.pois.splice(d3.pois.findIndex((p) => p.id === 'bhbPark'), 0, poi)
  d3.pois = d3.pois.map((poi, index) => ({ ...poi, no: index + 1 }))
  findPoi('D3', 'knsHc').name = '喀纳斯换乘中心（三湾换乘）'
  const addSchematic = (from, to, mode, note) => {
    if (!findLeg('D3', from, to)) d3.legs.push({ from, to, mode, note, roundTrip: false, source: 'schematic', points: [from, to].map((id) => { const p = findPoi('D3', id); return [p.lng, p.lat] }) })
  }
  addSchematic('knsHc', 'sxw', 'shuttle', '10:00 前抵喀纳斯游客服务中心后，换乘去神仙湾的区间车')
  mode('D3', 'knsHc', 'sxw', 'shuttle', { note: '10:00 前抵喀纳斯游客服务中心后，换乘去神仙湾的区间车' })
  addSchematic('sxw', 'ylw', 'shuttle', '神仙湾游览后乘区间车到月亮湾')
  mode('D3', 'sxw', 'ylw', 'shuttle', { note: '神仙湾游览后乘区间车到月亮湾' })
  addSchematic('ylw', 'wlw', 'walk', '月亮湾沿开放栈道徒步到卧龙湾，约 2.6 km，步行拍照留约 60 min；关闭、湿滑或时间不足时才改乘车')
  mode('D3', 'ylw', 'wlw', 'walk', { note: '月亮湾沿开放栈道徒步到卧龙湾，约 2.6 km，步行拍照留约 60 min；关闭、湿滑或时间不足时才改乘车' })
  addSchematic('wlw', 'knsHc', 'shuttle', '按实际回程班次提前返回，至少留 30 min 候车')
  addSchematic('bhbYk', 'bhbPark', 'transfer', '15:45 返村目标；车近直接取车，车远回民宿取行李装车，约 45 min 为计划缓冲，车远按实际耗时提前返程')
  mode('D3', 'bhbYk', 'bhbPark', 'transfer', { note: '15:45 抵白哈巴游客中心目标；车近直接接驳取车，车远先回民宿取行李装车。约 45 min 仅计划缓冲，按实际耗时提前返程，最迟 16:30 前实际发车不后移' })
  note('D3', 'zyd', '原定 07:30 起床 · 先收拾行李退房，车近装车、车远寄存民宿，再到新村乘 08:00 村内 2 路；时间不足须早起')
  note('D3', 'bhbYk', '08:30 乘白哈巴 → 喀纳斯接驳车（用户 9-30 提供）')
  note('D3', 'knsHc', '10:00 前抵达目标 · 换乘区间车去神仙湾；回程按 15:45 抵白哈巴倒推，发车不晚于约 14:30')
  note('D3', 'sxw', '从喀纳斯游客服务中心乘区间车抵达 · 三湾首站短停')
  note('D3', 'ylw', '神仙湾乘区间车到达 · 观景后徒步约 2.6 km 至卧龙湾')
  note('D3', 'wlw', '观景后按回程班次提前收线')
  note('D3', 'bhbPark', '早上退房，车近装行李、车远寄存民宿；下午车远须先取行李装车，按耗时提前返程 · 最迟 16:30 前实际出发')
  note('D3', 'hongyu', '16:30出村、原路直返并完整休20min时约19:15—19:45到店；不能保证全程日光')
  note('D3', 'hsyz', '主选回布尔津晚餐 · 备选留白哈巴用餐')
  note('D3', 'bcjy', '主选晚餐备选 · 与首选同片区')
  mode('D3', 'zyd', 'bhbYk', 'bus', { note: '原定 07:30 起床，先收拾行李退房，车近到停车点装车、车远寄存民宿，再到新村停车场（2 路起点站）乘 08:00 首班至白哈巴游客服务中心；时间不足须早起，新村上车点尚未精确定位，折线为接驳示意' })
  mode('D3', 'bhbYk', 'knsHc', 'shuttle', { roundTrip: true, note: '08:30 白哈巴游客服务中心发车，10:00 前抵喀纳斯目标；去程坐右侧，返程坐左侧；主选 15:45 抵村，约 14:30 为倒推发车上限；双向末班 20:00，续住备选 19:30 前候车' })
  // 铁贾是互斥返程选线，仅以已知端点画示意；不把未核同向距离加入主线合计。
  for (const id of ['trkt', 'jdy']) {
    const poi = raw.days.D2.pois.find((item) => item.id === id)
    if (poi && !findPoi('D3', id)) d3.pois.push({ ...poi, kind: 'hub', note: '铁贾公路可选返程途经点；16:00前返村且16:30前能实际出发时评估' })
  }
  addSchematic('bhbPark', 'trkt', 'estimated-drive', '可选铁贾返程：先到铁热克提；全线公里与ETA另核')
  addSchematic('trkt', 'jdy', 'estimated-drive', '可选铁贾公路到贾登峪；当日放行与天气另核')
  addSchematic('jdy', 'hongyu', 'estimated-drive', '可选贾登峪至布尔津；不套用原路直返的140.4km与到店窗口')
  for (const [from, to] of [['bhbPark', 'trkt'], ['trkt', 'jdy'], ['jdy', 'hongyu']]) {
    mode('D3', from, to, 'estimated-drive', { optional: true, navigation: false })
  }
  d3.pois = d3.pois.map((poi, index) => ({ ...poi, no: index + 1 }))
  result.days.D4.pois = result.days.D4.pois.filter((poi) => poi.kind !== 'optional').map((poi, index) => ({ ...poi, no: index + 1 }))
  const lakeLeg = findLeg('D5', 'jifeng', 'sst')
  if (lakeLeg) lakeLeg.note = '约 29.3 km 单程、58.6 km 往返；16:20 前准备好才走，18:30 下撤'
  mode('D6', 'atour', 'wanxia', 'drive', { roundTrip: true })
  note('D5', 'sst', '条件短途；18:30 前回停车场，时间不足走半程')
  note('D6', 'nanmen', '争取 12:15 出湖，12:30 为最晚边界')
  note('D6', 'atour', '15:10—15:40 入住；交通延误就缩短午餐等候')

  mode('D9', 'juzi', 'urc', 'taxi', { note: '10-10 23:30 至 10-11 00:15，承接 D8 的同一趟机场出租车，不重复计费' })
  note('D9', 'juzi', '承接前晚 23:30 退房赴机场')
  note('D9', 'urc', '10 月 11 日约 00:15 抵航站楼；HX457 02:15 起飞')
  note('D9', 'szwan', '按机场当日指引选官方跨境巴士；预留入境取行李时间')
  for (const day of ['D7', 'D8']) result.days[day] = JSON.parse(JSON.stringify(septemberAdjustment.days[day]))
  result.days.D4 = JSON.parse(JSON.stringify(fullReviewRoutes.days.D4))
  // 查询值和排程值分开标注：保留原查询时间，按正式正文采用排程时间。
  const plannedTimes = [['D1', 'kty', 'qiduo', '5 h 21 min'], ['D3', 'bhbPark', 'hongyu', '2 h 26 min'], ['D6', 'jifeng', 'beimen', '32 min'], ['D6', 'beimen', 'nanmen', '53 min'], ['D6', 'nanmen', 'atour', '1 h 38 min']]
  for (const [day, from, to, plannedTime] of plannedTimes) { const l = findLeg(day, from, to); if (l) l.plannedTime = plannedTime }
  note('D5', 'jifeng', '15:45—16:05目标到店，16:20前准备好才走松树头')
  note('D8', 'juzi', '20:30争取入住、23:30退房；两间三小时¥198，计时待核')
  note('D8', 'urc', '次日约00:15到正确航站楼；HX457次日02:15')
  // 机场中心只作参考，不能向用户提供一条落在旧T1参考点的T2下客导航。
  mode('D0', 'szwan', 'hkia', 'taxi', { navigation: false, note: '四个24寸箱现场找一辆大尾箱／即时叫车；现场车走红绿的士站，即时订单按司机定位；15:00起过关，15:30未发车则16:30到T2目标有风险；参考点非下客口' })
  return result
}
