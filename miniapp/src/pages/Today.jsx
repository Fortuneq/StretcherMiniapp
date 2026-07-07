import { Link } from 'react-router-dom'
import { useSyncExternalStore } from 'react'
import Cluster from '../components/Cluster'
import { categories, byCategory, categoryCover, dailyPicks, dailyFreeExercise, exerciseImg, routines, todayHeader, plural } from '../lib/data'
import { getStats } from '../lib/store'
import { getAccess, subscribeAccess } from '../lib/access'
import { getUser } from '../lib/telegram'
import { CheckIcon, FlameIcon, PlayIcon, LockIcon } from '../components/Icons'

export default function Today() {
  const { date, weekday } = todayHeader()
  const picks = dailyPicks(3)
  const stats = getStats()
  const user = getUser()
  const access = useSyncExternalStore(subscribeAccess, getAccess)
  const routinesCount = routines.length
  const isFree = access.status === 'free'
  const trialHoursLeft = Math.max(0, Math.ceil((access.trialUntil - Date.now()) / 3600000))

  return (
    <div className="page page--today">
      <header className="today-head">
        <div>
          <span className="today-head__date">{date}</span>
          <h1 className="today-head__title">{weekday}</h1>
        </div>
        <Link className="today-head__avatar" to="/profile" aria-label="Профиль">
          {user?.photo_url ? (
            <img src={user.photo_url} alt="" />
          ) : (
            <span>{(user?.first_name || 'S')[0]}</span>
          )}
        </Link>
      </header>

      {access.status === 'trial' && (
        <Link className="access-banner" to="/paywall">
          <span>
            Полный доступ: ещё {trialHoursLeft} {plural(trialHoursLeft, 'час', 'часа', 'часов')} бесплатно
          </span>
          <em>Тарифы</em>
        </Link>
      )}

      {isFree && (
        <>
          <Link className="free-daily" to="/player/daily-free">
            <span className="free-daily__img">
              <img src={exerciseImg(dailyFreeExercise().image)} alt="" />
            </span>
            <span className="free-daily__body">
              <em>Бесплатно сегодня</em>
              <strong>{dailyFreeExercise().name}</strong>
              <span>1 минута практики</span>
            </span>
            <PlayIcon />
          </Link>
          <Link className="access-banner access-banner--lock" to="/paywall">
            <LockIcon width={18} height={18} />
            <span>Все программы и конструктор — по подписке от 250 ₽/мес</span>
            <em>Открыть</em>
          </Link>
        </>
      )}

      {stats.activeStreak > 0 && (
        <div className="streak-pill">
          {stats.doneToday ? <CheckIcon /> : <FlameIcon />}
          <span>
            Стрик: {stats.activeStreak} {plural(stats.activeStreak, 'день', 'дня', 'дней')}
            {stats.doneToday ? ' · сегодня готово' : ' · не прерывай!'}
          </span>
        </div>
      )}

      <div className="daily-scroll">
        {picks.map((r, i) => (
          <Link className="daily-card" to={`/routine/${r.slug}`} key={r.slug}>
            <span className="daily-card__eyebrow">
              {i === 0
                ? `${r.duration_min} ${plural(r.duration_min, 'минута', 'минуты', 'минут')}`
                : `${r.duration_min} мин · ${categories[r.category]}`}
            </span>
            <h2 className="daily-card__title">{r.title}</h2>
            <Cluster exercises={r.exercises} />
          </Link>
        ))}
      </div>

      <Link className="all-link" to="/library">
        Все практики — {routinesCount} {plural(routinesCount, 'программа', 'программы', 'программ')}
        <span>→</span>
      </Link>

      <section className="areas">
        <h2 className="section-label">По зонам</h2>
        <div className="areas__grid">
          {Object.entries(categories).map(([key, label]) => {
            const cover = categoryCover(key)
            if (!cover) return null
            return (
              <Link className="area-card" to={`/library?cat=${key}`} key={key}>
                <span className="area-card__img">
                  <img src={cover} alt="" loading="lazy" />
                </span>
                <span className="area-card__label">{label}</span>
                <span className="area-card__count">{byCategory(key).length}</span>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}
