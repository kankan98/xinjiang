import assert from 'node:assert/strict'
import { chromium, expect } from '@playwright/test'
import { resolve } from 'node:path'

const browser = await chromium.launch({ channel: 'chrome' })
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })
const page = await context.newPage()
const errors = []
const results = []
page.on('pageerror', (error) => errors.push(error.message))
const base = process.env.ROADBOOK_URL || 'http://localhost:5173'
const checks = [
  ['Day2-布尔津-白哈巴', '不改住宿的减量线', 'D3 只选三湾', 'day2-reduced'],
  ['Day3-白哈巴-喀纳斯全天', '减量而不加住', '车停铁热克提', 'day3-pickup'],
  ['Day7-伊宁-那拉提-唐布拉-尼勒克', '先核翌日回程', '独库已开放也不等于 D8 回程已经成立', 'day7-return'],
  ['Day8-尼勒克-乌鲁木齐', '返程余量与提前出发', '路况不稳、验车需更久或无可用宽限时', 'day8-buffer'],
]
try {
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 1000 })
    for (const [slug, section, expected, name] of checks) {
      await page.goto(`${base}/#/chapter/${encodeURIComponent(slug)}`)
      await expect(page.locator('.chapter-content')).toBeVisible()
      await expect(page.locator('.chapter-content')).toContainText(expected)
      const heading = page.locator(`[id="${section}"]`)
      await expect(heading).toBeVisible()
      await page.locator('.reader-focus__item').first().click()
      await expect(page.locator('#关键时间轴')).toBeFocused()
      await page.evaluate(async () => {
        await document.fonts.ready
        await Promise.all([...document.images].map((img) => img.decode().catch(() => {})))
      })
      await heading.evaluate((el) => scrollTo({ top: el.getBoundingClientRect().top + scrollY - 180, behavior: 'instant' }))
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      assert.ok(overflow <= 1, `${slug} at ${width}: overflow ${overflow}`)
      if ((width === 390 && ['day2-reduced', 'day8-buffer'].includes(name)) || (width === 1280 && name === 'day7-return')) {
        await page.screenshot({ path: resolve(`tools/.cache/followup-${name}-${width}.png`) })
      }
      results.push({ width, day: slug, section, overflow })
    }
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(base)
  await page.getByRole('button', { name: '打开每日速查', exact: true }).click()
  await page.locator('#daily-field-tab-D2').click()
  await expect(page.locator('#daily-field-panel-D2')).toContainText('铁热克提')
  await page.locator('#daily-field-tab-D8').click()
  await expect(page.locator('#daily-field-panel-D8')).toContainText('10-08')
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ results, dailyGuideTabs: ['D2', 'D8'], pageErrors: errors }, null, 2))
} finally {
  await context.close()
  await browser.close()
}
