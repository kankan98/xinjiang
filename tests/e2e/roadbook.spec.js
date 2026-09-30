import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { foodJourney } from '../../src/data/travel-experience.js'
import { annotateDayRoutes } from '../../src/data/route-annotations.js'

const readJson = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'))
const manifest = readJson('../../src/data/roadbook.manifest.json')
const schedules = readJson('../../src/generated/day-schedules.generated.json')
const routes = annotateDayRoutes(readJson('../../src/data/day-routes.json'))
const chapterUrl = (file) => `/#/chapter/${encodeURIComponent(file.replace(/\.md$/, ''))}`
const dayFile = (day) => manifest.documents.find((doc) => doc.file.startsWith(`Day${day}-`)).file
const errorsByPage = new WeakMap()

// Viewport changes can return before media-query layout and ResizeObserver updates are painted.
const waitForLayout = (page) => page.evaluate(async () => {
  await document.fonts.ready
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
})

async function expectDayMapFits(page, label) {
  const geometry = await page.locator('.day-route-map').evaluate((map) => {
    const bounds = map.getBoundingClientRect()
    const containers = new Set([map, ...map.querySelectorAll('.day-route-map-head, .day-route-map-toggle, .day-route-map-body, .day-route-map-plot, .day-route-map-scroll, .day-route-map-scroll > svg, .day-route-map-side')])
    const nodes = [map, ...map.querySelectorAll('*')].filter((node) =>
      (node instanceof HTMLElement || node instanceof SVGSVGElement) && node.getClientRects().length,
    )
    const violations = nodes.map((node) => {
      const rect = node.getBoundingClientRect()
      return {
        element: `${node.tagName}.${node.getAttribute('class') || ''}`,
        left: rect.left,
        right: Math.max(rect.right, rect.left + node.scrollWidth),
        // Chinese closing punctuation may hang inside padded legend items.
        overflow: containers.has(node) ? node.scrollWidth - node.clientWidth : 0,
      }
    }).filter((node) => node.overflow > 1 || node.left < bounds.left - 1 || node.right > bounds.right + 1)
    return {
      violations,
      left: bounds.left,
      right: bounds.right,
      viewportWidth: document.documentElement.clientWidth,
    }
  })
  expect(geometry.violations, `${label}: map content stays inside its own container`).toEqual([])
  expect(geometry.left, `${label}: map left edge`).toBeGreaterThanOrEqual(0)
  expect(geometry.right, `${label}: map right edge`).toBeLessThanOrEqual(geometry.viewportWidth)
}

test.beforeEach(async ({ page }) => {
  const errors = []
  errorsByPage.set(page, errors)
  page.on('pageerror', (error) => errors.push(error.message))
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' })
})
test.afterEach(async ({ page }) => { expect(errorsByPage.get(page)).toEqual([]) })

test('all 23 chapters load with intact images, headings and mobile widths', async ({ page }) => {
  test.setTimeout(90000)
  for (const doc of manifest.documents) {
    await page.goto(chapterUrl(doc.file))
    await expect(page.locator('#readerTitle')).toHaveText(doc.title)
    await expect(page.locator('.chapter-content')).toBeVisible()
    await expect(page.locator('.reader-focus__item')).toHaveCount(3)
    const missingFocusTargets = await page.locator('.reader-focus__item').evaluateAll((links) => links
      .map((link) => new URLSearchParams(link.hash.split('?')[1]).get('section'))
      .filter((id) => !document.getElementById(id)))
    expect.soft(missingFocusTargets, `${doc.file}: focus links`).toEqual([])
    if (doc.heroImage) {
      const hero = page.locator('.reader-hero img')
      await expect.poll(() => hero.evaluate((img) => img.naturalWidth)).toBeGreaterThan(0)
    } else await expect(page.locator('.reader-hero-empty')).toBeVisible()
    const state = await page.locator('.chapter-content').evaluate((el) => {
      const ids = [...el.querySelectorAll('[id]')].map((node) => node.id)
      return { unique: new Set(ids).size === ids.length, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth }
    })
    expect.soft(state.unique, doc.file).toBe(true)
    expect.soft(state.overflow, doc.file).toBeLessThanOrEqual(1)
  }
})

