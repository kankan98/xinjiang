import { readFile } from 'node:fs/promises'
import { test, expect } from '@playwright/test'
import { buildChapterHash } from '../../src/lib/router.js'

const runtime = JSON.parse(await readFile(new URL('../../src/data/roadbook-runtime.json', import.meta.url), 'utf8'))
const schedules = JSON.parse(await readFile(new URL('../../src/generated/day-schedules.generated.json', import.meta.url), 'utf8'))

test('simple guide stays complete offline without JavaScript and preserves source schedules', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  const requests = []
  page.on('request', (request) => requests.push(request.url()))
  await page.goto(new URL('../../dist/simple.html', import.meta.url).href)
  await expect(page.locator('.day-card')).toHaveCount(10)
  expect(requests).toHaveLength(1)
  for (const { file, meta } of runtime.itinerary) {
    const card = page.locator(`#${meta.day}`)
    await expect(card.locator('.stay')).toContainText(meta.stay)
    await expect(card.getByRole('link', { name: `阅读 ${meta.day} 完整攻略 ↗` })).toHaveAttribute('href', `./index.html${buildChapterHash(file)}`)
    await card.locator('summary').first().click()
    const rows = card.locator('.timeline li')
    await expect(rows).toHaveCount(schedules[file].length)
    for (const [index, entry] of schedules[file].entries()) {
      await expect(rows.nth(index).locator('.time')).toHaveText(entry.time)
      await expect(rows.nth(index).locator('div > p').first()).toHaveText(entry.event)
      if (entry.note) await expect(rows.nth(index).locator('.note')).toHaveText(entry.note)
    }
  }
  await expect(page.locator('#D3 .reminder')).toContainText('最迟 16:30 前实际驾车出村')
  await expect(page.locator('#D7 .estimate')).toContainText('非高德完整路线实测')
  await expect(page.locator('#D8 .reminder')).toContainText('17:30 到达不能保证赶上 18:06 火车')
  await expect(page.locator('#D8 .focus')).toContainText('现有导航记录不支持稳妥启用')
  await context.close()
})

test('simple guide fits narrow screens, supports keyboard expansion and prints closed schedules', async ({ page }) => {
  await page.goto('/simple.html')
  const firstSummary = page.locator('#D0 summary').first()
  await firstSummary.focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('#D0 .timeline')).toBeVisible()
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  }
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(page.locator('body')).toHaveCSS('color', 'rgb(242, 241, 233)')
  await page.emulateMedia({ media: 'print' })
  await expect(page.locator('#D8 .timeline')).toBeVisible()
  await expect(page.locator('#D8 .timeline li').last()).toBeVisible()
})

test('full and simple editions link to each other and the correct chapter', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: '简易版速览' }).click()
  await expect(page).toHaveURL(/\/simple\.html$/)
  await page.getByRole('navigation', { name: '按日期跳转' }).getByRole('link', { name: /D8/ }).click()
  await expect(page).toHaveURL(/#D8$/)
  await page.getByRole('link', { name: '阅读 D8 完整攻略 ↗' }).click()
  await expect(page.locator('#readerTitle')).toContainText('Day 8')
})
