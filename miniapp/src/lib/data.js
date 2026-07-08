import raw from '../data/routines.json'
import descriptions from '../data/descriptions'

export const routines = raw.routines
export const categories = raw.categories

export function findRoutine(slug) {
  return routines.find((r) => r.slug === slug)
}

export function byCategory(cat) {
  return routines.filter((r) => r.category === cat)
}

export function exerciseImg(image) {
  // Иллюстрации пережаты в WebP; в данных исторически имена .png
  return `${import.meta.env.BASE_URL}exercises/${image.replace(/\.png$/, '.webp')}`
}

// Описание техники: берём из словаря по name_en, затем из самого JSON,
// и только в крайнем случае показываем плейсхолдер
export function exerciseDescription(e) {
  return (
    descriptions[e.name_en] ??
    e.description ??
    'Подробное описание этого упражнения скоро появится. А пока повторяй позу с иллюстрации: двигайся плавно, дыши ровно и не допускай боли.'
  )
}

// Обложки зон: берём картинку из пула упражнений категории,
// избегая повторов между зонами (обложки первых практик часто совпадают)
const categoryCovers = (() => {
  const used = new Set()
  const map = {}
  for (const key of Object.keys(categories)) {
    const pool = []
    for (const r of byCategory(key)) {
      if (r.cover) pool.push(r.cover)
      for (const e of r.exercises) pool.push(e.image)
    }
    const img = pool.find((p) => !used.has(p)) ?? pool[0]
    if (img) {
      used.add(img)
      map[key] = img
    }
  }
  return map
})()

export function categoryCover(cat) {
  const img = categoryCovers[cat]
  return img ? exerciseImg(img) : null
}

// Секунды на одно упражнение: длительность делим поровну,
// округляем до 5 секунд, держим в разумных пределах
export function secondsPerExercise(routine) {
  const total = routine.duration_min * 60
  const per = Math.round(total / routine.exercises.length / 5) * 5
  return Math.min(90, Math.max(20, per))
}

// Все уникальные упражнения — для конструктора
export const allExercises = (() => {
  const seen = new Map()
  for (const r of routines) {
    for (const e of r.exercises) {
      if (!seen.has(e.name_en)) seen.set(e.name_en, e)
    }
  }
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name, 'ru'))
})()

// Бесплатное упражнение дня — детерминированно по дню года
export function dailyFreeExercise() {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((now - start) / 86400000)
  return allExercises[(dayOfYear * 13) % allExercises.length]
}

// Подборка дня: детерминированно ротируем практики по дню года
export function dailyPicks(count = 3) {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((now - start) / 86400000)
  const picks = []
  for (let i = 0; i < count; i += 1) {
    picks.push(routines[(dayOfYear * count + i * 7) % routines.length])
  }
  return picks
}

const MONTHS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
]
const WEEKDAYS = [
  'Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота',
]

export function todayHeader() {
  const d = new Date()
  return {
    date: `${d.getDate()} ${MONTHS[d.getMonth()]}`,
    weekday: WEEKDAYS[d.getDay()],
  }
}

export function fmtTime(sec) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function plural(n, one, few, many) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}