test('chapter focus links support keyboard navigation and keep risk and fallback content readable', async ({ page, isMobile }) => {
  await page.goto(chapterUrl(dayFile(2)))
  await expect(page.locator('.chapter-content')).toBeVisible()
  const focus = page.locator('.reader-focus__item')
  if (isMobile) {
    const order = await page.evaluate(() => ({
      focus: document.querySelector('.reader-focus').getBoundingClientRect().bottom,
      image: document.querySelector('.reader-hero').getBoundingClientRect().top,
    }))
    expect(order.focus).toBeLessThanOrEqual(order.image)
  }
  await focus.nth(1).focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('#风险与降级')).toBeFocused()
  await expect(page.locator('#风险与降级')).toBeInViewport()
  await page.locator('.section-media--map img').evaluate((img) => img.decode())
  await waitForLayout(page)
  const targetTop = await page.locator('#风险与降级').evaluate((heading) => heading.getBoundingClientRect().top)
  expect(targetTop, 'lazy map loading does not push the selected section away').toBeGreaterThanOrEqual(56)
  expect(targetTop).toBeLessThan(200)
  await expect(page.locator('.reading-points[data-reading-tone="risk"]').first()).toBeVisible()
  const d2Schedule = page.locator('.day-timeline').first()
  await expect(d2Schedule).toContainText('20:00')
  await expect(d2Schedule).toContainText('19:30')
  await expect(d2Schedule).toContainText('观鱼台')
  await page.goto(chapterUrl(dayFile(7)))
  await page.locator('.reader-focus__item').nth(2).click()
  await expect(page.locator('#住宿与衔接')).toBeFocused()
  await expect(page.locator('#住宿与衔接')).toHaveAttribute('data-reading-tone', 'info')
  await expect(page.locator('.day-timeline').first()).toContainText('16:15')
  await expect(page.locator('#住宿与衔接 + p')).toContainText('294.22')
  await page.goto(chapterUrl(dayFile(8)))
  await expect(page.locator('.chapter-content')).toBeVisible()
  await expect(page.locator('.reading-decision-table')).toHaveCount(1)
  if (isMobile) {
    const sizes = await page.locator('.reading-decision-table tbody tr').first().evaluate((row) => ({
      row: row.getBoundingClientRect().width,
      condition: row.querySelector('th').getBoundingClientRect().width,
    }))
    expect(sizes.condition / sizes.row).toBeGreaterThan(0.9)
  }
})

test('ten daily tabs support keyboard navigation, persistence and chapter schedules', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '打开每日速查' }).click()
  await expect(page.locator('#dailyGuide')).toBeFocused()
  expect(new URL(page.url()).hash).not.toContain('dailyGuide')
  const tabs = page.getByRole('tablist', { name: '选择 D0 至 D9 每日攻略' })
  await expect(tabs.getByRole('tab')).toHaveCount(10)
  const first = tabs.getByRole('tab').first()
  await first.focus()
  await page.keyboard.press('End')
  await expect(tabs.getByRole('tab').last()).toBeFocused()
  await expect(tabs.getByRole('tab').last()).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('ArrowLeft')
  await expect(tabs.getByRole('tab').nth(8)).toBeFocused()
  await expect(page.locator('.field-boundary')).toContainText('23:30')
  await page.reload()
  await expect(tabs.getByRole('tab').nth(8)).toHaveAttribute('aria-selected', 'true')
  for (let day = 0; day < 10; day++) {
    await tabs.getByRole('tab').nth(day).click()
    const panel = page.getByRole('tabpanel')
    await expect(panel.locator('.field-category')).toHaveCount(5)
    await panel.locator('.field-schedule > summary').click()
    const actual = await panel.locator('.field-schedule li').evaluateAll((items) => items.map((item) => ({ time: item.querySelector('time').textContent, event: item.querySelector('strong').textContent })))
    expect(actual).toEqual(schedules[dayFile(day)].map(({ time, event }) => ({ time, event })))
  }
})

