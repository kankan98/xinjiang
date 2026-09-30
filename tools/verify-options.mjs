import { chromium } from 'playwright'

const base = 'http://localhost:4173'
const targets = [
  ['Day1-乌鲁木齐-布尔津', '今日可选项：不占新时间，只换晚餐口味'],
  ['Day2-布尔津-白哈巴', '今日可选项：三湾不成时的白哈巴半天'],
  ['Day3-白哈巴-喀纳斯全天', '今日可选项：按分支各取所需'],
  ['Day4-白哈巴-克拉玛依-奎屯', '今日可选项：给最平淡的一天加一点风景'],
  ['Day5-奎屯-赛里木湖', '今日可选项：湖边的轻松加项'],
  ['Day6-赛里木湖-伊宁', '今日可选项：只在写真落空时补位'],
  ['Day7-伊宁-那拉提-唐布拉-尼勒克', '今日可选项：顺路才有，不顺路不要'],
  ['04-来源与复核日志', '2026-09-05 可选项增补记录'],
]

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`) })
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))

let failed = 0
for (const [slug, heading] of targets) {
  await page.goto(`${base}/#/chapter/${encodeURIComponent(slug)}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)
  const found = await page.getByText(heading, { exact: false }).first().isVisible().catch(() => false)
  const h2Count = await page.locator('h2').count()
  const ok = found && h2Count > 3
  if (!ok) failed += 1
  console.log(`${ok ? 'PASS' : 'FAIL'} ${slug} · heading=${found} · h2=${h2Count}`)
}

// 视觉抽查：Day4 与 Day6 的可选项小节
for (const [slug, file] of [['Day4-白哈巴-克拉玛依-奎屯', 'day4-options'], ['Day6-赛里木湖-伊宁', 'day6-options']]) {
  await page.goto(`${base}/#/chapter/${encodeURIComponent(slug)}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)
  await page.getByRole('heading', { name: /今日可选项/ }).first().scrollIntoViewIfNeeded()
  await page.screenshot({ path: `screenshots/${file}.png` })
  console.log('shot', file)
}

console.log(errors.length ? `CONSOLE ERRORS:\n${errors.join('\n')}` : 'no console errors')
console.log(failed === 0 && errors.length === 0 ? 'ALL OK' : `FAILED: ${failed}`)
await browser.close()
process.exit(failed === 0 && errors.length === 0 ? 0 : 1)
