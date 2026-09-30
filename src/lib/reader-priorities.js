import { readingSections } from '../data/reading-focus.js'

export function parseTimeRange(text) {
  const qualifier = (match) => text.replace(match, '').replace(/[（）()]/g, '').trim()
  const datedRange = text.match(/(\d{1,2}-\d{1,2})\s+(\d{1,2}:\d{2})\s*[—–-]\s*(\d{1,2}-\d{1,2})\s+(\d{1,2}:\d{2})/)
  if (datedRange) {
    const time = parseTimeRange(`${datedRange[2]}—${datedRange[4]}`)
    return { ...time, qualifier: [`${datedRange[1]} 至 ${datedRange[3]}`, qualifier(datedRange[0])].filter(Boolean).join(' ') }
  }
  const range = text.match(/(\d{1,2}):(\d{2})\s*[—–-]\s*(\d{1,2}):(\d{2})/)
  if (range) return { start: `${range[1].padStart(2, '0')}:${range[2]}`, end: `${range[3].padStart(2, '0')}:${range[4]}`, qualifier: qualifier(range[0]) }
  const single = text.match(/(\d{1,2}):(\d{2})/)
  if (single) return { start: `${single[1].padStart(2, '0')}:${single[2]}`, end: '', qualifier: qualifier(single[0]) }
  return null
}

// 仅转换具有明确时间表头的正文表格。原文的加粗、链接和时间限定词完整保留。
export function transformScheduleTables(root) {
  const document = root.ownerDocument
  for (const wrap of [...root.querySelectorAll('.table-scroll')]) {
    const table = wrap.querySelector('table')
    const headText = table?.querySelector('thead th')?.textContent.trim()
    if (!table || !['时间', '北京时间'].includes(headText)) continue
    const rows = [...table.querySelectorAll('tbody tr')]
    if (rows.length < 4) continue
    const items = rows.map((row) => {
      const timeCell = row.querySelector('th')
      const cells = [...row.querySelectorAll('td')]
      return {
        raw: timeCell?.textContent.trim() || '',
        time: parseTimeRange(timeCell?.textContent.trim() || ''),
        key: Boolean(timeCell?.querySelector('strong')),
        cells,
      }
    })
    if (items.filter((item) => item.time).length < Math.ceil(rows.length * 0.6)) continue

    const list = document.createElement('ol')
    list.className = 'day-timeline'
    list.setAttribute('aria-label', wrap.getAttribute('aria-label') || '当日作息时间表')
    for (const item of items) {
      const li = document.createElement('li')
      li.className = item.key ? 'day-timeline__item is-key' : 'day-timeline__item'
      const time = document.createElement('div')
      time.className = 'day-timeline__time'
      if (item.time) {
        if (item.time.qualifier) {
          const qualifier = document.createElement('small')
          qualifier.className = 'day-timeline__qualifier'
          qualifier.textContent = item.time.qualifier
          time.appendChild(qualifier)
        }
        const start = document.createElement('b')
        start.textContent = item.time.start
        time.appendChild(start)
        if (item.time.end) {
          const end = document.createElement('span')
          end.textContent = item.time.end
          time.appendChild(end)
        }
      } else {
        const raw = document.createElement('span')
        raw.className = 'day-timeline__time-raw'
        raw.textContent = item.raw
        time.appendChild(raw)
      }
      const card = document.createElement('div')
      card.className = 'day-timeline__card'
      if (item.key) {
        const badge = document.createElement('span')
        badge.className = 'day-timeline__badge'
        badge.textContent = '关键节点'
        card.appendChild(badge)
      }
      item.cells.forEach((cell, index) => {
        if (!cell.textContent.trim()) return
        const paragraph = document.createElement('p')
        paragraph.className = index === 0 ? 'day-timeline__title' : 'day-timeline__note'
        // 来自本地 Vue 正文的 DOM，不使用 innerHTML 重建，也不丢弃额外说明列。
        paragraph.append(...[...cell.childNodes].map((node) => node.cloneNode(true)))
        card.appendChild(paragraph)
      })
      li.append(time, card)
      list.appendChild(li)
    }
    wrap.replaceWith(list)
  }
}

export function decorateReadingSections(root) {
  const content = root.querySelector('.chapter-content')
  if (!content) return
  let sectionSignal = null
  let signal = null
  for (const block of content.children) {
    if (/^H[23]$/.test(block.tagName)) {
      if (block.tagName === 'H2') sectionSignal = readingSections[block.id] || null
      signal = readingSections[block.id] || sectionSignal
      // 子标题可以继承内容颜色，但只有显式登记的标题进入重点导航。
      const headingSignal = readingSections[block.id]
      if (headingSignal) {
        block.dataset.readingTone = headingSignal.tone
        block.dataset.readingLabel = headingSignal.label
      }
      continue
    }
    if (!signal) continue
    block.dataset.readingTone = signal.tone
    if (['risk', 'info'].includes(signal.tone) && block.matches('ul, ol') && !block.matches('.day-timeline') && !block.querySelector('.task-live')) {
      block.classList.add('reading-points')
    }
    if (signal.tone === 'risk' && block.matches('.table-scroll')) {
      const cells = block.querySelector('tbody tr')?.children.length
      if (cells === 2) block.classList.add('reading-decision-table')
    }
  }
}
