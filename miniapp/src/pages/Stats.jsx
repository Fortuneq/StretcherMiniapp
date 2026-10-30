import { useState, useSyncExternalStore } from 'react'
import { getProgress, getStats, subscribe } from '../lib/store'
import { findRoutine, plural } from '../lib/data'
import { haptic } from '../lib/telegram'

const WD = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

// Дуга флексометра: 270°, от 135° до 405°
function arcPath(fraction) {
  const start = 135
  const sweep = 270 * Math.min(1, Math.max(0.001, fraction))
  const r = 42
  const cx = 50
  const cy = 50
  const a0 = (start * Math.PI) / 180
  const a1 = ((start + sweep) * Math.PI) / 180
  const x0 = cx + r * Math.cos(a0)
  const y0 = cy + r * Math.sin(a0)
  const x1 = cx + r * Math.cos(a1)
  const y1 = cy + r * Math.sin(a1)
  return `M ${x0} ${y0} A ${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${x1} ${y1}`
}

export default function Stats() {
  const progress = useSyncExternalStore(subscribe, getProgress)
  const [tab, setTab] = useState('stats')
  const stats = getStats()

  const history = [...progress.sessions].sort((a, b) => b.ts - a.ts)

  return (
    <div className="page">
      <header className="page-head page-head--center">
        <h1>Статистика</h1>
      </header>

      <div className="seg">
        {[
          ['stats', 'Статистика'],
          ['history', 'История'],
        ].map(([key, label]) => (
          <button
            type="button"
            key={key}
            className={`seg__btn${tab === key ? ' is-active' : ''}`}
            onClick={() => {
              haptic('light')
              setTab(key)
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'stats' ? (
        <>
          <div className="meter">
            <svg viewBox="0 0 100 100" className="meter__svg">
              <path className="meter__track" d={arcPath(1)} />
              <path className="meter__bar" d={arcPath(stats.meter / 100)} />
            </svg>
            <div className="meter__center">
              <span className="meter__label">Флексометр</span>
              <strong className="meter__value">{stats.meter}%</strong>
              <span className="meter__next">
                {stats.doneToday ? 'Завтра: +2%' : 'Сегодня: +2% за практику'}
              </span>
            </div>
          </div>

          <div className="week">
            {stats.week.map((d, i) => (
              <div className={`week__day${d.active ? ' is-active' : ''}`} key={d.key}>
                <span className="week__dot" />
                <span className="week__label">{WD[(new Date(`${d.key}T12:00:00`).getDay() + 6) % 7] ?? WD[i]}</span>
              </div>
            ))}
          </div>

          <h2 className="section-label">Мои показатели</h2>
          <div className="stat-grid">
            <div className="stat-card">
              <span>Активный стрик</span>
              <strong>
                {stats.activeStreak} {plural(stats.activeStreak, 'день', 'дня', 'дней')}
              </strong>
            </div>
            <div className="stat-card">
              <span>Лучший стрик</span>
              <strong>
                {stats.longestStreak} {plural(stats.longestStreak, 'день', 'дня', 'дней')}
              </strong>
            </div>
            <div className="stat-card">
              <span>Всего практик</span>
              <strong>{stats.totalSessions}</strong>
            </div>
            <div className="stat-card">
              <span>Минут растяжки</span>
              <strong>{stats.totalMinutes}</strong>
            </div>
          </div>
        </>
      ) : history.length === 0 ? (
        <div className="empty">
          <h2>Историй пока нет</h2>
          <p>Заверши первую практику — она появится здесь.</p>
        </div>
      ) : (
        <ul className="history">
          {history.map((s) => {
            const r = findRoutine(s.slug)
            const d = new Date(s.ts)
            return (
              <li className="history__row" key={s.ts}>
                <span className="history__date">
                  {d.getDate().toString().padStart(2, '0')}.
                  {(d.getMonth() + 1).toString().padStart(2, '0')}
                </span>
                <span className="history__body">
                  <span className="history__title">{s.title ?? r?.title ?? 'Практика'}</span>
                  <span className="history__meta">
                    {s.minutes} мин · {s.exercises} упр.
                  </span>
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
