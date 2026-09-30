// 每日真实线路图数据生成器
// 数据源：高德地图（POI 检索与驾车路径规划走 MCP 同一 Key 的 Web 服务 API）
// POI 详情（评分 / 人均 / 营业时间）与距离核验用 node tools/amap-mcp.mjs 走 MCP 工具（maps_search_detail 等）。
// 用法：AMAP_KEY=xxx node tools/generate_day_routes.mjs
//   未设置 AMAP_KEY 时，回退读取 ~/.zcode/cli/config.json 中 amap-maps MCP 的 key。
// 产出：src/data/day-routes.json（每日点位 + 各段真实折线/里程，折线已抽稀）
// 说明：该脚本不在 build 链路中，day-routes.json 随源码提交；路网更新时可手动重跑。

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { annotateDayRoutes } from '../src/data/route-annotations.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'src/data/day-routes.json')
const CACHE = join(ROOT, 'tools/.cache')

function resolveKey() {
  if (process.env.AMAP_KEY) return process.env.AMAP_KEY
  const cfgPath = join(homedir(), '.zcode/cli/config.json')
  if (existsSync(cfgPath)) {
    try {
      const cfg = JSON.parse(readFileSync(cfgPath, 'utf-8'))
      const url = cfg?.mcp?.servers?.['amap-maps-streamableHTTP']?.url
      const key = new URL(url).searchParams.get('key')
      if (key) return key
    } catch { /* fallthrough */ }
  }
  throw new Error('缺少 AMAP_KEY（或无法从 ~/.zcode/cli/config.json 读取高德 Key）')
}

