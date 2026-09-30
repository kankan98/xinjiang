import { describe, expect, it } from 'vitest'
import { gates, itinerary, loadChapterSearchIndex } from '../../data/roadbook.js'
import { tripIntelligence } from '../../data/trip-intelligence.js'

const dayGuide = (day) => tripIntelligence.dailyGuides.find((guide) => guide.day === day)

describe('itinerary fallback closure', () => {
  it('offers a reduced Baihaba visit without requiring an extra hotel night', async () => {
    const index = await loadChapterSearchIndex()
    for (const name of ['Day2-布尔津-白哈巴.md', 'Day3-白哈巴-喀纳斯全天.md']) {
      expect(index[name]).toContain('不改住宿的减量线')
      expect(index[name]).toContain('不补赶观鱼台')
    }
    for (const id of ['G2', 'G4']) expect(gates.find((gate) => gate.id === id).fallback).toContain('D3')
    expect(dayGuide('D2').categories.find((category) => category.key === 'play').boundary).toContain('不改住宿')
    expect(dayGuide('D3').categories.find((category) => category.key === 'play').boundary).toContain('不补赶观鱼台')
    expect(itinerary.find(({ meta }) => meta.day === 'D3').meta.stay).toContain('鸿宇福瑞')
    expect(itinerary.find(({ meta }) => meta.day === 'D4').meta.focus).toContain('10:00')
  })

  it('recalculates the D3 pickup when the car remains in Tiereketi', async () => {
    const index = await loadChapterSearchIndex()
    for (const day of ['D2', 'D3']) {
      const file = dayGuide(day).file
      expect(index[file]).toContain('车停铁热克提')
      expect(index[file]).toContain('80 min')
      expect(dayGuide(day).hardStop).toContain('铁热克提')
    }
    expect(gates.find((gate) => gate.id === 'G3').fallback).toMatch(/不能套村内\s*16:30\s*发车/)
  })

  it('checks G577 before departure and again before choosing the D8 return', async () => {
    const index = await loadChapterSearchIndex()
    for (const day of ['D7', 'D8']) {
      const text = index[dayGuide(day).file].replace(/\s+/g, '')
      expect(text).toContain('10-08')
      expect(text).toContain('10-09出发前')
      expect(dayGuide(day).hardStop).toContain('G577')
      expect(dayGuide(day).hardStop).toContain('10-08')
    }
    expect(gates.find((gate) => gate.id === 'G1').pass).toMatch(/10-08\s*晚/)
    expect(gates.find((gate) => gate.id === 'G7').pass).toContain('G577')
    expect(tripIntelligence.timeline.find((item) => item.when.startsWith('10-08')).detail).toContain('G577')
  })

  it('keeps the early departure triggers independent and service availability conditional', async () => {
    const index = await loadChapterSearchIndex()
    const text = index[dayGuide('D8').file]
    expect(text).toContain('路况不稳、验车需更久或无可用宽限时')
    expect(text).not.toContain('路况不稳且无可用宽限时')
    expect(text).toContain('一级公路')
    expect(text).toContain('不承诺某服务区必到')
    expect(text).not.toContain('全天（以当天营业为准）')
    expect(itinerary.find(({ meta }) => meta.day === 'D8').meta.focus).toContain('09:40')
  })

  it('does not treat the late return window as a guaranteed connection to the 18:06 train', async () => {
    const index = await loadChapterSearchIndex()
    const text = index[dayGuide('D8').file].replace(/\s+/g, '')
    expect(text).toContain('正常目标17:00')
    expect(text).toContain('17:30抵达属于延误上限，不能保证赶上火车')
    expect(text).toContain('约18:00—18:10到口')
    expect(text).toContain('发车时刻不能当检票截止')
    expect(text).toContain('348m/4min38s')
    expect(text).toContain('行李留10min')
    expect(dayGuide('D8').hardStop).toContain('17:30')
    expect(itinerary.find(({ meta }) => meta.day === 'D8').meta.focus).toMatch(/取消旧\s*90\s*min\s*收官饭/)
  })

  it('distinguishes missing weather evidence from an unpublished forecast', () => {
    for (const day of ['D2', 'D5']) {
      const boundary = dayGuide(day).categories.find((category) => category.key === 'wear').boundary
      expect(boundary).toMatch(/^本攻略尚未取得/)
    }
  })

  it('keeps all gate fields identical in runtime data and the verification chapter', async () => {
    const index = await loadChapterSearchIndex()
    const text = index['03-全书一致性与政策时效性复核.md']
    const compact = (value) => value.replace(/\s+/g, '')
    for (const gate of gates) {
      for (const field of ['name', 'deadline', 'pass', 'fallback']) {
        expect(compact(text), `${gate.id}.${field}`).toContain(compact(gate[field]))
      }
    }
  })
})
