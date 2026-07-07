// Прогресс пользователя: сессии, закладки. localStorage — источник правды,
// Telegram CloudStorage — зеркало для переносимости между устройствами.
import { cloudGet, cloudSet } from './telegram'

const KEY = 'flexi.progress.v1'

const empty = { sessions: [], bookmarks: [] }

let state = load()
const listeners = new Set()

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...empty, ...JSON.parse(raw) }
  } catch {
    /* повреждённые данные — начинаем заново */
  }
  return { ...empty }
}

function persist() {
  const raw = JSON.stringify(state)
  try {
    localStorage.setItem(KEY, raw)
  } catch {
    /* noop */
  }
  cloudSet(KEY, raw)
  listeners.forEach((fn) => fn(state))
}

// При старте подтягиваем облако: если там история длиннее — берём её.
export async function syncFromCloud() {
  const raw = await cloudGet(KEY)
  if (!raw) return
  try {
    const cloud = { ...empty, ...JSON.parse(raw) }
    if (cloud.sessions.length > state.sessions.length) {
      state = cloud
      persist()
    }
  } catch {
    /* noop */
  }
}

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getProgress() {
  return state
}

export function todayKey(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function recordSession({ slug, title, minutes, exercises }) {
  state = {
    ...state,
    sessions: [
      ...state.sessions,
      { date: todayKey(), ts: Date.now(), slug, title, minutes, exercises },
    ],
  }
  persist()
}

export function toggleBookmark(slug) {
  const has = state.bookmarks.includes(slug)
  state = {
    ...state,
    bookmarks: has
      ? state.bookmarks.filter((s) => s !== slug)
      : [...state.bookmarks, slug],
  }
  persist()
  return !has
}

export function isBookmarked(slug) {
  return state.bookmarks.includes(slug)
}

// --- Производные метрики ---

function activeDaySet() {
  return new Set(state.sessions.map((s) => s.date))
}

function shiftDay(key, delta) {
  const d = new Date(`${key}T12:00:00`)
  d.setDate(d.getDate() + delta)
  return todayKey(d)
}

export function getStats() {
  const days = activeDaySet()
  const today = todayKey()

  // Активный стрик: непрерывные дни, заканчивающиеся сегодня или вчера
  let active = 0
  let cursor = days.has(today) ? today : shiftDay(today, -1)
  while (days.has(cursor)) {
    active += 1
    cursor = shiftDay(cursor, -1)
  }

  // Лучший стрик за всю историю
  let longest = 0
  const sorted = [...days].sort()
  let run = 0
  let prev = null
  for (const d of sorted) {
    run = prev && shiftDay(prev, 1) === d ? run + 1 : 1
    longest = Math.max(longest, run)
    prev = d
  }

  // Флексометр: +2% за активный день, −1% за пропуск, в пределах [0, 100]
  let meter = 0
  if (sorted.length > 0) {
    let d = sorted[0]
    while (d <= today) {
      meter = Math.min(100, Math.max(0, meter + (days.has(d) ? 2 : -1)))
      d = shiftDay(d, 1)
    }
  }

  const totalMinutes = state.sessions.reduce((sum, s) => sum + s.minutes, 0)

  // Последние 7 дней для недельной полоски (сегодня — справа)
  const week = []
  for (let i = 6; i >= 0; i -= 1) {
    const key = shiftDay(today, -i)
    week.push({ key, active: days.has(key) })
  }

  return {
    meter,
    activeStreak: active,
    longestStreak: longest,
    totalSessions: state.sessions.length,
    totalMinutes,
    week,
    doneToday: days.has(today),
  }
}
