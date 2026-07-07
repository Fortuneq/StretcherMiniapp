import { useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import { getAccess, subscribeAccess } from '../lib/access'
import { getStats } from '../lib/store'
import { getCustomRoutines, subscribeCustom } from '../lib/customRoutines'
import { getUser } from '../lib/telegram'
import { plural } from '../lib/data'
import { CheckIcon, LockIcon } from '../components/Icons'

function fmtDate(ts) {
  return new Date(ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
}

export default function Profile() {
  const access = useSyncExternalStore(subscribeAccess, getAccess)
  const custom = useSyncExternalStore(subscribeCustom, getCustomRoutines)
  const user = getUser()
  const stats = getStats()

  const sub =
    access.status === 'premium'
      ? {
          title: 'Подписка активна',
          sub: `Полный доступ до ${fmtDate(access.premiumUntil)}`,
          cta: 'Продлить',
        }
      : access.status === 'trial'
        ? {
            title: 'Пробный доступ',
            sub: `Полный доступ ещё ${Math.max(1, Math.ceil((access.trialUntil - Date.now()) / 3600000))} ч — дальше 1 упражнение в день`,
            cta: 'Оформить подписку',
          }
        : {
            title: 'Бесплатный режим',
            sub: 'Одно упражнение в день. Подписка откроет все программы и конструктор.',
            cta: 'Оформить подписку',
          }

  return (
    <div className="page page--profile">
      <header className="profile-head">
        <div className="profile-head__avatar">
          {user?.photo_url ? (
            <img src={user.photo_url} alt="" />
          ) : (
            <span>{(user?.first_name || 'S')[0]}</span>
          )}
        </div>
        <h1>{user?.first_name || 'Гость'}</h1>
        {user?.username && <p className="profile-head__nick">@{user.username}</p>}
      </header>

      <section className={`subcard${access.status === 'premium' ? ' subcard--active' : ''}`}>
        <div className="subcard__icon">
          {access.status === 'premium' ? <CheckIcon /> : <LockIcon />}
        </div>
        <div className="subcard__body">
          <strong>{sub.title}</strong>
          <span>{sub.sub}</span>
        </div>
        <Link className="btn btn--dark" to="/paywall">
          {sub.cta}
        </Link>
      </section>

      <section className="profile-stats">
        <div className="done-stat">
          <strong>{stats.activeStreak}</strong>
          <span>{plural(stats.activeStreak, 'день подряд', 'дня подряд', 'дней подряд')}</span>
        </div>
        <div className="done-stat">
          <strong>{stats.totalSessions}</strong>
          <span>{plural(stats.totalSessions, 'практика', 'практики', 'практик')}</span>
        </div>
        <div className="done-stat">
          <strong>{stats.totalMinutes}</strong>
          <span>{plural(stats.totalMinutes, 'минута', 'минуты', 'минут')}</span>
        </div>
      </section>

      <nav className="profile-links">
        <Link to="/saved">
          Мои программы
          <em>{custom.routines.length}</em>
        </Link>
        <Link to="/stats">Статистика и история</Link>
        <a href="/docs/oferta.html" target="_blank" rel="noreferrer">Оферта и правила сервиса</a>
        <a href="/docs/privacy.html" target="_blank" rel="noreferrer">Политика обработки ПДн</a>
        <a href="/docs/consent.html" target="_blank" rel="noreferrer">Согласие на обработку ПДн</a>
      </nav>

      <p className="profile-note">
        Удалить аккаунт и данные: команда /delete_me в боте @stretcher_robot.
      </p>
    </div>
  )
}
