import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const manifestPath = resolve(workspaceRoot, 'src/data/roadbook.manifest.json')
const chaptersRoot = resolve(workspaceRoot, 'src/pages/chapters')
const defaultOutputPath = resolve(workspaceRoot, 'src/generated/search-index.generated.json')

const namedEntities = new Map([
  ['amp', '&'], ['apos', "'"], ['bull', '•'], ['copy', '©'], ['emsp', '\u2003'],
  ['ensp', '\u2002'], ['gt', '>'], ['hellip', '…'], ['laquo', '«'], ['ldquo', '“'],
  ['lsquo', '‘'], ['lt', '<'], ['mdash', '—'], ['middot', '·'], ['nbsp', '\u00a0'],
  ['ndash', '–'], ['quot', '"'], ['raquo', '»'], ['rdquo', '”'], ['reg', '®'],
  ['rsquo', '’'], ['thinsp', '\u2009'], ['times', '×'], ['trade', '™'],
])

export function extractTemplateBlock(source, label = 'Vue component') {
  const opening = source.match(/<template(?:\s[^>]*)?>/iu)
  const closingStart = source.lastIndexOf('</template>')
  if (!opening || opening.index === undefined || closingStart < opening.index + opening[0].length) {
    throw new Error(`${label}: cannot find one complete <template> block`)
  }
  return source.slice(opening.index + opening[0].length, closingStart)
}

export function decodeHtmlEntities(text) {
  return text.replace(/&(#(?:[xX][\da-fA-F]+|\d+)|[A-Za-z][\dA-Za-z]+);/gu, (entity, reference) => {
    if (!reference.startsWith('#')) return namedEntities.get(reference) ?? entity
    const hexadecimal = reference[1]?.toLowerCase() === 'x'
    const digits = reference.slice(hexadecimal ? 2 : 1)
    const codePoint = Number.parseInt(digits, hexadecimal ? 16 : 10)
    if (!Number.isInteger(codePoint) || codePoint === 0 || codePoint > 0x10ffff || (codePoint >= 0xd800 && codePoint <= 0xdfff)) {
      return '\ufffd'
    }
    return String.fromCodePoint(codePoint)
  })
}

function removeMarkup(template, label) {
  const chunks = []
  let cursor = 0
  while (cursor < template.length) {
    if (template[cursor] !== '<') {
      chunks.push(template[cursor])
      cursor += 1
      continue
    }

    let quote = null
    let end = cursor + 1
    for (; end < template.length; end += 1) {
      const character = template[end]
      if (quote) {
        if (character === quote) quote = null
      } else if (character === '"' || character === "'") quote = character
      else if (character === '>') break
    }
    if (end >= template.length) throw new Error(`${label}: HTML tag is not closed`)
    chunks.push(' ')
    cursor = end + 1
  }
  return chunks.join('')
}

export function templateToSearchText(template, label = 'Vue template') {
  const withoutComments = template.replace(/<!--[\s\S]*?-->/gu, '')
  if (withoutComments.includes('<!--') || withoutComments.includes('-->')) {
    throw new Error(`${label}: HTML comment is not closed correctly`)
  }
  if (withoutComments.includes('{{') || withoutComments.includes('}}')) {
    throw new Error(`${label}: text interpolation cannot be resolved into a static search index`)
  }
  return decodeHtmlEntities(removeMarkup(withoutComments, label)).replace(/\s+/gu, ' ').trim()
}

export async function buildSearchIndex() {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  if (!Array.isArray(manifest.documents) || manifest.documents.length !== 23) {
    throw new Error(`roadbook manifest must contain 23 documents; received ${manifest.documents?.length ?? 0}`)
  }

  const index = {}
  for (const document of manifest.documents) {
    if (typeof document.file !== 'string' || typeof document.group !== 'string') {
      throw new Error('every roadbook document must define string file and group fields')
    }
    if (Object.hasOwn(index, document.file)) throw new Error(`duplicate roadbook document: ${document.file}`)
    const componentPath = resolve(chaptersRoot, document.group, document.file.replace(/\.md$/iu, '.vue'))
    const source = await readFile(componentPath, 'utf8')
    const label = `${document.file} (${componentPath})`
    const body = templateToSearchText(extractTemplateBlock(source, label), label)
    if (!body) throw new Error(`${label}: extracted search text is empty`)
    index[document.file] = body
  }
  return index
}

function parseArguments(argumentsList) {
  const options = { check: false, dryRun: false, outputPath: defaultOutputPath }
  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index]
    if (argument === '--check') options.check = true
    else if (argument === '--dry-run') options.dryRun = true
    else if (argument === '--output') {
      if (!argumentsList[index + 1]) throw new Error('--output requires a file path')
      options.outputPath = resolve(process.cwd(), argumentsList[index + 1])
      index += 1
    } else if (argument === '--help') options.help = true
    else throw new Error(`unknown argument: ${argument}`)
  }
  if (options.check && options.dryRun) throw new Error('--check and --dry-run cannot be combined')
  return options
}

function compareIndexes(actual, expected) {
  const actualFiles = actual && typeof actual === 'object' && !Array.isArray(actual) ? Object.keys(actual) : []
  const expectedFiles = Object.keys(expected)
  return {
    missing: expectedFiles.filter((file) => !Object.hasOwn(actual || {}, file)),
    extra: actualFiles.filter((file) => !Object.hasOwn(expected, file)),
    changed: expectedFiles.filter((file) => Object.hasOwn(actual || {}, file) && actual[file] !== expected[file]),
  }
}

function printHelp() {
  console.log(`Usage: node tools/generate_search_index.mjs [options]

Options:
  --check          Compare with the output file without writing
  --dry-run        Extract and validate all chapter text without writing
  --output <path>  Override the generated JSON path
  --help           Show this help`)
}

async function run() {
  const options = parseArguments(process.argv.slice(2))
  if (options.help) {
    printHelp()
    return
  }

  const searchIndex = await buildSearchIndex()
  if (options.dryRun) {
    console.log(`Search index dry run passed: ${Object.keys(searchIndex).length} Vue chapters extracted.`)
    return
  }

  if (options.check) {
    let actual
    try {
      actual = JSON.parse(await readFile(options.outputPath, 'utf8'))
    } catch (error) {
      if (error.code === 'ENOENT') throw new Error(`search index does not exist: ${options.outputPath}`)
      throw new Error(`cannot read search index ${options.outputPath}: ${error.message}`)
    }
    const differences = compareIndexes(actual, searchIndex)
    const details = [
      differences.missing.length ? `missing: ${differences.missing.join(', ')}` : '',
      differences.extra.length ? `extra: ${differences.extra.join(', ')}` : '',
      differences.changed.length ? `changed: ${differences.changed.join(', ')}` : '',
    ].filter(Boolean)
    if (details.length) {
      throw new Error(`search index is stale (${options.outputPath})\n${details.join('\n')}\nRun pnpm run generate:search.`)
    }
    console.log(`Search index is current: ${Object.keys(searchIndex).length} Vue chapters.`)
    return
  }

  await mkdir(dirname(options.outputPath), { recursive: true })
  await writeFile(options.outputPath, `${JSON.stringify(searchIndex, null, 2)}\n`, 'utf8')
  console.log(`Search index generated: ${Object.keys(searchIndex).length} Vue chapters -> ${options.outputPath}`)
}

const isMainModule = process.argv[1]
  && pathToFileURL(resolve(process.argv[1])).href === import.meta.url

if (isMainModule) {
  run().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}
