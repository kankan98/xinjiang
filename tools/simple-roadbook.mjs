import { readFile } from 'node:fs/promises'
import { buildChapterHash } from '../src/lib/router.js'

const root = new URL('../', import.meta.url)
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), 'utf8'))
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])
const chapterLink = (file) => `./index.html${buildChapterHash(file)}`

export async function renderSimpleRoadbook() {
  const [runtime, manifest, schedules, guides, css] = await Promise.all([
    readJson('src/data/roadbook-runtime.json'),
    readJson('src/data/roadbook.manifest.json'),
    readJson('src/generated/day-schedules.generated.json'),
    readJson('src/data/daily-guides.json'),
    readFile(new URL('src/assets/styles/simple.css', root), 'utf8'),
  ])
  const { summary, itinerary, gates } = runtime
  const days = itinerary.map(({ file, meta }) => {
    const doc = manifest.documents.find((item) => item.file === file)
    const guide = guides.find((item) => item.file === file)
    const schedule = schedules[file]
    if (!doc || !guide || !schedule?.length) throw new Error(`简易版缺少每日数据：${file}`)
    return { file, meta, doc, guide, schedule }
  })
  const e = escapeHtml
  const cards = days.map(({ file, meta, doc, guide, schedule }) => `
    <article class="day-card" id="${e(meta.day)}" aria-labelledby="title-${e(meta.day)}">
      <header class="day-heading"><span class="day-number">${e(meta.day)}</span><div><p class="date">${e(meta.date)}</p><h2 id="title-${e(meta.day)}">${e(doc.title.replace(/^Day\s*\d+\s*·\s*/, ''))}</h2></div></header>
      <p class="route">${e(meta.route)}</p>
      ${meta.distance ? `<p class="driving"><strong>${meta.isEstimate ? '计划约' : meta.isPartial ? '已测段 ' : ''}${e(meta.distance)} km</strong><span>${meta.isEstimate ? '驾驶预算' : meta.isPartial ? '已测段驾驶' : '主选纯驾驶'} ${e(meta.driveTime)}</span></p>` : ''}
      ${meta.distanceNote ? `<p class="estimate">${e(meta.distanceNote)}</p>` : ''}
      <p class="stay"><span class="label">今晚住</span>${e(meta.stay)}</p>
      <div class="reminder"><h3>关键提醒</h3><p>${e(guide.hardStop)}</p></div>
      <details class="day-details"><summary>当天安排与时间表 <span>${schedule.length} 个节点</span></summary>
        <p class="focus">${e(meta.focus)}</p>
        ${meta.stayAlternative ? `<p class="alternative"><strong>条件备选：</strong>${e(meta.stayAlternative)}</p>` : ''}
        <ol class="timeline">${schedule.map((entry) => `<li><strong class="time">${e(entry.time)}</strong><div><p>${e(entry.event)}</p>${entry.note ? `<p class="note">${e(entry.note)}</p>` : ''}</div></li>`).join('')}</ol>
      </details>
      <details class="day-details"><summary>吃什么、穿什么</summary>${guide.categories.filter((item) => ['eat', 'wear'].includes(item.key)).map((item) => `<div class="daily-tip"><h3>${e(item.label)}</h3><p>${e(item.summary)}</p><p class="note">${e(item.boundary)}</p></div>`).join('')}</details>
      <footer class="day-footer"><a href="${e(chapterLink(file))}">阅读 ${e(meta.day)} 完整攻略 ↗</a><a href="#top" aria-label="从 ${e(meta.day)} 返回顶部">↑ 顶部</a></footer>
    </article>`).join('')

  return `<!doctype html>
<html lang="zh-CN">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="description" content="北疆十日自驾简易攻略：每日路线、住宿、关键提醒与时间表。支持离线阅读与打印。"><title>北疆十日 · 简易攻略</title><style>${css}</style></head>
<body id="top">
  <a class="skip-link" href="#days">跳到每日攻略</a>
  <header class="masthead"><a class="brand" href="./index.html">北疆路书 <span>2026 / AUTUMN</span></a><a class="full-link" href="./index.html">打开完整版 ↗</a></header>
  <main>
    <section class="intro" aria-labelledby="page-title"><p class="eyebrow">随身速览 · SIMPLE EDITION</p><h1 id="page-title">北疆十日 · 简易攻略</h1><p class="lede">路线、住宿、关键提醒，详细日程展开查看。</p>
      <dl class="trip-facts"><div><dt>旅行日期</dt><dd>2026.10.02—10.11</dd></div><div><dt>同行与住宿</dt><dd>4 人 · 1 车 · 8 晚</dd></div><div><dt>${summary.isPartial ? '已测分段' : '计划自驾'}</dt><dd>≈ ${e(summary.plannedDrivingDistanceKm.toLocaleString('zh-CN'))} km</dd></div><div><dt>驾驶预算</dt><dd>${e(summary.plannedDrivingTime)}</dd></div></dl>
      <p class="summary-note">${e(summary.distanceNote)} ${e(summary.timeNote)}</p><p class="edition">内容修订 ${e(summary.editorialRevision)} · 时间均为北京时间 · 班次、道路及订单按当日确认</p>
    </section>
    <nav class="day-nav" aria-label="按日期跳转">${days.map(({ meta }) => `<a href="#${e(meta.day)}"><strong>${e(meta.day)}</strong><span>${e(meta.date)}</span></a>`).join('')}</nav>
    <div class="section-heading" id="days"><h2>每天只看需要的</h2><span>主线速览 / 细节展开</span></div>
    <section class="days" aria-label="十日简易攻略">${cards}</section>
    <section class="preparation" aria-labelledby="preparation-title"><div class="section-heading"><h2 id="preparation-title">出发前，再确认一遍</h2><span>票、证、车与道路</span></div><p class="note">这里保留七项准备条件；展开查看确认内容与不成立时的处理。</p>${gates.map((gate) => `<details><summary>${e(gate.id)} · ${e(gate.name)}</summary><p class="deadline">${e(gate.deadline)}</p><p>${e(gate.pass)}</p><p class="alternative"><strong>不成立时：</strong>${e(gate.fallback)}</p><a href="${e(chapterLink(gate.file))}">查看相关说明 ↗</a></details>`).join('')}</section>
  </main>
  <footer class="page-footer"><p>北疆十日 · 简易攻略 <span>内容修订 ${e(summary.editorialRevision)}</span></p><p>本页可单独保存、离线阅读；用浏览器打印可导出 PDF，全部时间表会展开。完整版链接需配套站点。</p><a href="./index.html">打开完整版，查看地图、专题与来源 ↗</a></footer>
</body></html>\n`
}

// 同一渲染入口用于开发与生产；不再人工维护第二份日程。
export function simpleRoadbookPlugin() {
  return {
    name: 'simple-roadbook',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.split('?')[0] !== `${server.config.base}simple.html`) return next()
        try {
          res.setHeader('Content-Type', 'text/html; charset=utf-8')
          res.end(await renderSimpleRoadbook())
        } catch (error) {
          next(error)
        }
      })
    },
    async generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'simple.html', source: await renderSimpleRoadbook() })
    },
  }
}
