// Клиент stretcher API. Авторизация — подпись Telegram initData;
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

// Оплата Stars: получаем ссылку на инвойс и открываем нативное окно Telegram.
// Резолвится в true, если оплата прошла.
export async function purchase(plan) {
  const { link } = await createInvoice(plan)
  return new Promise((resolve) => {
    tg.openInvoice(link, (status) => resolve(status === 'paid'))
  })
}

// Доступные способы оплаты (без авторизации)
export async function fetchPayMethods() {
  try {
    const res = await fetch(`${BASE}/pay/methods`)
    if (!res.ok) throw new Error()
    return res.json()
  } catch {
    return { stars: true, yookassa: false }
  }
}

// Оплата картой через ЮKassa: создаём платёж и открываем страницу оплаты.
// details: { email, org_name?, inn? }
export async function payYookassa(plan, buyerType, details) {
  const { confirmation_url } = await request('/pay/yookassa', {
    method: 'POST',
    body: JSON.stringify({ plan, buyer_type: buyerType, ...details }),
  })
  if (tg?.openLink) tg.openLink(confirmation_url)
  else window.open(confirmation_url, '_blank')
}
