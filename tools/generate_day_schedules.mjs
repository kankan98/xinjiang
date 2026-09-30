import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'
import { extractTemplateBlock, templateToSearchText } from './generate_search_index.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const manifest = JSON.parse(await readFile(resolve(root, 'src/data/roadbook.manifest.json'), 'utf8'))
const result = {}

// 直接取正式章节的第一张「时间」表，首页不再维护另一份时间轴。
for (const doc of manifest.documents.filter((item) => item.group === 'days')) {
  const source = await readFile(resolve(root, 'src/pages/chapters/days', doc.file.replace(/\.md$/, '.vue')), 'utf8')
  const template = extractTemplateBlock(source, doc.file)
  const tables = [...template.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/g)]
  const table = tables.find((match) => {
    const first = match[1].match(/<thead\b[^>]*>[\s\S]*?<th\b[^>]*>([\s\S]*?)<\/th>/)
    return first && /^(时间|北京时间)$/.test(templateToSearchText(first[1]))
  })
  if (!table) throw new Error(`${doc.file}: missing primary schedule table`)
  const tbody = table[1].match(/<tbody\b[^>]*>([\s\S]*?)<\/tbody>/)?.[1] || ''
  const entries = [...tbody.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)].map((row) => {
    const cells = [...row[1].matchAll(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/g)]
    const [time, event, note] = cells.map((cell) => templateToSearchText(cell[1]))
    return { time, event, note: note || '', key: /<strong\b/.test(cells[0]?.[1] || '') }
  })
  if (entries.length < 4 || entries.some((entry) => !entry.time || !entry.event)) throw new Error(`${doc.file}: incomplete schedule`)
  result[doc.file] = entries
}

const target = resolve(root, 'src/generated/day-schedules.generated.json')
const serialized = JSON.stringify(result, null, 2) + '\n'
if (process.argv.includes('--check')) {
  const actual = await readFile(target, 'utf8').catch(() => '')
  if (actual !== serialized) throw new Error('Daily schedules are stale; run pnpm run generate:day-schedules')
  console.log(`Daily schedule check passed: ${Object.keys(result).length} chapters.`)
} else {
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, serialized, 'utf8')
  console.log(`Generated daily schedules from ${Object.keys(result).length} chapter time tables.`)
}
