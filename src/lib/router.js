export function chapterSlug(file) {
  return String(file || '').replace(/\.md$/i, '')
}

export function buildChapterRoute(file, section = '') {
  const path = `/chapter/${encodeURIComponent(chapterSlug(file))}`
  return section ? `${path}?section=${encodeURIComponent(section)}` : path
}

export function buildChapterHash(file, section = '') {
  return `#${buildChapterRoute(file, section)}`
}

export function buildRoute(file, section = '') {
  const params = new URLSearchParams({ doc: file })
  if (section) params.set('section', section)
  return `#${params.toString()}`
}

export function parseLegacyRoute(hash = window.location.hash) {
  const value = hash.replace(/^#/, '')
  if (!value) return null
  if (!/^doc=[^&]+(?:&section=[^&]*)?$/.test(value)) return { invalid: true }
  const params = new URLSearchParams(value)
  const doc = params.get('doc')
  if (!doc) return { invalid: true }
  return { doc, section: params.get('section') || '' }
}

export function parseRoute(hash = window.location.hash) {
  return parseLegacyRoute(hash)
}
