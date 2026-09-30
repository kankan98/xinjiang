const memory = new Map()

function read(key) {
  try {
    return localStorage.getItem(key) ?? memory.get(key) ?? null
  } catch {
    return memory.get(key) ?? null
  }
}

function write(key, value) {
  memory.set(key, value)
  try {
    localStorage.setItem(key, value)
  } catch {
    // The in-memory copy preserves the setting for this page session.
  }
}

export function readTheme() {
  const value = read('roadbook:theme')
  return value === 'light' || value === 'dark' ? value : null
}

export function writeTheme(theme) {
  write('roadbook:theme', theme)
}

export function readChecks(file) {
  try {
    const value = JSON.parse(read(`roadbook:check:v3.9:${file}`) || '[]')
    return new Set(Array.isArray(value) ? value.filter((index) => Number.isInteger(index) && index >= 0) : [])
  } catch {
    return new Set()
  }
}

export function writeChecks(file, checks) {
  write(`roadbook:check:v3.9:${file}`, JSON.stringify([...checks]))
}

export function readRecentSearches() {
  try {
    const list = JSON.parse(read('roadbook:recent-searches') || '[]')
    return Array.isArray(list) ? list.filter((item) => typeof item === 'string' && item.trim()).slice(0, 6) : []
  } catch {
    return []
  }
}

export function writeRecentSearches(list) {
  write('roadbook:recent-searches', JSON.stringify(list.slice(0, 6)))
}

export function readLastChapter() {
  return read('roadbook:last-chapter') || null
}

export function writeLastChapter(slug) {
  write('roadbook:last-chapter', slug)
}

export function readPlannerState(key, fallback) {
  try {
    return JSON.parse(read(`roadbook:planner:v3.9:${key}`) || 'null') ?? fallback
  } catch {
    return fallback
  }
}

export function writePlannerState(key, value) {
  write(`roadbook:planner:v3.9:${key}`, JSON.stringify(value))
}
