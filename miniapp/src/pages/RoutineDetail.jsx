import { useState, useSyncExternalStore } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Cluster from '../components/Cluster'
import InfoSheet from '../components/InfoSheet'
import { BookmarkIcon, BackIcon, PlayIcon, LockIcon } from '../components/Icons'
import { categories, findRoutine, exerciseImg, fmtTime, secondsPerExercise, plural } from '../lib/data'
import { getProgress, subscribe, toggleBookmark } from '../lib/store'
import { getAccess, subscribeAccess } from '../lib/access'
import { haptic, isTelegram } from '../lib/telegram'

export default function RoutineDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const progress = useSyncExternalStore(subscribe, getProgress)
  const access = useSyncExternalStore(subscribeAccess, getAccess)
  const [info, setInfo] = useState(null)
  const routine = findRoutine(slug)
  const locked = access.status === 'free'

  if (!routine) {
    return (
      <div className="page">
        <div className="empty">
          <h2>Практика не найдена</h2>
          <Link className="btn btn--dark" to="/library">К практикам</Link>
        </div>
      </div>
    )
  }

  const saved = progress.bookmarks.includes(routine.slug)
  const perSec = secondsPerExercise(routine)
  const count = routine.exercises.length

  return (
    <div className="page page--detail">
      <header className="detail-head">
        {!isTelegram && (
          <button type="button" className="icon-btn" onClick={() => navigate(-1)} aria-label="Назад">
            <BackIcon />
          </button>
        )}
        <button
          type="button"
          className={`icon-btn detail-head__save${saved ? ' is-active' : ''}`}
          onClick={() => {
            haptic('medium')
            toggleBookmark(routine.slug)
          }}
          aria-label={saved ? 'Убрать из сохранённых' : 'Сохранить'}
        >
          <BookmarkIcon filled={saved} />
        </button>
      </header>

      <div className="detail-hero">
        <Cluster exercises={routine.exercises} />
        <span className="rcard__cat">{categories[routine.category]}</span>
        <h1>{routine.title}</h1>
        <p className="detail-hero__meta">
          {routine.duration_min} мин · {count} {plural(count, 'упражнение', 'упражнения', 'упражнений')}
        </p>
        <p className="detail-hero__desc">{routine.description}</p>
      </div>

      <ol className="exlist">
        {routine.exercises.map((e, i) => (
          <li key={`${e.image}-${i}`}>
            <button
              type="button"
              className="exrow"
              onClick={() => {
                haptic('light')
                setInfo(e)
              }}
            >
              <span className="exrow__num">{i + 1}</span>
              <img className="exrow__img" src={exerciseImg(e.image)} alt="" loading="lazy" />
              <span className="exrow__body">
                <span className="exrow__name">{e.name}</span>
                <span className="exrow__sub">{e.name_en}</span>
              </span>
              <span className="exrow__time">{fmtTime(perSec)}</span>
            </button>
          </li>
        ))}
      </ol>

      {info && <InfoSheet exercise={info} onClose={() => setInfo(null)} />}

      <div className="start-dock">
        <button
          type="button"
          className="btn btn--dark btn--big"
          onClick={() => {
            haptic('medium')
            navigate(locked ? '/paywall' : `/player/${routine.slug}`)
          }}
        >
          {locked ? <LockIcon width={20} height={20} /> : <PlayIcon width={20} height={20} />}
          {locked ? 'Открыть полный доступ' : 'Начать'}
        </button>
      </div>
    </div>
  )
}
