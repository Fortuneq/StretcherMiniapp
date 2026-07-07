// Клиент flexi API. Авторизация — подпись Telegram initData;
// вне Telegram запросы не ходят (приложение живёт в локальном режиме).
const tg = window.Telegram?.WebApp ?? null

const BASE = import.meta.env.VITE_API_BASE ?? '/api'

export const canUseApi = Boolean(tg?.initData)

async function request(path, options = {}) {
  if (!canUseApi) throw new Error('no telegram auth')
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `tma ${tg.initData}`,
      ...options.headers,
    },
  })
  if (!res.ok) throw new Error(`api ${path}: ${res.status}`)
  return res.json()
}

export function fetchMe() {
  return request('/me')
}

export function createInvoice(plan) {
  return request('/invoice', { method: 'POST', body: JSON.stringify({ plan }) })
}

export function fetchCustomRoutines() {
  return request('/custom-routines')
}

export function pushCustomRoutines(routines) {
  return request('/custom-routines', {
    method: 'PUT',
    body: JSON.stringify({ routines }),
  })
}

// Оплата: получаем ссылку на инвойс и открываем нативное окно Telegram.
// Резолвится в true, если оплата прошла.
export async function purchase(plan) {
  const { link } = await createInvoice(plan)
  return new Promise((resolve) => {
    tg.openInvoice(link, (status) => resolve(status === 'paid'))
  })
}