test('theme changes real colors and persists across reloads', async ({ page, isMobile }) => {
  await page.goto('/')
  const background = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  const light = await background()
  const toggle = isMobile ? page.getByRole('navigation', { name: '移动端快捷导航' }).getByRole('button', { name: '主题' }) : page.locator('.theme-toggle')
  await toggle.click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  expect(await background()).not.toBe(light)
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await toggle.click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  expect(await background()).toBe(light)
})

test('seven preparation checks persist and open the correct explanation', async ({ page }) => {
  await page.goto('/')
  const section = page.locator('#intelligence')
  const checks = section.getByRole('checkbox')
  await expect(checks).toHaveCount(7)
  await checks.nth(0).check()
  await checks.nth(6).check()
  await expect(section.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2')
  await page.reload()
  await expect(checks.nth(0)).toBeChecked()
  await expect(checks.nth(6)).toBeChecked()
  await expect(checks.nth(1)).not.toBeChecked()
  await section.locator('.departure-item').nth(6).locator('summary').click()
  await section.locator('.departure-item').nth(6).getByRole('button', { name: /查看完整说明/ }).click()
  await expect(page.locator('#独库不通时怎么走')).toBeInViewport()
})

test('budget calculates partial costs, handles blanks, saves and resets', async ({ page }) => {
  await page.goto('/')
  const budget = page.locator('#tripBudget')
  await expect(budget.getByTestId('budget-total')).toHaveText('¥26,864.92')
  await expect(budget.locator('.budget-result')).toContainText('还有 4 项未填')
  await budget.getByRole('spinbutton', { name: '全程油电预算' }).fill('1800')
  await expect(budget.getByTestId('budget-total')).toHaveText('¥27,164.92')
  await page.reload()
  await expect(budget.getByRole('spinbutton', { name: '全程油电预算' })).toHaveValue('1800')
  await budget.getByRole('spinbutton', { name: '全程油电预算' }).fill('0')
  await expect(budget.getByTestId('budget-total')).toHaveText('¥25,364.92')
  await budget.getByRole('spinbutton', { name: '全程油电预算' }).fill('')
  await budget.getByRole('spinbutton', { name: '每日人均餐饮预算' }).focus()
  await expect(budget.getByRole('spinbutton', { name: '全程油电预算' })).toHaveValue('1500')

  await budget.getByRole('spinbutton', { name: '每日人均餐饮预算' }).fill('100')
  await budget.locator('.budget-other > summary').click()
  await budget.getByRole('spinbutton', { name: '原7天租车与保险（延期另计）' }).fill('3000')
  await budget.getByRole('spinbutton', { name: '4 人两程火车票' }).fill('0')
  await expect(budget.getByTestId('budget-total')).toHaveText('¥24,575.92')
  await expect(budget.locator('.budget-result')).toContainText('还有 3 项未填')
  await page.reload()
  await expect(budget.getByRole('spinbutton', { name: '每日人均餐饮预算' })).toHaveValue('100')
  await expect(budget.getByTestId('budget-total')).toHaveText('¥24,575.92')
  await budget.getByRole('spinbutton', { name: '每日人均餐饮预算' }).fill('')
  await budget.getByRole('spinbutton', { name: '全程油电预算' }).focus()
  await expect(budget.getByRole('spinbutton', { name: '每日人均餐饮预算' })).toHaveValue('120')
  await budget.getByRole('button', { name: '恢复试算默认值' }).click()
  await expect(budget.getByTestId('budget-total')).toHaveText('¥26,864.92')
  await expect(budget.locator('.budget-result')).toContainText('还有 4 项未填')
  await page.reload()
  await expect(budget.getByTestId('budget-total')).toHaveText('¥26,864.92')
})

test('alternate hotel comparison replaces nightly costs, persists and links to the changed travel days', async ({ page }) => {
  await page.goto('/')
  const budget = page.locator('#tripBudget')
  await expect(budget.getByTestId('overnight-total')).toHaveText('¥5,877.92')
  await budget.getByLabel('10 月 6 日住宿方案').selectOption('jinghe')
  await expect(budget.getByTestId('overnight-total')).toHaveText('¥5,719.92')
  await expect(budget.getByLabel('10 月 9 日住宿方案')).toHaveCount(0)
  await expect(budget.getByTestId('budget-total')).toHaveText('¥26,706.92')
  await expect(budget.locator('.budget-stay-saving')).toContainText('少 ¥158')
  await page.reload()
  await expect(budget.getByLabel('10 月 6 日住宿方案')).toHaveValue('jinghe')
  await expect(budget.getByLabel('10 月 9 日住宿方案')).toHaveCount(0)
  await expect(budget.getByTestId('budget-total')).toHaveText('¥26,706.92')
  await budget.getByRole('button', { name: '查看10 月 6 日换住安排' }).click()
  await expect(page.locator('#精河住宿备选')).toBeInViewport()
  await page.goto('/')
  await page.locator('#tripBudget').getByRole('button', { name: '恢复试算默认值' }).click()
  await expect(page.getByTestId('overnight-total')).toHaveText('¥5,877.92')
  await expect(page.getByTestId('budget-total')).toHaveText('¥26,864.92')
})

test('invalid saved budget and reminder values recover gracefully', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.setItem('roadbook:planner:v3.9:budget', JSON.stringify({ rental: -100, rail: {}, mealPerPersonDay: '', fuelPrice: 1000001 }))
    localStorage.setItem('roadbook:planner:v3.9:departure-checks', '{invalid')
    localStorage.setItem('roadbook:planner:v3.9:selected-day', '"D100"')
  })
  await page.reload()
  await expect(page.getByTestId('budget-total')).toHaveText('¥26,864.92')
  await expect(page.locator('#intelligence').getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  await expect(page.getByRole('tab').first()).toHaveAttribute('aria-selected', 'true')
})

