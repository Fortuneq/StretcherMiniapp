// Пользовательские программы из конструктора.
// localStorage — источник правды, зеркалим в TG CloudStorage и на бэкенд.
import { canUseApi, fetchCustomRoutines, pushCustomRoutines } from './api'
import { cloudGet, cloudSet } from './telegram'

const KEY = 'flexi.custom.v1'

let state = load()
const listeners = new Set()

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* повреждённые данные — начинаем заново */
  }
  return { routines: [], updated_at: 0 }
}

function persist({ push = true } = {}) {
  const raw = JSON.stringify(state)
  try {
    localStorage.setItem(KEY, raw)
  } catch {
    /* noop */
  }
  cloudSet(KEY, raw)
  if (push && canUseApi) {
    pushCustomRoutines(state.routines).catch(() => {})
  }
  listeners.forEach((fn) => fn(state))
}

// При старте берём самую свежую копию: бэкенд → облако → локальная
export async function syncCustomRoutines() {
  if (canUseApi) {
    try {
      const server = await fetchCustomRoutines()
      if (server.updated_at > state.updated_at) {
        state = { routines: server.routines, updated_at: server.updated_at }
        persist({ push: false })
        return
      }
      if (state.updated_at > server.updated_at && state.routines.length) {
        pushCustomRoutines(state.routines).catch(() => {})
      }
      return
    } catch {
      /* сеть недоступна — падаем на облако */
    }
  }
  const raw = await cloudGet(KEY)
  if (!raw) return
  try {
    const cloud = JSON.parse(raw)
    if (cloud.updated_at > state.updated_at) {
      state = cloud
      persist({ push: false })
    }
  } catch {
    /* noop */
  }
}

export function subscribeCustom(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getCustomRoutines() {
  return state
}

export function findCustomRoutine(id) {
  return state.routines.find((r) => r.id === id) ?? null
}

export function saveCustomRoutine({ title, per_sec, exercises }) {
  const routine = {
    id: `my-${Date.now().toString(36)}`,
    title: title.trim() || 'Моя растяжка',
    per_sec,
    duration_min: Math.max(1, Math.round((exercises.length * per_sec) / 60)),
    exercises,
    created_at: Date.now(),
  }
  state = {
    routines: [routine, ...state.routines].slice(0, 100),
    updated_at: Math.floor(Date.now() / 1000),
  }
  persist()
  return routine
}

export function removeCustomRoutine(id) {
  state = {
    routines: state.routines.filter((r) => r.id !== id),
    updated_at: Math.floor(Date.now() / 1000),
  }
  persist()
}
