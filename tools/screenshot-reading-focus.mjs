import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const output = resolve(root, 'screenshots/reading-focus')
const baseURL = process.env.ROADBOOK_PREVIEW_URL || 'http://127.0.0.1:5173'
const { documents } = JSON.parse(await readFile(resolve(root, 'src/data/roadbook.manifest.json'), 'utf8'))
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })
const pageErrors = []
const checks = []
const captures = []
page.on('pageerror', (error) => pageErrors.push(error.message))
await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' })
await mkdir(output, { recursive: true })

async function settle() {
  await page.evaluate(async () => {
    await document.fonts.ready
    await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))
  })
}

async function capture(name, selector) {
  if (selector) await page.locator(selector).first().evaluate((el) => scrollTo({ top: el.getBoundingClientRect().top + scrollY - 85, behavior: 'instant' }))
  else await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
  await settle()
  await page.screenshot({ path: resolve(output, `${name}.png`) })
  captures.push(name)
}

function contrast(foreground, background) {
  const luminance = (color) => color.match(/[\d.]+/g).slice(0, 3)
    .map((value) => Number(value) / 255)
    .map((value) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
    .reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0)
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a)
  return Number(((values[0] + .05) / (values[1] + .05)).toFixed(2))
}

try {
  await page.goto(baseURL)
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: width < 600 ? 844 : 1000 })
    for (const theme of ['light', 'dark']) {
      await page.evaluate((value) => localStorage.setItem('roadbook:theme', value), theme)
      for (const doc of documents) {
        await page.goto(`${baseURL}/#/chapter/${encodeURIComponent(doc.file.replace(/\.md$/, ''))}`)
        // 同一路由重复加载也要实际应用持久化主题。
        await page.reload()
        await page.locator('.chapter-content').waitFor()
        await settle()
        const state = await page.evaluate(() => {
          const focus = document.querySelector('.reader-focus')
          const hero = document.querySelector('.reader-hero')
          const cards = [...focus.querySelectorAll('.reader-focus__item')]
          const candidates = [...document.querySelectorAll('.reader-focus__item, .reader-focus__title, .reading-points > li, .reading-decision-table, .day-timeline__card')]
          return {
            theme: document.documentElement.dataset.theme,
            pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            localOverflows: candidates.filter((el) => el.scrollWidth - el.clientWidth > 2).map((el) => ({ class: el.className, overflow: el.scrollWidth - el.clientWidth })),
            timingCollisions: [...document.querySelectorAll('.day-timeline__item')].filter((item) => {
              const dot = getComputedStyle(item, '::after')
              const dotLeft = item.getBoundingClientRect().left + parseFloat(dot.left) - parseFloat(dot.width) / 2
              const timeRight = Math.max(...[...item.querySelectorAll('.day-timeline__time > *')].map((el) => el.getBoundingClientRect().right))
              return timeRight + 4 > dotLeft
            }).map((item) => item.querySelector('.day-timeline__time').textContent),
            focusBeforeImage: focus.getBoundingClientRect().bottom <= hero.getBoundingClientRect().top,
            cardCount: cards.length,
            colors: cards.map((card) => ({
              tone: card.dataset.readingTone,
              foreground: getComputedStyle(card.querySelector('.reader-focus__label')).color,
              background: getComputedStyle(card).backgroundColor,
              body: getComputedStyle(card.querySelector('p')).color,
            })),
          }
        })
        state.colors = state.colors.map((colors) => ({ ...colors, labelContrast: contrast(colors.foreground, colors.background), bodyContrast: contrast(colors.body, colors.background) }))
        checks.push({ file: doc.file, width, theme, ...state })
        if (width === 320) continue
        const suffix = `${theme}-${width}`
        if (doc.file.startsWith('Day2-')) {
          await capture(`day2-intro-${suffix}`)
          await capture(`day2-timeline-${suffix}`, '#关键时间轴')
          await capture(`day2-risk-${suffix}`, '#风险与降级')
          if (theme === 'light') await capture(`day2-reminder-${suffix}`, '.experience-card')
        }
        if (doc.file.startsWith('Day7-')) await capture(`day7-fallback-${suffix}`, '#独库不通时怎么走')
        if (doc.file.startsWith('Day8-')) await capture(`day8-risk-${suffix}`, '#风险与降级')
        if (doc.file === '专题-预算规划.md') await capture(`budget-intro-${suffix}`)
      }
    }
  }
  const failures = checks.filter((check) => check.pageOverflow > 1 || check.localOverflows.length || check.timingCollisions.length || check.cardCount !== 3 ||
    (check.width < 600 && !check.focusBeforeImage) || check.colors.some((colors) => colors.labelContrast < 4.5 || colors.bodyContrast < 4.5))
  await writeFile(resolve(output, 'verification.json'), JSON.stringify({ captures, pageErrors, failures, checks }, null, 2) + '\n')
  console.log(JSON.stringify({ pages: checks.length, captures: captures.length, minimumContrast: Math.min(...checks.flatMap((check) => check.colors.flatMap((colors) => [colors.labelContrast, colors.bodyContrast]))), pageErrors, failures }, null, 2))
  if (failures.length || pageErrors.length) process.exitCode = 1
} finally {
  await browser.close()
}