test('food cards land on real sections and brand returns to the top', async ({ page }) => {
  for (let i = 0; i < foodJourney.length; i++) {
    await page.goto('/')
    await page.locator('.food-card').nth(i).getByRole('button').click()
    const heading = page.locator(`[id="${foodJourney[i].section}"]`)
    await expect(heading).toBeInViewport()
    await expect(page.locator('.chapter-content')).toBeVisible()
  }
  await page.locator('.head-brand').click()
  await expect(page.locator('.hero-copy h1')).toBeInViewport()
  await expect(page.locator('.hero-copy h1')).toBeFocused()
})

test('maps separate taxis, estimated driving and return trips and preserve navigation endpoints', async ({ page, isMobile }) => {
  for (const day of ['D0', 'D1', 'D2', 'D5', 'D7', 'D8', 'D9']) {
    await page.goto(chapterUrl(dayFile(Number(day.slice(1)))))
    const map = page.getByRole('region', { name: '今日线路图与分段交通' })
    if (await map.locator('.day-route-map-toggle').getAttribute('aria-expanded') === 'false') await map.locator('.day-route-map-toggle').click()
    await expect(map.locator('.day-route-map-body')).toBeVisible()
    await expect(map.locator('.day-route-legs')).not.toContainText('undefined')
    const drive = routes.days[day].legs.find((leg) => leg.mode === 'drive')
    if (drive && !routes.days[day].manualStart) {
      const href = await map.getByRole('link', { name: '导航至自驾首站' }).getAttribute('href')
      const params = new URL(href).searchParams
      const from = routes.days[day].pois.find((p) => p.id === drive.from)
      const to = routes.days[day].pois.find((p) => p.id === drive.to)
      expect(params.get('from')).toBe(`${from.lng},${from.lat},${from.name}`)
      expect(params.get('to')).toBe(`${to.lng},${to.lat},${to.name}`)
      expect(href).not.toContain('%25')
    } else if (day === 'D7') {
      await expect(map.getByRole('link', { name: '导航至自驾首站' })).toHaveCount(0)
      await expect(map.locator('.day-route-map-summary')).toContainText('绕行预算约 300.0')
      await expect(map.locator('.day-route-map-summary')).toContainText('非全线实测')
    } else if (day === 'D2') {
      await expect(map.getByRole('link', { name: '导航至自驾首站' })).toHaveCount(0)
      await expect(map.locator('.day-route-map-summary')).toContainText('140.8')
    } else await expect(map.locator('.day-route-map-summary')).toContainText('当天无租车自驾')
    if (day === 'D5') await expect(map.locator('.day-route-legs')).toContainText('往返约 58.6 km')
    if (day === 'D7') {
      await expect(map.locator('.day-route-leg-chip', { hasText: '条件自驾 · 估算' })).toHaveCount(1)
      await expect(map.locator('.day-route-leg-chip', { hasText: '区间车' })).toHaveCount(0)
      await expect(map.locator('.day-route-leg-chip', { hasText: '自驾' })).toHaveCount(5)
      await expect(map.locator('.day-route-leg-chip', { hasText: '步行/接驳' })).toHaveCount(1)
    }
    if (day === 'D2') await expect(map.locator('.day-route-leg-chip', { hasText: '条件自驾 · 估算' })).toHaveCount(1)
    if (day === 'D8') {
      await expect(map.locator('.day-route-leg-chip', { hasText: '自驾' })).toHaveCount(3)
      await expect(map.locator('.day-route-leg-chip', { hasText: '出租车' })).toHaveCount(2)
      await expect(map.locator('.day-route-leg-chip', { hasText: '步行/接驳' })).toHaveCount(1)
      await expect(map.locator('.day-route-map-summary')).toContainText('276.7')
      const walk = map.locator('.day-route-legs > li').filter({ has: page.locator('.day-route-leg-chip', { hasText: '步行/接驳' }) })
      await expect(walk).toContainText('奎屯站')
      await expect(walk).toContainText('348 m')
      await expect(walk).toContainText('4 min 38 s')
    }
    if (day === 'D9') await expect(map.locator('.day-route-legend')).toContainText('23:30')
  }
})

