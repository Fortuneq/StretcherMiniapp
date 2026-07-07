import { useState, useSyncExternalStore } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckIcon } from '../components/Icons'
import { getAccess, subscribeAccess, buyPlan } from '../lib/access'
import { canUseApi } from '../lib/api'
import { haptic } from '../lib/telegram'
import { plural } from '../lib/data'

const BENEFITS = [
  'Все 60+ программ растяжки',
  'Конструктор и свои программы',
  'Статистика, стрики и флексометр',
  'Новые программы каждый месяц',
]

export default function Paywall() {
  const navigate = useNavigate()
  const access = useSyncExternalStore(subscribeAccess, getAccess)
  const [planId, setPlanId] = useState('year')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const plans = access.plans
  const month = plans.find((p) => p.id === 'month')
  const selected = plans.find((p) => p.id === planId) ?? plans[0]

  async function buy() {
    setBusy(true)
    setError(null)
    try {
      haptic('medium')
      const paid = await buyPlan(selected.id)
      if (paid) {
        haptic('success')
        navigate('/', { replace: true })
      }
    } catch {
      setError('Не получилось открыть оплату. Попробуй ещё раз.')
    } finally {
      setBusy(false)
    }
  }

  function perMonth(p) {
    return Math.round(p.rub / Math.round(p.days / 30))
  }

  return (
    <div className="page paywall">
      <div className="paywall__hero">
        <h1>Полный доступ</h1>
        <p>Бесплатно — одно упражнение в день. С подпиской — всё и без ограничений.</p>
      </div>

      <ul className="paywall__benefits">
        {BENEFITS.map((b) => (
          <li key={b}>
            <CheckIcon width={18} height={18} />
            {b}
          </li>
        ))}
      </ul>

      <div className="plans">
        {plans.map((p) => (
          <button
            type="button"
            key={p.id}
            className={`plan${p.id === planId ? ' is-active' : ''}`}
            onClick={() => {
              haptic('light')
              setPlanId(p.id)
            }}
          >
            <span className="plan__title">
              {p.title}
              {p.id === 'year' && <em className="plan__badge">выгодно</em>}
            </span>
            <span className="plan__price">{p.rub} ₽</span>
            <span className="plan__permonth">
              {p.id === 'month'
                ? 'полная цена'
                : `${perMonth(p)} ₽/мес · скидка ${Math.round(100 - (perMonth(p) / month.rub) * 100)}%`}
            </span>
          </button>
        ))}
      </div>

      {canUseApi ? (
        <>
          <button
            type="button"
            className="btn btn--dark btn--big paywall__cta"
            disabled={busy}
            onClick={buy}
          >
            {busy ? 'Открываем оплату…' : `Оформить за ${selected.rub} ₽`}
          </button>
          <p className="paywall__note">
            Оплата в Telegram Stars ({selected.stars} ⭐) ·{' '}
            {selected.days} {plural(selected.days, 'день', 'дня', 'дней')} полного доступа
          </p>
          {error && <p className="paywall__error">{error}</p>}
        </>
      ) : (
        <>
          <a className="btn btn--dark btn--big paywall__cta" href="https://t.me/stretcher_robot">
            Оформить в Telegram
          </a>
          <p className="paywall__note">
            Подписка оформляется в приложении Telegram — открой @stretcher_robot.
          </p>
        </>
      )}
    </div>
  )
}
