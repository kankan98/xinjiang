
import { chromium } from 'playwright'
const base = 'http://localhost:4173'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })
await page.goto(base + '/#/chapter/专题-无人机飞行规范', { waitUntil: 'networkidle' })
await page.waitForTimeout(600)
const internal = await page.locator('.chapter-content a[data-doc]').evaluateAll((els) => els.map((e) => ({ doc: e.getAttribute('data-doc'), section: e.getAttribute('data-section'), text: e.textContent.trim().slice(0, 24) })))
// click each internal link and confirm it lands on the right chapter
const landed = []
for (const link of internal) {
  await page.locator('.chapter-content a[data-doc]').filter({ hasText: link.text }).first().click()
  await page.waitForTimeout(700)
  landed.push({ target: link.doc, url: decodeURIComponent(page.url().split('#')[1] || ''), heading: (await page.locator('.chapter-content h2, .chapter-content h3').first().textContent().catch(() => '')).slice(0, 40) })
  await page.goBack()
  await page.waitForTimeout(500)
  await page.goto(base + '/#/chapter/专题-无人机飞行规范', { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
}
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
console.log(JSON.stringify({ internalLinkCount: internal.length, internal, landed, overflow, errors }, null, 2))
await browser.close()