test('all ten chapter briefs keep complete travel and hotel text clear of ratings', async ({ page }) => {
  test.setTimeout(90000)
  for (let day = 0; day < 10; day++) {
    await page.goto(chapterUrl(dayFile(day)))
    const brief = page.locator('.reader-day-brief-band')
    await expect(brief).toBeVisible()
    for (const width of [320, 390, 768, 959, 960, 1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      await waitForLayout(page)
      const issues = await brief.evaluate((el) => {
        const bounds = el.getBoundingClientRect()
        const facts = el.querySelector('.day-brief-facts').getBoundingClientRect()
        const ratings = [...el.querySelectorAll('.metric-bar')].map((node) => node.getBoundingClientRect())
        const overlaps = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1
        const failures = []
        for (const node of el.querySelectorAll('.day-brief-route, .day-brief-facts, .metric-bars')) {
          const rect = node.getBoundingClientRect()
          if (rect.left < bounds.left - 1 || rect.right > bounds.right + 1 || node.scrollWidth > node.clientWidth + 1) failures.push(`${node.className}: outside brief`)
        }
        for (const node of el.querySelectorAll('.day-brief-fact dt, .day-brief-fact dd')) {
          const range = document.createRange()
          range.selectNodeContents(node)
          for (const rect of range.getClientRects()) {
            if (rect.left < facts.left - 1 || rect.right > facts.right + 1 || rect.top < facts.top - 1 || rect.bottom > facts.bottom + 1) failures.push(`${node.textContent}: clipped text`)
            if (ratings.some((rating) => overlaps(rect, rating))) failures.push(`${node.textContent}: covered by ratings`)
          }
        }
        return failures
      })
      expect(issues, `D${day}, ${width}px: complete facts and unobstructed text`).toEqual([])
    }
  }
})

test('all ten daily maps fit when collapsed, expanded and resized on narrow screens', async ({ page }) => {
  test.setTimeout(90000)
  for (let day = 0; day < 10; day++) {
    await page.setViewportSize({ width: 320, height: 844 })
    await page.goto(chapterUrl(dayFile(day)))
    const toggle = page.locator('.day-route-map-toggle')
    await expect(toggle).toBeVisible()
    if (await toggle.getAttribute('aria-expanded') === 'true') await toggle.click()
    await waitForLayout(page)
    await expectDayMapFits(page, `D${day}, 320px, collapsed`)
    await toggle.click()
    await expect(page.locator('.day-route-map-body')).toBeVisible()
    for (const width of [320, 375, 390, 430, 768, 320]) {
      await page.setViewportSize({ width, height: width === 768 ? 390 : 844 })
      await waitForLayout(page)
      await expectDayMapFits(page, `D${day}, ${width}px, expanded`)
    }
  }
})

test('search, chapter checklists, timing qualifiers and mobile drawers work', async ({ page, isMobile }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '打开搜索', exact: true }).click()
  const search = page.getByRole('combobox', { name: '搜索章节、地点、政策' })
  await expect(search).toBeFocused()
  await search.fill('精确服务点')
  await page.getByRole('option', { name: /Day 8/ }).click()
  await expect(page.locator('#readerTitle')).toContainText('Day 8')
  const nextDayRows = schedules[dayFile(8)].filter((row) => row.time.includes('次日'))
  expect(nextDayRows.length).toBeGreaterThan(0)
  await expect(page.locator('.day-timeline__qualifier', { hasText: '次日' })).toHaveCount(nextDayRows.length)
  const nextDayTimeline = page.locator('.day-timeline__item').filter({ has: page.locator('.day-timeline__qualifier', { hasText: '次日' }) })
  await expect(nextDayTimeline.locator('.day-timeline__time b')).toHaveText(nextDayRows.map((row) => row.time.match(/\d{2}:\d{2}/)[0]))
  const check = page.locator('input[data-check-index="0"]')
  await check.check()
  await page.reload()
  await expect(check).toBeChecked()
  await page.getByRole('button', { name: '重置本章勾选' }).click()
  await expect(check).not.toBeChecked()
  await page.getByRole('button', { name: '切换目录' }).click()
  const directory = page.getByRole('complementary', { name: 'RoadBook 目录' })
  await expect(directory).toBeVisible()
  await expect(directory).toContainText(/奎屯.*取还/)
  await expect(directory).toContainText('17:00—17:30')
  await expect(directory).not.toContainText('机场取还')
  await directory.getByRole('button', { name: '关闭目录' }).click()
  if (isMobile) {
    await page.getByRole('button', { name: '本章导航', exact: true }).click()
    await expect(page.getByRole('button', { name: '关闭本章导航' })).toBeVisible()
    await page.getByRole('button', { name: '关闭本章导航' }).click()
    await expect(page.getByRole('button', { name: '本章导航', exact: true })).toBeFocused()
  }
  await page.goto(chapterUrl(dayFile(3)))
  const returnTime = page.locator('[aria-label="Day 3 主选时间轴"] .day-timeline__item').filter({ hasText: '乘已确认班次从喀纳斯返回白哈巴' })
  await expect(returnTime.locator('.day-timeline__qualifier')).toContainText('不晚于')
  await expect(returnTime.locator('.day-timeline__time b')).toHaveText('14:30')
})

