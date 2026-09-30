import { chromium } from 'playwright'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const base = 'http://127.0.0.1:5173'
const browser = await chromium.launch({ headless: true })

async function collectErrors(page) {
  const errors = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`)
  })
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))
  return errors
}

const results = []

async function check(name, condition, detail = '') {
  results.push({ name, ok: Boolean(condition), detail })
  console.log(`${condition ? 'PASS' : 'FAIL'} ${name}${detail ? ` · ${detail}` : ''}`)
}

// Desktop home
const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 })
const desktopErrors = await collectErrors(desktop)
await desktop.goto(base + '/', { waitUntil: 'networkidle' })
await desktop.waitForTimeout(900)
await check('home hero media renders', await desktop.locator('.hero-media img').count() === 1)
await check('home route map image renders', await desktop.locator('.geo-map__image').count() === 1)
await check('route map preview is keyboard operable', await desktop.locator('button.geo-map__preview').count() === 1)
await check('home source chips render', await desktop.locator('.source-chip').count() >= 2)
await check('evidence meta renders', await desktop.locator('.intelligence-evidence').count() === 1)
await check('home itinerary ledger renders', await desktop.locator('.itin-cell').count() === 10)

await desktop.locator('.itin-cell').nth(1).click()
await desktop.waitForTimeout(700)
await check('itinerary cell navigates to chapter', desktop.url().includes('/#/chapter/'), desktop.url())

await desktop.screenshot({ path: resolve(root, 'screenshots', 'polished-home-1440.png'), fullPage: false })

// Desktop chapter
await desktop.goto(base + `/#/chapter/${encodeURIComponent('Day2-布尔津-白哈巴')}`, { waitUntil: 'networkidle' })
await desktop.waitForTimeout(900)
await check('chapter reader media renders', await desktop.locator('.reader-hero .reader-media img').count() === 1)
await check('chapter day brief renders', await desktop.locator('.day-brief').count() === 1)
await check('docked toc header renders', await desktop.locator('.reader-aside-docked .reader-tools-head').count() === 1)
await check('docked toc badges render', await desktop.locator('.reader-aside-docked .toc__index').count() >= 5)
await check('docked toc position pill renders', (await desktop.locator('.reader-position-pill').textContent() || '').includes('/'))
await desktop.screenshot({ path: resolve(root, 'screenshots', 'polished-day2-1440.png'), fullPage: false })

// Mobile home + chapter
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1.5 })
const mobileErrors = await collectErrors(mobile)
await mobile.goto(base + '/', { waitUntil: 'networkidle' })
await mobile.waitForTimeout(900)
const mobileOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
await check('mobile home no global horizontal overflow', mobileOverflow <= 1, `delta=${mobileOverflow}`)
await check('mobile source chips render', await mobile.locator('.source-chip').count() >= 2)
await mobile.screenshot({ path: resolve(root, 'screenshots', 'polished-home-390.png'), fullPage: true })

await mobile.goto(base + `/#/chapter/${encodeURIComponent('Day2-布尔津-白哈巴')}`, { waitUntil: 'networkidle' })
await mobile.waitForTimeout(900)
const mobileChapterOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
await check('mobile chapter no global horizontal overflow', mobileChapterOverflow <= 1, `delta=${mobileChapterOverflow}`)
await check('mobile chapter media renders', await mobile.locator('.reader-hero .reader-media img').count() === 1)
await mobile.screenshot({ path: resolve(root, 'screenshots', 'polished-day2-390.png'), fullPage: true })
await mobile.locator('.reader-tools-toggle').click()
await mobile.waitForTimeout(600)
await check('mobile toc drawer opens', await mobile.locator('.reader-aside-modal .toc__link').count() >= 5)
await mobile.screenshot({ path: resolve(root, 'screenshots', 'polished-day2-390-toc.png'), fullPage: false })
await mobile.locator('.reader-aside-modal .reader-tools-close').click()

await check('desktop console clean', desktopErrors.length === 0, desktopErrors.slice(0, 3).join(' | '))
await check('mobile console clean', mobileErrors.length === 0, mobileErrors.slice(0, 3).join(' | '))

await browser.close()
if (results.some((item) => !item.ok)) process.exitCode = 1
