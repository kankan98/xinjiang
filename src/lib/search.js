export function buildSearchIndex(documents, bodyIndex = {}) {
  return new Map(documents.map((doc) => [doc.file, {
    title: doc.title.toLowerCase(),
    kicker: doc.kicker.toLowerCase(),
    summary: doc.summary.toLowerCase(),
    tags: doc.tags.join(' ').toLowerCase(),
    body: bodyIndex[doc.file] || '',
  }]))
}

export function matchDocument(doc, rawQuery, searchIndex) {
  const query = rawQuery.trim().toLowerCase()
  if (!query) return { doc, matches: [], snippet: doc.summary }
  const index = searchIndex.get(doc.file)
  const fields = [
    ['标题', index.title],
    ['编号', index.kicker],
    ['摘要', index.summary],
    ['标签', index.tags],
    ['正文', index.body.toLowerCase()],
  ]
  const matches = fields.filter(([, value]) => value.includes(query)).map(([label]) => label)
  let snippet = doc.summary
  if (matches.includes('正文')) {
    const at = index.body.toLowerCase().indexOf(query)
    if (at >= 0) snippet = `${at > 42 ? '…' : ''}${index.body.slice(Math.max(0, at - 42), at + rawQuery.trim().length + 66)}${at + rawQuery.trim().length + 66 < index.body.length ? '…' : ''}`
  }
  return { doc, matches, snippet }
}
