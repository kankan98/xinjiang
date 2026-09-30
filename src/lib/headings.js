export function slugify(text) {
  return text
    .replace(/[*_`]/g, '')
    .replace(/[^一-鿿\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase() || 'section'
}

export function stableSectionId(text, occurrences) {
  const base = slugify(text)
  const next = (occurrences.get(base) || 0) + 1
  occurrences.set(base, next)
  return next === 1 ? base : `${base}-${next}`
}