/* ================= 点位清单（坐标全部来自高德 POI/门址检索，2026-09-06 复核） ================= */
// kind: hub 交通枢纽 / stay 住宿 / food 餐饮 / scene 景点观景 / parking 停车 / service 服务区 / optional 可选加项
const DAYS = {
  D0: {
    title: '香港 → 乌鲁木齐：过关、红眼航班与凌晨打车',
    pois: [
      { id: 'szwan', name: '深圳湾口岸', kind: 'hub', note: '14:30 集合 · 15:00 过关打车', lng: 113.948081, lat: 22.496116, pid: 'B02F37UK27' },
      { id: 'hkia', name: '香港国际机场（参考点）', kind: 'hub', note: 'HB862 18:45 起飞（用户 9-29 更新）', lng: 113.920541, lat: 22.309761, pid: 'B073C02XX4' },
      { id: 'urc', name: '乌鲁木齐天山国际机场·北航站区', kind: 'hub', note: '10-03 01:15 落地', lng: 87.481092, lat: 43.917012, pid: 'B03DF0668Z' },
      { id: 'weston', name: '维斯顿国际酒店（乌鲁木齐站北广场店）', kind: 'stay', note: '02:20 前后入住熄灯', lng: 87.535475, lat: 43.843524, pid: 'B0LUB5JASH' },
    ],
    legs: [
      { from: 'szwan', to: 'hkia', mode: 'shuttle', note: '过关后打车赴香港机场（15:00 起 · 16:30 前到）' },
      { from: 'hkia', to: 'urc', mode: 'flight', note: 'HB862 18:45 → 次日 01:15（抵达暂沿原记录待核）' },
      { from: 'urc', to: 'weston', mode: 'drive', note: '凌晨打车约 19 km' },
    ],
  },
  D1: {
    title: '乌鲁木齐 → 布尔津：火车接驳 + 奎屯取车 + 夜駆',
    pois: [
      { id: 'wlmqstn', name: '乌鲁木齐站', kind: 'hub', note: '12:30 火车赴奎屯', lng: 87.528997, lat: 43.840272, pid: 'B0FFFQ2NHY' },
      { id: 'kty', name: '奎屯站', kind: 'hub', note: '14:33 抵站 · 15:30 取车发车', lng: 84.900179, lat: 44.403616, pid: 'B03E700G4W' },
      { id: 'kcwd', name: '奎城味到和田烧烤（团结南街）', kind: 'food', note: '站前简餐 15:20 前收线', lng: 84.901469, lat: 44.417206, pid: 'B0H6PMMFFA' },
      { id: 'bzw', name: '巴扎屋大盘鸡·新疆菜（奎屯乌苏街店）', kind: 'food', note: '巴扎屋晚间 18:30 后才可用 · 距站约 2.4 km', lng: 84.897698, lat: 44.424748, pid: 'B0L03LELGJ' },
      { id: 'qiduo', name: '柒朵轻居酒店（喀纳斯塔桥店）', kind: 'stay', note: '21:30—22:00 入住', lng: 86.877406, lat: 47.702818, pid: 'B0KRLX6MXK' },
      { id: 'mayouyu', name: '马有鱼·馕坑烤全鱼（布尔津店）', kind: 'food', note: '夜抵首选 · 距柒朵约 300 m', lng: 86.874654, lat: 47.705128, pid: 'B0KRFURYHQ' },
    ],
    legs: [
      { from: 'wlmqstn', to: 'kty', mode: 'rail', note: 'C 字头城际 12:30—14:33（约 2 h 03）' },
      { from: 'kty', to: 'kcwd', mode: 'drive', note: '午餐往返' },
      { from: 'kty', to: 'qiduo', mode: 'drive', note: 'G3014 奎阿高速 → G217' },
    ],
  },
  D2: {
    title: '布尔津 → 白哈巴 → 喀纳斯三湾：铁贾公路进山日',
    pois: [
      { id: 'qiduo', name: '柒朵轻居酒店', kind: 'stay', note: '08:40 发车', lng: 86.877406, lat: 47.702818, pid: 'B0KRLX6MXK' },
      { id: 'myl', name: '马依莱牛肉面', kind: 'food', note: '早餐首选 · 24 小时 · 距柒朵约 350 m', lng: 86.874350, lat: 47.700875, pid: 'B0JD9C4JJV' },
      { id: 'jdy', name: '贾登峪', kind: 'scene', note: '10:46 安全区休息 20 min', lng: 87.145955, lat: 48.491663 },
      { id: 'trkt', name: '铁热克提', kind: 'scene', note: '12:17 核准入后继续进山', lng: 86.701153, lat: 48.475301 },
      { id: 'bhbPark', name: '白哈巴村停车场', kind: 'parking', note: '13:05 停车留证', lng: 86.777679, lat: 48.692622, pid: 'B0FFLHQFH3' },
      { id: 'zyd', name: '在云端民宿', kind: 'stay', note: '13:35—14:05 快速入住', lng: 86.781171, lat: 48.683209, pid: 'B0KRDHMBXU' },
      { id: 'bhbYk', name: '白哈巴游客中心', kind: 'hub', note: '14:20 前验票候车', lng: 86.797897, lat: 48.689991, pid: 'B0HRSZQ7M1' },
      { id: 'knsHc', name: '喀纳斯换乘中心', kind: 'hub', note: '15:45 换乘三湾线', lng: 87.030853, lat: 48.693327, pid: 'B0FFHCT6UN' },
      { id: 'sxw', name: '神仙湾观景台', kind: 'scene', note: '16:00—16:35', lng: 87.040752, lat: 48.659120, pid: 'B0HGT476CU' },
      { id: 'ylw', name: '月亮湾观景台', kind: 'scene', note: '16:35—17:35 主机位', lng: 87.050352, lat: 48.634446, pid: 'B0FFLO6XOF' },
      { id: 'wlw', name: '卧龙湾观景台', kind: 'scene', note: '18:35—19:05 硬收线', lng: 87.052825, lat: 48.623523, pid: 'B0FFLIE2RP' },
    ],
    legs: [
      { from: 'qiduo', to: 'jdy', mode: 'drive', note: '121.5 km 段' },
      { from: 'jdy', to: 'trkt', mode: 'drive', note: '铁贾公路 62.1 km（T-1 核通行）' },
      { from: 'trkt', to: 'bhbPark', mode: 'drive', note: '38.4 km 进村段' },
      { from: 'bhbPark', to: 'zyd', mode: 'walk', note: '步行 1.18 km 或民宿接' },
      { from: 'zyd', to: 'bhbYk', mode: 'walk', note: '民宿送游客中心 3.3 km' },
      { from: 'bhbYk', to: 'knsHc', mode: 'shuttle', note: '喀纳斯 3 路 14:30（单程约 75 min）' },
      { from: 'knsHc', to: 'sxw', mode: 'shuttle' },
      { from: 'sxw', to: 'ylw', mode: 'shuttle' },
      { from: 'ylw', to: 'wlw', mode: 'walk', note: '栈道 2.6 km / 35 min' },
      { from: 'wlw', to: 'knsHc', mode: 'shuttle', note: '19:05 返程区间车' },
    ],
  },
  D3: {
    title: '白哈巴 ⇄ 喀纳斯（条件区间车）→ 自驾回布尔津',
    pois: [
      { id: 'zyd', name: '在云端民宿', kind: 'stay', note: '08:30 起床 · 09:15 退房', lng: 86.781171, lat: 48.683209, pid: 'B0KRDHMBXU' },
      { id: 'bhbYk', name: '白哈巴游客中心', kind: 'hub', note: '班次确认后候车', lng: 86.797897, lat: 48.689991, pid: 'B0HRSZQ7M1' },
      { id: 'knsHc', name: '喀纳斯换乘中心（湖岸短线）', kind: 'scene', note: '去程 ≥09:30 · 返程 ≤16:00', lng: 87.030853, lat: 48.693327, pid: 'B0FFHCT6UN' },
      { id: 'bhbPark', name: '白哈巴村停车场', kind: 'parking', note: '约 17:45 取车验车', lng: 86.777679, lat: 48.692622, pid: 'B0FFLHQFH3' },
      { id: 'hongyu', name: '鸿宇福瑞酒店（喀纳斯塔桥店）', kind: 'stay', note: '20:25—21:00 入住', lng: 86.874318, lat: 47.699251, pid: 'B0H2LC4Z23' },
      { id: 'hsyz', name: '侯三鱼庄（夜光城店）', kind: 'food', note: '晚餐首选 · 距酒店 150—200 m', lng: 86.874840, lat: 47.697838, pid: 'B0K60YYLB5' },
      { id: 'bcjy', name: '边城佳宴冷水鱼庄', kind: 'food', note: '晚餐备选 · 同片区', lng: 86.874620, lat: 47.697888, pid: 'B0K6P5Z7V6' },
      { id: 'yhncg', name: '布尔津县一壶奶茶馆', kind: 'food', note: '回城奶茶可选 · 10:00—22:00', lng: 86.878622, lat: 47.704568, pid: 'B0IUM7B5F5' },
    ],
    legs: [
      { from: 'zyd', to: 'bhbYk', mode: 'walk', note: '民宿送站' },
      { from: 'bhbYk', to: 'knsHc', mode: 'shuttle', note: '喀纳斯 3 路往返（官方确认班次）' },
      { from: 'bhbPark', to: 'hongyu', mode: 'drive', note: '原路出山返回布尔津' },
    ],
  },
  D4: {
    title: '布尔津 → 乌尔禾 → 克拉玛依 → 奎屯：G217/G3014 转场',
    pois: [
      { id: 'hongyu', name: '鸿宇福瑞酒店（布尔津）', kind: 'stay', note: '10:00 发车', lng: 86.874318, lat: 47.699251, pid: 'B0H2LC4Z23' },
      { id: 'dyj', name: '单一绝大盘鸡（乌尔禾玉龙广场店）', kind: 'food', note: '13:20—14:10 午餐补油', lng: 85.694388, lat: 46.094333, pid: 'B0FFKTCH8P' },
      { id: 'moguicheng', name: '世界魔鬼城（5A）', kind: 'optional', note: '午后可选加项 · 15:40 前收线', lng: 85.733205, lat: 46.135149, pid: 'B03DE0004L' },
      { id: 'dsx', name: '独山子大峡谷', kind: 'optional', note: '傍晚可选折返加项', lng: 84.758415, lat: 44.149387, pid: 'B0FFG2BGUQ' },
      { id: 'hilton', name: '奎屯希尔顿欢朋酒店', kind: 'stay', note: '16:45—17:30 入住', lng: 84.907354, lat: 44.424241, pid: 'B0LRAHZ4LS' },
    ],
    legs: [
      { from: 'hongyu', to: 'dyj', mode: 'drive', note: 'G217 南下' },
      { from: 'dyj', to: 'hilton', mode: 'drive', note: 'G3014 奎阿高速' },
    ],
  },
  D5: {
    title: '奎屯 → 赛里木湖：G30 西行 + 顺时针环湖登松树头',
    pois: [
      { id: 'hilton', name: '奎屯希尔顿欢朋酒店', kind: 'stay', note: '10:00 发车', lng: 84.907354, lat: 44.424241, pid: 'B0LRAHZ4LS' },
      { id: 'tuotuo', name: '托托服务区', kind: 'service', note: '11:50—12:10 休息换手', lng: 83.559966, lat: 44.540336, pid: 'B0FFHO53DT' },
      { id: 'jinghe', name: '精河服务区', kind: 'service', note: '13:30—14:15 当地午餐时段', lng: 82.795915, lat: 44.564777, pid: 'B038D0LN3J' },
      { id: 'jifeng', name: '季枫国际酒店（赛里木湖景区店）', kind: 'stay', note: '15:45—16:00 到店快速入住', lng: 81.388072, lat: 44.619423, pid: 'B0M6U7RNQ6' },
      { id: 'sst', name: '松树头观景台（西南角）', kind: 'scene', note: '17:15—18:30 登顶俯瞰全湖', lng: 81.142025, lat: 44.504825, pid: 'B0MUCZ0M0C' },
      { id: 'nrl', name: '牛润烈新疆菜（赛里木湖店）', kind: 'food', note: '20:45 当地晚餐时段', lng: 81.389054, lat: 44.618764, pid: 'B0MAHHL4SG' },
    ],
    legs: [
      { from: 'hilton', to: 'jifeng', mode: 'drive', note: 'G30 → 赛湖互通 → S222（途经托托/精河服务区）' },
      { from: 'jifeng', to: 'sst', mode: 'drive', note: '16:20 顺时针环湖约 28.6 km，原路返回', roundTrip: true },
    ],
  },
  D6: {
    title: '赛里木湖逆时针环湖 → 果子沟 → 伊宁：晨光 + 写真日',
    pois: [
      { id: 'jifeng', name: '季枫国际酒店', kind: 'stay', note: '08:30—09:00 退房装车 · 09:00 发车', lng: 81.388072, lat: 44.619423, pid: 'B0M6U7RNQ6' },
      { id: 'beimen', name: '北门游客中心（西北角）', kind: 'hub', note: '约 24 km 北岸晨光段', lng: 81.146420, lat: 44.728084, pid: 'B0FFLJU371' },
      { id: 'xihai', name: '西海草原', kind: 'scene', note: '西岸停留 20—30 min', lng: 80.991672, lat: 44.579831, pid: 'B0FFG6HONC' },
      { id: 'nanmen', name: '南门售票处/停车场', kind: 'hub', note: '12:30 硬收线出湖', lng: 81.147, lat: 44.502, pid: 'B0FFM98MIV' },
      { id: 'gzg', name: '果子沟大桥', kind: 'scene', note: '谷底车观，不设停车点', lng: 81.140191, lat: 44.475984, pid: 'B0FFFDXFBK' },
      { id: 'atour', name: '伊宁解放西路亚朵酒店', kind: 'stay', note: '15:10 入住', lng: 81.296696, lat: 43.939808, pid: 'B0KGM7T2JT' },
      { id: 'wanxia', name: '晚夏摄影（六星街·江苏路180号）', kind: 'scene', note: '17:00—20:00 写真', lng: 81.309862, lat: 43.929375, pid: 'B0KAOS0880' },
    ],
    legs: [
      { from: 'jifeng', to: 'beimen', mode: 'drive', note: '逆时针环湖北岸' },
      { from: 'beimen', to: 'nanmen', mode: 'drive', note: '西岸南下（经西海草原）39.5 km' },
      { from: 'nanmen', to: 'atour', mode: 'drive', note: '312 国道果子沟 → G30 → G3016 → G218' },
      { from: 'atour', to: 'wanxia', mode: 'drive', note: '2.9 km / 约 7 min，拍毕返回' },
    ],
  },
  D7: {
    title: '伊宁 → 那拉提 → 独库公路 → 唐布拉 → 尼勒克：全程最长日',
    pois: [
      { id: 'atour', name: '伊宁解放西路亚朵酒店', kind: 'stay', note: '09:30 发车', lng: 81.296696, lat: 43.939808, pid: 'B0KGM7T2JT' },
      { id: 'nlt', name: '那拉提镇（午餐补油）', kind: 'food', note: '12:45—14:00 · 九十八号拌面', lng: 84.003822, lat: 43.328259, pid: 'B03E70M6LB' },
      { id: 'daban', name: '玉希莫勒盖达坂', kind: 'scene', note: '14:00—15:30 G217 独库段翻越', lng: 84.448249, lat: 43.473098, pid: 'B03E700CXV' },
      { id: 'qem', name: '乔尔玛烈士陵园', kind: 'scene', note: '15:30 短停 15 min 转 S315', lng: 84.358403, lat: 43.652044, pid: 'B03E70M4Z5' },
      { id: 'bll', name: '唐布拉百里画廊', kind: 'scene', note: '16:10—16:40 主路观景短停', lng: 83.919793, lat: 43.718426, pid: 'B0FFLANKAJ' },
      { id: 'akts', name: '阿克塔斯', kind: 'scene', note: '回程择停 10—15 min', lng: 83.859720, lat: 43.718328, pid: 'B03E7009NM' },
      { id: 'lyl', name: '唐布拉国家森林公园', kind: 'scene', note: '回程择停 10—15 min', lng: 83.720523, lat: 43.678158, pid: 'B03E7009NL' },
      { id: 'xiyuan', name: '禧苑汀云民宿（尼勒克滨河路）', kind: 'stay', note: '19:00—19:30 到店', lng: 82.483017, lat: 43.794047, pid: 'B0MA5RPPYR' },
      { id: 'tdh', name: '吐达洪馕坑肉烤包子店', kind: 'food', note: '晚餐首选 · 县政府大门 50 m', lng: 82.510743, lat: 43.800570, pid: 'B0HROCN5ME' },
    ],
    legs: [
      { from: 'atour', to: 'nlt', mode: 'drive', note: 'S12 伊墩高速 → G218（247.3 km）' },
      { from: 'nlt', to: 'daban', mode: 'shuttle', note: 'G217 独库段（官方口径约 60 km / 1.5 h，高德暂不规划）' },
      { from: 'daban', to: 'qem', mode: 'shuttle' },
      { from: 'qem', to: 'bll', mode: 'drive', note: 'S315 西行 40.0 km' },
      { from: 'bll', to: 'xiyuan', mode: 'drive', note: 'S315 → 165 乡道（137.7 km，途经阿克塔斯/森林公园）' },
    ],
  },
  D8: {
    title: '尼勒克 → 奎屯站还车 → 火车 → 钟点房 → 深夜机场',
    pois: [
      { id: 'xiyuan', name: '禧苑汀云民宿', kind: 'stay', note: '10:00 发车', lng: 82.483017, lat: 43.794047, pid: 'B0MA5RPPYR' },
      { id: 'kty', name: '奎屯站（取还车停车场）', kind: 'hub', note: '15:15 前抵站 · 15:15—15:30 还车', lng: 84.900179, lat: 44.403616, pid: 'B03E700G4W' },
      { id: 'kcwd', name: '奎城味到和田烧烤', kind: 'food', note: '15:40—17:20 收官晚餐', lng: 84.901469, lat: 44.417206, pid: 'B0H6PMMFFA' },
      { id: 'wlmqstn', name: '乌鲁木齐站', kind: 'hub', note: '20:07 抵站', lng: 87.528997, lat: 43.840272, pid: 'B0FFFQ2NHY' },
      { id: 'juzi', name: '桔子酒店（乌鲁木齐高铁站店）', kind: 'stay', note: '20:30—23:30 钟点房', lng: 87.520657, lat: 43.837847, pid: 'B0G0U5P2S7' },
      { id: 'urc', name: '乌鲁木齐天山国际机场·北航站区', kind: 'hub', note: '00:10 前后抵 · HX457 02:15 起飞', lng: 87.481092, lat: 43.917012, pid: 'B03DF0668Z' },
    ],
    legs: [
      { from: 'xiyuan', to: 'kty', mode: 'drive', note: 'S315 → G578 → G577 精伊高速 → G30' },
      { from: 'kty', to: 'kcwd', mode: 'drive', note: '晚餐往返' },
      { from: 'kty', to: 'wlmqstn', mode: 'rail', note: '18:06—20:07（约 2 h 01）' },
      { from: 'wlmqstn', to: 'juzi', mode: 'drive', note: '打车约 2 km' },
      { from: 'juzi', to: 'urc', mode: 'drive', note: '23:30 出发赴机场约 20.1 km' },
    ],
  },
  D9: {
    title: '乌鲁木齐 → 香港 → 深圳湾：红眼航班与口岸收束',
    pois: [
      { id: 'juzi', name: '桔子酒店（高铁站店）', kind: 'stay', note: '23:30 退房出发', lng: 87.520657, lat: 43.837847, pid: 'B0G0U5P2S7' },
      { id: 'urc', name: '乌鲁木齐天山国际机场·北航站区', kind: 'hub', note: '00:10 值机 · 02:15 起飞', lng: 87.481092, lat: 43.917012, pid: 'B03DF0668Z' },
      { id: 'hkia', name: '香港国际机场 T1', kind: 'hub', note: '07:30 抵港', lng: 113.920541, lat: 22.309761, pid: 'B073C02XX4' },
      { id: 'szwan', name: '深圳湾口岸', kind: 'hub', note: 'T2 L3 官方跨境巴士返深', lng: 113.948081, lat: 22.496116, pid: 'B02F37UK27' },
    ],
    legs: [
      { from: 'juzi', to: 'urc', mode: 'drive', note: '凌晨打车约 20.1 km' },
      { from: 'urc', to: 'hkia', mode: 'flight', note: 'HX457 02:15 → 07:30（约 5 h 15）' },
      { from: 'hkia', to: 'szwan', mode: 'bus', note: '官方跨境巴士经深圳湾口岸' },
    ],
  },
}