test('overview map fits, opens, zooms, closes and restores focus', async ({ page, isMobile }) => {
  if (isMobile) await page.setViewportSize({ width: 320, height: 844 })
  await page.goto('/')
  await page.locator('.route-map-fold > summary').click()
  const trigger = page.getByRole('button', { name: /全屏预览北疆 v3.9/ })
  await expect.poll(() => trigger.locator('img').evaluate((img) => img.naturalWidth)).toBeGreaterThan(0)
  await waitForLayout(page)
  const inlineGeometry = await page.locator('.geo-map').evaluate((map) => {
    const bounds = map.getBoundingClientRect()
    const image = map.querySelector('img').getBoundingClientRect()
    const caption = map.querySelector('figcaption').getBoundingClientRect()
    return { left: image.left - bounds.left, right: image.right - bounds.right, captionBottom: caption.bottom - bounds.bottom, overflow: map.scrollWidth - map.clientWidth }
  })
  expect(inlineGeometry.left).toBeGreaterThanOrEqual(0)
  expect(inlineGeometry.right).toBeLessThanOrEqual(1)
  expect(inlineGeometry.captionBottom).toBeLessThanOrEqual(1)
  expect(inlineGeometry.overflow).toBeLessThanOrEqual(1)
  await trigger.click()
  await expect(page.getByRole('dialog', { name: '北疆自驾线路图全屏预览' })).toBeVisible()
  const previewImage = page.locator('.route-map-viewer .el-image-viewer__img')
  await expect.poll(() => previewImage.evaluate((img) => img.naturalWidth)).toBeGreaterThan(0)
  const expectPreviewFits = async () => {
    await waitForLayout(page)
    await expect.poll(() => previewImage.evaluate((img) => {
      const rect = img.getBoundingClientRect()
      return Math.max(0, -rect.left, rect.right - innerWidth, -rect.top, rect.bottom - innerHeight)
    }), { message: 'the fitted preview remains inside the viewport after its zoom transition' }).toBeLessThanOrEqual(1)
  }
  await expectPreviewFits()
  await page.getByRole('button', { name: '放大线路图' }).click()
  await page.getByRole('button', { name: '缩小线路图' }).click()
  await expectPreviewFits()
  // The mode button switches to original size first, then back to fit-to-window.
  await page.getByRole('button', { name: '切换适应窗口或原始尺寸' }).click()
  await page.getByRole('button', { name: '切换适应窗口或原始尺寸' }).click()
  await expectPreviewFits()
  if (isMobile) {
    await page.setViewportSize({ width: 844, height: 390 })
    await expectPreviewFits()
    await page.setViewportSize({ width: 320, height: 844 })
    await expectPreviewFits()
  }
  await page.getByRole('button', { name: '关闭线路图预览' }).click()
  await expect(trigger).toBeFocused()
})

