// Lead-форма: выбор тарифа и типа покупателя → POST /api/lead → редирект на оплату.
// payment_id кладём в localStorage — страница thanks.html проверит статус.
const form = document.getElementById('leadform')
const err = document.getElementById('err')
const paybtn = document.getElementById('paybtn')
const orgfields = document.getElementById('orgfields')
const PRICES = { month: 600, quarter: 1200, year: 3000 }

let buyerType = 'individual'
document.querySelectorAll('#buyer .seg__b').forEach((b) => {
  b.addEventListener('click', () => {
    buyerType = b.dataset.v
    document.querySelectorAll('#buyer .seg__b').forEach((x) => x.classList.toggle('is-active', x === b))
    orgfields.hidden = buyerType !== 'company'
    updateBtn()
  })
})

function selectedPlan() {
  return document.querySelector('input[name="plan"]:checked').value
}
function updateBtn() {
  paybtn.textContent = `Оплатить ${PRICES[selectedPlan()]} ₽`
}
document.querySelectorAll('input[name="plan"]').forEach((r) => r.addEventListener('change', updateBtn))
updateBtn()

form.addEventListener('submit', async (e) => {
  e.preventDefault()
  err.hidden = true
  paybtn.disabled = true
  paybtn.textContent = 'Создаём платёж…'
  const fd = new FormData(form)
  const utm = {}
  new URLSearchParams(location.search).forEach((v, k) => {
    if (k.startsWith('utm_')) utm[k] = v
  })
  try {
    const res = await fetch('/api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: fd.get('name'),
        contact: fd.get('contact'),
        email: fd.get('email'),
        plan: selectedPlan(),
        buyer_type: buyerType,
        org_name: fd.get('org_name'),
        inn: fd.get('inn'),
        website: fd.get('website'),
        utm,
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.detail || 'Что-то пошло не так')
    localStorage.setItem('stretcher.lead.payment', data.payment_id)
    location.href = data.confirmation_url
  } catch (ex) {
    err.textContent = ex.message
    err.hidden = false
    paybtn.disabled = false
    updateBtn()
  }
})
