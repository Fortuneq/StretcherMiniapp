import { useSyncExternalStore } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import RoutineCard from '../components/RoutineCard'
import { findRoutine, exerciseImg, plural } from '../lib/data'
import { getProgress, subscribe } from '../lib/store'
import { getCustomRoutines, subscribeCustom, removeCustomRoutine } from '../lib/customRoutines'
import { haptic } from '../lib/telegram'
import { BookmarkIcon, PlayIcon, TrashIcon } from '../components/Icons'

export default function Saved() {
  const navigate = useNavigate()
  const progress = useSyncExternalStore(subscribe, getProgress)
  const custom = useSyncExternalStore(subscribeCustom, getCustomRoutines)
  const saved = progress.bookmarks.map(findRoutine).filter(Boolean)
  const mine = custom.routines

  return (
    <div className="page">
      <header className="page-head">
        <h1>Сохранённые</h1>
        <p>Практики и твои собственные программы</p>
      </header>

      {mine.length > 0 && (
        <section className="myprogs">
          <h2 className="section-label">Мои программы</h2>
          {mine.map((r) => (
            <div className="myprog" key={r.id}>
              <button
                type="button"
                className="myprog__main"
                onClick={() => {
                  haptic('medium')
                  navigate(`/player/${r.id}`)
                }}
              >
                <span className="myprog__cluster">
                  {r.exercises.slice(0, 3).map((e, i) => (
                    <img src={exerciseImg(e.image)} alt="" key={`${e.image}-${i}`} />
                  ))}
                </span>
                <span className="myprog__body">
                  <strong>{r.title}</strong>
                  <span>
                    {r.exercises.length}{' '}
                    {plural(r.exercises.length, 'упражнение', 'упражнения', 'упражнений')} ·{' '}
                    ~{r.duration_min} мин
                  </span>
                </span>
                <PlayIcon />
              </button>
              <button
                type="button"
                className="icon-btn myprog__del"
                onClick={() => {
                  haptic('light')
                  removeCustomRoutine(r.id)
                }}
                aria-label={`Удалить ${r.title}`}
              >
                <TrashIcon width={18} height={18} />
              </button>
            </div>
          ))}
        </section>
      )}

      {saved.length === 0 && mine.length === 0 ? (
        <div className="empty">
          <BookmarkIcon width={40} height={40} />
          <h2>Пока пусто</h2>
          <p>
            Сохраняй практики закладкой или собери свою программу в конструкторе.
          </p>
          <Link className="btn btn--dark" to="/library">
            Смотреть практики
          </Link>
        </div>
      ) : (
        saved.length > 0 && (
          <section>
            {mine.length > 0 && <h2 className="section-label">Закладки</h2>}
            <div className="rgrid">
              {saved.map((r) => (
                <RoutineCard routine={r} key={r.slug} />
              ))}
            </div>
          </section>
        )
      )}
    </div>
  )
}