test('header and homepage fit every responsive breakpoint', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop project checks explicit viewport sizes')
  await page.goto('/')
  for (const width of [320, 375, 390, 768, 1024, 1279, 1280, 1440]) {
    await page.setViewportSize({ width, height: width < 640 ? 844 : 900 })
    await waitForLayout(page)
    const layout = await page.evaluate(() => {
      const bounds = (selector) => { const el = document.querySelector(selector); const rect = el.getBoundingClientRect(); return { left: rect.left, right: rect.right, overflow: el.scrollWidth - el.clientWidth } }
      return { overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, topbar: bounds('.topbar'), brand: bounds('.head-brand'), actions: bounds('.topbar-actions'), version: bounds('.head-version') }
    })
    expect.soft(layout.overflow, `${width}px page`).toBeLessThanOrEqual(1)
    expect.soft(layout.topbar.overflow, `${width}px topbar`).toBeLessThanOrEqual(1)
    expect.soft(layout.brand.overflow, `${width}px brand`).toBeLessThanOrEqual(1)
    expect.soft(layout.brand.right, `${width}px collision`).toBeLessThanOrEqual(layout.actions.left)
    expect.soft(layout.version.right, `${width}px version`).toBeLessThanOrEqual(layout.topbar.right)
    await expect(page.getByRole('navigation', { name: '本页章节' })).toBeVisible()
  }
})

test('printing expands a collapsed route map on a white page', async ({ page }) => {
  await page.goto(chapterUrl(dayFile(8)))
  const toggle = page.locator('.day-route-map-toggle')
  if (await toggle.getAttribute('aria-expanded') === 'true') await toggle.click()
  await page.emulateMedia({ media: 'print' })
  await waitForLayout(page)
  await expect(page.locator('.site-head')).toBeHidden()
  await expect(page.locator('.day-route-map-body')).toBeVisible()
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
})
