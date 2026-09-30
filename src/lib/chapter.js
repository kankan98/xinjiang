export function chapterCode(doc, groupDocs = []) {
  if (doc.group === 'days') {
    const match = doc.title.match(/Day\s*(\d+)/i)
    return match ? `D${match[1]}` : 'D0'
  }

  const index = groupDocs.findIndex((item) => item.file === doc.file)
  return String(index + 1).padStart(2, '0')
}