/* ================= 高德驾车路径规划（真实路线几何） ================= */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function fetchDriveLeg(origin, destination, cacheName) {
  mkdirSync(CACHE, { recursive: true })
  const cacheFile = join(CACHE, `${cacheName}.json`)
  if (existsSync(cacheFile)) {
    const cached = JSON.parse(readFileSync(cacheFile, 'utf-8'))
    if (cached.status === '1') return cached
  }
  const key = resolveKey()
  const url = `https://restapi.amap.com/v3/direction/driving?origin=${origin}&destination=${destination}&key=${key}&extensions=base&strategy=0`
  // 个人开发者 Key 有 QPS 限制：串行请求 + 限流退避
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}：${cacheName}`)
    const data = await res.json()
    if (data.status === '1') {
      writeFileSync(cacheFile, JSON.stringify(data))
      await sleep(500)
      return data
    }
    if (data.info === 'CUQPS_HAS_EXCEEDED_THE_LIMIT' && attempt <= 6) {
      await sleep(1200 * attempt)
      continue
    }
    throw new Error(`高德路径规划失败（${cacheName}）：${data.info}`)
  }
}

// Douglas–Peucker 抽稀（墨卡托米制），并限制单段点数上限
function simplify(points, toleranceM = 80, maxPoints = 500) {
  const R = 6378137
  const rad = Math.PI / 180
  const toXY = ([lng, lat]) => [R * lng * rad, R * Math.log(Math.tan(Math.PI / 4 + lat * rad / 2))]
  const dp = (pts, tol) => {
    if (pts.length <= 2) return pts
    const [ax, ay] = toXY(pts[0])
    const [bx, by] = toXY(pts[pts.length - 1])
    const dx = bx - ax
    const dy = by - ay
    const norm = Math.hypot(dx, dy) || 1
    let maxDist = -1
    let index = 0
    for (let i = 1; i < pts.length - 1; i++) {
      const [px, py] = toXY(pts[i])
      const dist = Math.abs(dy * (px - ax) - dx * (py - ay)) / norm
      if (dist > maxDist) { maxDist = dist; index = i }
    }
    if (maxDist <= tol) return [pts[0], pts[pts.length - 1]]
    const left = dp(pts.slice(0, index + 1), tol)
    const right = dp(pts.slice(index), tol)
    return [...left.slice(0, -1), ...right]
  }
  let tol = toleranceM
  let out = dp(points, tol)
  while (out.length > maxPoints) {
    tol *= 1.6
    out = dp(points, tol)
  }
  return out.map(([lng, lat]) => [Number(lng.toFixed(5)), Number(lat.toFixed(5))])
}

function parseLeg(raw) {
  const path = raw.route.paths[0]
  const points = []
  for (const step of path.steps) {
    for (const pair of step.polyline.split(';')) {
      const [lng, lat] = pair.split(',').map(Number)
      if (Number.isFinite(lng) && Number.isFinite(lat)) {
        const last = points[points.length - 1]
        if (!last || last[0] !== lng || last[1] !== lat) points.push([lng, lat])
      }
    }
  }
  const roads = []
  for (const step of path.steps) {
    for (const m of step.instruction.matchAll(/([GSX]\d{1,4})/g)) {
      if (!roads.includes(m[1])) roads.push(m[1])
    }
  }
  return {
    distanceM: Number(path.distance),
    durationS: Number(path.duration),
    points: simplify(points),
    roads: roads.slice(0, 6),
  }
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  return h ? `${h} h ${String(m).padStart(2, '0')} min` : `${m} min`
}

/* ================= 组装输出 ================= */
const fetchedAt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date())
const days = {}

for (const [day, spec] of Object.entries(DAYS)) {
  const legs = []
  for (const [index, leg] of spec.legs.entries()) {
    const from = spec.pois.find((p) => p.id === leg.from)
    const to = spec.pois.find((p) => p.id === leg.to)
    if (!from || !to) throw new Error(`${day} 段 ${index} 引用了不存在的点位`)
    const base = {
      from: leg.from,
      to: leg.to,
      mode: leg.mode,
      note: leg.note || '',
      roundTrip: Boolean(leg.roundTrip),
    }
    if (leg.mode === 'drive') {
      const raw = await fetchDriveLeg(`${from.lng},${from.lat}`, `${to.lng},${to.lat}`, `${day}-${index}-${leg.from}-${leg.to}`)
      const parsed = parseLeg(raw)
      legs.push({
        ...base,
        km: Number((parsed.distanceM / 1000).toFixed(1)),
        time: formatDuration(parsed.durationS),
        roads: parsed.roads,
        points: parsed.points,
        source: 'amap-driving',
      })
    } else {
      legs.push({ ...base, points: [[from.lng, from.lat], [to.lng, to.lat]], source: 'schematic' })
    }
  }
  days[day] = {
    title: spec.title,
    pois: spec.pois.map((p, index) => ({ ...p, no: index + 1 })),
    legs,
  }
  const driveKm = legs.filter((l) => l.mode === 'drive').reduce((sum, l) => sum + l.km, 0)
  console.log(`${day}: ${spec.pois.length} 个点位，${legs.length} 段（驾车 ${driveKm.toFixed(1)} km）`)
}

writeFileSync(OUT, JSON.stringify(annotateDayRoutes({ schemaVersion: 1, generatedAt: fetchedAt, fetchedAt: '各段原查询见缓存与来源日志', source: '高德地图（POI + 驾车路径规划）', days }), null, 1))
console.log(`生成完成：${OUT}`)
