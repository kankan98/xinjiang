import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const baseURL = process.env.ROADBOOK_PREVIEW_URL || 'http://127.0.0.1:5173'
const output = resolve(root, 'screenshots')
const manifest = JSON.parse(await readFile(resolve(root, 'src/data/roadbook.manifest.json'), 'utf8'))
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const errors = []
const captures = []
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })
page.on('pageerror', (error) => errors.push(error.message))
await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' })

async function settle() {
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all([...document.images].filter((img) => img.loading !== 'lazy').map((img) => img.decode().catch(() => {})))
    await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))
  })
}
async function capture(name, selector, fullPage = false) {
  if (selector) {
    await page.locator(selector).first().evaluate((element) => {
      const top = element.getBoundingClientRect().top + scrollY - 120
      scrollTo({ top: Math.max(0, top), behavior: 'instant' })
    })
  } else await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
  await settle()
  await page.screenshot({ path: resolve(output, `${name}.png`), fullPage })
  captures.push({ name, width: page.viewportSize().width, url: page.url(), theme: await page.locator('html').getAttribute('data-theme') })
}
async function theme(value) {
  await page.evaluate((value) => localStorage.setItem('roadbook:theme', value), value)
  await page.reload()
  await settle()
}

try {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 })
    for (const mode of ['light', 'dark']) {
      await page.goto(baseURL)
      await theme(mode)
      await capture(`final-home-${mode}-${width}`)
      await capture(`final-daily-${mode}-${width}`, '#dailyGuide')
      await capture(`final-food-${mode}-${width}`, '#foodJourney')
      await capture(`final-budget-${mode}-${width}`, '#tripBudget')
      await capture(`final-preparation-${mode}-${width}`, '#intelligence')
      for (const day of [1, 5, 7, 8]) {
        const doc = manifest.documents.find((doc) => doc.file.startsWith(`Day${day}-`))
        await page.goto(`${baseURL}/#/chapter/${encodeURIComponent(doc.file.replace(/\.md$/, ''))}`)
        await page.locator('.chapter-content').waitFor()
        await capture(`final-day${day}-${mode}-${width}`, '.day-timeline')
        if (day === 7) await capture(`final-day7-fallback-${mode}-${width}`, '#独库不通时怎么走')
      }
    }
  }
  await writeFile(resolve(output, 'verification.json'), JSON.stringify({ captures, pageErrors: errors }, null, 2) + '\n')
  if (errors.length) throw new Error(errors.join('\n'))
  console.log(`Saved ${captures.length} viewport captures. No page errors.`)
} finally {
  await browser.close()
}
