import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium } from '@playwright/test'

const baseURL = process.env.ROADBOOK_PREVIEW_URL || 'http://127.0.0.1:5173'
const output = resolve('screenshots/redesign')
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage()
page.setDefaultTimeout(15000)
const errors = []
const captures = []
const readability = []
page.on('pageerror', (error) => errors.push(error.message))
await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' })

async function inspectContrast() {
  const results = await page.evaluate(() => {
    const rgba = (color) => {
      const channels = color.match(/[+-]?(?:\d*\.)?\d+(?:e[+-]?\d+)?/g)?.map(Number) || [0, 0, 0, 0]
      const multiplier = color.startsWith('color(srgb ') ? 255 : 1
      return [...channels.slice(0, 3).map((channel) => channel * multiplier), (channels[3] ?? 1) * 255]
    }
    const blend = (front, back) => front.slice(0, 3).map((channel, index) => channel * front[3] / 255 + back[index] * (1 - front[3] / 255))
    const luminance = (rgb) => rgb.map((channel) => channel / 255).map((value) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4).reduce((value, channel, index) => value + channel * [.2126, .7152, .0722][index], 0)
    const selectors = ['.hero-lede', '.hero-kicker', '.primary-btn', '.section-heading__description', '.field-tabs [aria-selected="true"]', '.field-clock strong', '.field-panel__eyebrow', '.field-panel__intro', '.food-card__flavor', '.budget-baseline > strong', '.budget-baseline p', '.budget-result strong', '.reader-header-copy > p', '.reader-focus__title', '.reader-focus__detail']
    return selectors.flatMap((selector) => [...document.querySelectorAll(selector)].filter((el) => el.getClientRects().length).map((el) => {
      const ancestors = []
      for (let node = el; node; node = node.parentElement) ancestors.unshift(node)
      const background = ancestors.reduce((rgb, node) => blend(rgba(getComputedStyle(node).backgroundColor), rgb), [255, 255, 255])
      const style = getComputedStyle(el)
      const foreground = blend(rgba(style.color), background)
      const levels = [luminance(foreground), luminance(background)].sort((a, b) => b - a)
      const ratio = (levels[0] + .05) / (levels[1] + .05)
      const large = parseFloat(style.fontSize) >= 24 || (parseFloat(style.fontSize) >= 18.66 && Number(style.fontWeight) >= 700)
      return { selector, sample: el.textContent.trim().slice(0, 35), ratio: Number(ratio.toFixed(2)), minimum: large ? 3 : 4.5 }
    }))
  })
  readability.push({ width: page.viewportSize().width, theme: await page.locator('html').getAttribute('data-theme'), url: page.url(), results })
}

async function capture(name, selector) {
  if (selector) await page.locator(selector).first().evaluate((el) => scrollTo({ top: el.getBoundingClientRect().top + scrollY - 150, behavior: 'instant' }))
  else await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all([...document.images].filter((img) => {
      if (!img.checkVisibility()) return false
      const rect = img.getBoundingClientRect()
      return img.loading !== 'lazy' || (rect.bottom > 0 && rect.top < innerHeight)
    }).map((img) => img.decode().catch(() => {})))
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  })
  await page.screenshot({ path: resolve(output, `${name}.png`) })
  console.log(`Captured ${name}`)
  captures.push({ name, width: page.viewportSize().width, theme: await page.locator('html').getAttribute('data-theme'), overflow: await page.evaluate(() => document.documentElement.scrollWidth - innerWidth) })
}

try {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 })
    for (const theme of ['light', 'dark']) {
      await page.goto(baseURL)
      await page.evaluate((mode) => {
        localStorage.setItem('roadbook:theme', mode)
        localStorage.setItem('roadbook:planner:v3.9:selected-day', '"D5"')
      }, theme)
      await page.reload()
      await page.locator('.hero-photograph img').evaluate((img) => img.decode())
      await inspectContrast()
      await capture(`home-${theme}-${width}`)
      await capture(`route-${theme}-${width}`, '#routeOverview')
      await capture(`daily-${theme}-${width}`, '#dailyGuide')
      await capture(`food-${theme}-${width}`, '#foodJourney')
      await capture(`budget-${theme}-${width}`, '#tripBudget')
      await capture(`preparation-${theme}-${width}`, '#intelligence')
      await page.getByRole('button', { name: '打开搜索', exact: true }).click()
      await page.getByRole('combobox').waitFor()
      await capture(`search-${theme}-${width}`)
      await page.keyboard.press('Escape')
      await page.goto(`${baseURL}/#/chapter/${encodeURIComponent('Day5-奎屯-赛里木湖')}`)
      await page.locator('.chapter-content').waitFor()
      await inspectContrast()
      await capture(`reader-${theme}-${width}`)
      await capture(`timeline-${theme}-${width}`, '.day-timeline')
    }
  }
  await writeFile(resolve(output, 'verification.json'), JSON.stringify({ baseURL, captures, readability, errors }, null, 2) + '\n')
  const failures = captures.filter((capture) => capture.overflow > 1)
  const lowContrast = readability.flatMap(({ theme, results }) => results.filter(({ ratio, minimum }) => ratio < minimum).map((result) => ({ theme, ...result })))
  if (errors.length || failures.length || lowContrast.length) throw new Error(JSON.stringify({ errors, failures, lowContrast }))
  console.log(`Saved ${captures.length} screenshots; ${readability.reduce((count, item) => count + item.results.length, 0)} text contrast samples passed. No page errors or horizontal overflow.`)
} finally {
  await browser.close()
}
