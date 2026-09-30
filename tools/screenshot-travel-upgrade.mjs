import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'

const base = process.env.ROADBOOK_PREVIEW_URL || 'http://127.0.0.1:5173'
const output = 'screenshots/content-upgrade'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const results = []

async function capture(name, file, section, width, theme = 'light', compare = false) {
  const context = await browser.newContext({ viewport: { width, height: 940 }, reducedMotion: 'reduce' })
  await context.addInitScript((value) => localStorage.setItem('roadbook:theme', value), theme)
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  const route = file ? `/#/chapter/${encodeURIComponent(file.replace(/\.md$/, ''))}?section=${encodeURIComponent(section)}` : '/'
  await page.goto(`${base}${route}`, { waitUntil: 'networkidle' })
  if (compare) {
    await page.getByLabel('10 月 6 日住宿方案').selectOption('jinghe')
    await page.getByLabel('10 月 9 日住宿方案').selectOption('yunshu')
  }
  await page.locator(`[id="${section}"]`).waitFor({ state: 'visible' })
  await page.evaluate(() => document.fonts.ready)
  await page.locator(`[id="${section}"]`).evaluate((element) => element.scrollIntoView({ block: 'start' }))
  await page.screenshot({ path: `${output}/${name}.png`, animations: 'disabled' })
  if (name === 'budget-desktop') await page.locator('#tripBudget').screenshot({ path: `${output}/budget-full.png`, animations: 'disabled' })
  const size = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }))
  const result = { name, width, theme, ...size, errors }
  results.push(result)
  if (size.content > size.viewport + 1 || errors.length) throw new Error(JSON.stringify(result))
  await context.close()
}

try {
  await capture('budget-desktop', null, 'tripBudget', 1440)
  await capture('budget-both-mobile', null, 'stayComparisonTitle', 390, 'light', true)
  await capture('hotel-options-desktop', '专题-酒店指南.md', '两家住宿备选', 1440)
  await capture('jinghe-mobile', 'Day4-白哈巴-克拉玛依-奎屯.md', '精河住宿备选', 320)
  await capture('yunshu-dark', 'Day7-伊宁-那拉提-唐布拉-尼勒克.md', '蜜蜂小镇住宿备选', 960, 'dark')
  await capture('flight-mobile', 'Day0-香港-乌鲁木齐.md', '关键时间轴', 390)
  await capture('experience-desktop', '02-路线推导.md', '把风景看细', 1440)
  await writeFile(`${output}/verification.json`, `${JSON.stringify(results, null, 2)}\n`)
  console.log(JSON.stringify(results, null, 2))
} finally {
  await browser.close()
}
