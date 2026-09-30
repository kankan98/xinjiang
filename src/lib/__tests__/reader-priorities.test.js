import { describe, expect, it } from 'vitest'
import manifest from '../../data/roadbook.manifest.json'
import { readingFocus } from '../../data/reading-focus.js'
import { decorateReadingSections, parseTimeRange, transformScheduleTables } from '../reader-priorities.js'

const chapters = import.meta.glob('../../pages/chapters/**/*.vue', { query: '?raw', import: 'default', eager: true })
const fixture = (html) => {
  const root = document.createElement('div')
  root.innerHTML = html
  return root
}

describe('reading priorities', () => {
  it('gives every chapter three short summaries linked to real source headings', () => {
    expect(Object.keys(readingFocus).sort()).toEqual(manifest.documents.map((doc) => doc.file).sort())
    for (const doc of manifest.documents) {
      const source = chapters[`../../pages/chapters/${doc.group}/${doc.file.replace(/\.md$/, '.vue')}`]
      const ids = new Set([...source.matchAll(/<h[23] id="([^"]+)"/g)].map((match) => match[1]))
      const entries = readingFocus[doc.file]
      expect(entries, doc.file).toHaveLength(3)
      for (const item of entries) {
        expect(ids.has(item.section), `${doc.file}: ${item.section}`).toBe(true)
        expect(['key', 'risk', 'info']).toContain(item.tone)
        expect(item.title.length).toBeGreaterThan(0)
        expect(item.detail.length).toBeGreaterThan(0)
        for (const time of `${item.title} ${item.detail}`.match(/\d{2}:\d{2}/g) || []) {
          expect(source.includes(time), `${doc.file}: summary time ${time} exists in source`).toBe(true)
        }
      }
    }
  })

  it('keeps timing qualifiers, emphasis, links and all note columns when making a timeline', () => {
    const root = fixture(`<div class="table-scroll" aria-label="往返班车"><table>
      <thead><tr><th>北京时间</th><th>安排</th><th>边界</th><th>资料</th></tr></thead><tbody>
      <tr><th><strong>不晚于 16:00</strong></th><td><strong>返程发车</strong></td><td><strong>不是抵达时间</strong></td><td><a href="#/chapter/day3" data-doc="Day3.md" data-section="班次">完整班次</a></td></tr>
      <tr><th>约 20:00—21:15</th><td>回村</td><td>时间待确认</td></tr>
      <tr><th>次日 02:15</th><td>航班起飞</td><td>按客票</td></tr>
      <tr><th>抵达后</th><td>休息</td><td>按体力安排</td></tr>
      </tbody></table></div>`)
    transformScheduleTables(root)
    expect(root.querySelector('.day-timeline').getAttribute('aria-label')).toBe('往返班车')
    expect(root.querySelectorAll('.day-timeline__item')).toHaveLength(4)
    expect(root.querySelectorAll('.day-timeline__badge')).toHaveLength(1)
    expect([...root.querySelectorAll('.day-timeline__qualifier')].map((el) => el.textContent)).toEqual(['不晚于', '约', '次日'])
    expect(root.querySelector('.day-timeline__title strong').textContent).toBe('返程发车')
    expect(root.querySelector('.day-timeline__note strong').textContent).toBe('不是抵达时间')
    expect(root.querySelector('a[data-doc="Day3.md"]').getAttribute('data-section')).toBe('班次')
    expect(root.querySelector('.day-timeline__time-raw').textContent).toBe('抵达后')
    const firstPass = root.innerHTML
    transformScheduleTables(root)
    expect(root.innerHTML).toBe(firstPass)
  })

  it('does not turn price tables or mostly untimed lists into schedules', () => {
    const root = fixture(`<div class="table-scroll"><table><thead><tr><th>票价</th></tr></thead><tbody>
      ${Array.from({ length: 4 }, () => '<tr><th>10:00</th><td>开放时间</td></tr>').join('')}
      </tbody></table></div><div class="table-scroll"><table><thead><tr><th>时间</th></tr></thead><tbody>
      <tr><th>10:00</th><td>仅一项有具体时刻</td></tr>
      ${Array.from({ length: 3 }, () => '<tr><th>待确认</th><td>待确认</td></tr>').join('')}
      </tbody></table></div>`)
    transformScheduleTables(root)
    expect(root.querySelectorAll('table')).toHaveLength(2)
    expect(root.querySelectorAll('.day-timeline')).toHaveLength(0)
  })

  it('marks explicit risk sections without leaking into ordinary content or damaging checklists', () => {
    const root = fixture(`<div class="chapter-content">
      <h2 id="风险与降级">风险与降级</h2><h3 id="延误">延误</h3>
      <ul><li><strong>未赶上：</strong>改走备线</li></ul>
      <div class="table-scroll"><table><tbody><tr><th>条件</th><td>动作</td></tr></tbody></table></div>
      <h2 id="普通说明">普通说明</h2><p>风险这个词不自动触发标记。</p>
      <h2 id="今日可选项">今日可选项</h2><ol class="day-timeline"><li>原有时间轴</li></ol>
      <h2 id="出发前核验">出发前核验</h2><ul><li><label class="task-live"><input type="checkbox" data-check-index="7" checked>证件</label></li></ul>
      </div>`)
    decorateReadingSections(root)
    expect(root.querySelector('#风险与降级').dataset.readingTone).toBe('risk')
    expect(root.querySelector('#延误').dataset.readingTone).toBeUndefined()
    expect(root.querySelector('.reading-points').dataset.readingTone).toBe('risk')
    expect(root.querySelectorAll('.reading-decision-table')).toHaveLength(1)
    expect(root.querySelector('p').dataset.readingTone).toBeUndefined()
    expect(root.querySelector('.day-timeline').classList.contains('reading-points')).toBe(false)
    expect(root.querySelector('input').checked).toBe(true)
    expect(root.querySelector('input').dataset.checkIndex).toBe('7')
    const firstPass = root.innerHTML
    decorateReadingSections(root)
    expect(root.innerHTML).toBe(firstPass)
  })

  it('keeps next-day, before, after and approximate qualifiers distinct', () => {
    expect(parseTimeRange('10-10 23:30—10-11 00:15')).toEqual({ start: '23:30', end: '00:15', qualifier: '10-10 至 10-11' })
    expect(parseTimeRange('次日 01:15')).toEqual({ start: '01:15', end: '', qualifier: '次日' })
    expect(parseTimeRange('不晚于 16:00')).toEqual({ start: '16:00', end: '', qualifier: '不晚于' })
    expect(parseTimeRange('约 8:30—9:00')).toEqual({ start: '08:30', end: '09:00', qualifier: '约' })
    expect(parseTimeRange('21:30 后')).toEqual({ start: '21:30', end: '', qualifier: '后' })
    expect(parseTimeRange('根据现场情况')).toBeNull()
  })
})
