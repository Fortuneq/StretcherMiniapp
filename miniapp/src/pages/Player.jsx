import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { CloseIcon, PauseIcon, PlayIcon, PrevIcon, NextIcon, CheckIcon, InfoIcon } from '../components/Icons'
import InfoSheet from '../components/InfoSheet'
import { findRoutine, dailyFreeExercise, exerciseImg, fmtTime, secondsPerExercise, plural } from '../lib/data'
import { recordSession, getStats } from '../lib/store'
import { findCustomRoutine } from '../lib/customRoutines'
import { getAccess } from '../lib/access'
import { haptic } from '../lib/telegram'

const TICK_MS = 100

export default function Player() {
  const { slug } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  // Обычная практика — по slug, кастомная — из state конструктора
  // или из «Моих программ», упражнение дня — бесплатный минимум
  const routine = useMemo(() => {
    if (slug === 'custom') return location.state?.routine ?? null
    if (slug === 'daily-free') {
      const e = dailyFreeExercise()
      return {
        slug: 'daily-free',
        title: 'Упражнение дня',
        duration_min: 1,
        per_sec: 60,
        exercises: [e],
      }
    }
    if (slug?.startsWith('my-')) return findCustomRoutine(slug)
    return findRoutine(slug)
  }, [slug, location.state])

  // Free-доступ: только упражнение дня
  const locked = getAccess().status === 'free' && slug !== 'daily-free'
  useEffect(() => {
    if (locked) navigate('/paywall', { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked])

  const perSec = useMemo(
    () => (routine ? (routine.per_sec ?? secondsPerExercise(routine)) : 30),
    [routine],
  )

  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [done, setDone] = useState(false)
  const [remaining, setRemaining] = useState(perSec)
  const remainingRef = useRef(perSec)
  const doneRef = useRef(false)

  const total = routine?.exercises.length ?? 0

  // Кастомную практику потеряли при перезагрузке — уходим на главную
  useEffect(() => {
    if (!routine) navigate('/', { replace: true })
  }, [routine, navigate])

  function goTo(next) {
    if (next >= total) {
      finish()
      return
    }
    setIndex(Math.max(0, next))
    remainingRef.current = perSec
    setRemaining(perSec)
  }

  function finish() {
    if (doneRef.current) return
    doneRef.current = true
    setDone(true)
    haptic('success')
    recordSession({
      slug: routine.slug ?? 'custom',
      title: routine.title,
      minutes: routine.duration_min,
      exercises: total,
    })
  }

  // Пока открыта шторка с техникой — таймер стоит
  useEffect(() => {
    if (paused || infoOpen || done || !routine) return undefined
    const id = setInterval(() => {
      remainingRef.current -= TICK_MS / 1000
      if (remainingRef.current <= 0) {
        haptic('medium')
        setIndex((i) => {
          if (i + 1 >= total) {
            finish()
            return i
          }
          remainingRef.current = perSec
          setRemaining(perSec)
          return i + 1
        })
      } else {
        setRemaining(remainingRef.current)
      }
    }, TICK_MS)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, infoOpen, done, routine, perSec, total])

  if (!routine || locked) return null

  if (done) {
    const stats = getStats()
    return (
      <div className="player player--done">
        <div className="done-badge">
          <CheckIcon width={44} height={44} />
        </div>
        <h1>Готово!</h1>
        <p className="done-sub">
          {routine.title} · {routine.duration_min} мин ·{' '}
          {total} {plural(total, 'упражнение', 'упражнения', 'упражнений')}
        </p>
        <div className="done-stats">
          <div className="done-stat">
            <strong>{stats.activeStreak}</strong>
            <span>{plural(stats.activeStreak, 'день подряд', 'дня подряд', 'дней подряд')}</span>
          </div>
          <div className="done-stat">
            <strong>{stats.meter}%</strong>
            <span>флексометр</span>
          </div>
          <div className="done-stat">
            <strong>{stats.totalSessions}</strong>
            <span>{plural(stats.totalSessions, 'практика', 'практики', 'практик')}</span>
          </div>
        </div>
        <Link className="btn btn--dark btn--big" to="/">
          На главную
        </Link>
      </div>
    )
  }

  const exercise = routine.exercises[index]
  const progress = 1 - remaining / perSec

  // Кольцо прогресса вокруг иллюстрации
  const R = 46
  const CIRC = 2 * Math.PI * R

  return (
    <div className="player">
      <header className="player__head">
        <button
          type="button"
          className="icon-btn"
          onClick={() => navigate(-1)}
          aria-label="Закрыть"
        >
          <CloseIcon />
        </button>
        <span className="player__count">
          {index + 1} из {total}
        </span>
        <span className="player__spacer" />
      </header>

      <div className="player__stage">
        <div className="ringwrap">
          <svg className="ring" viewBox="0 0 100 100">
            <circle className="ring__track" cx="50" cy="50" r={R} />
            <circle
              className="ring__bar"
              cx="50"
              cy="50"
              r={R}
              strokeDasharray={CIRC}
              strokeDashoffset={CIRC * (1 - progress)}
            />
          </svg>
          <img
            className="ringwrap__img"
            src={exerciseImg(exercise.image)}
            alt={exercise.name}
            key={exercise.image}
          />
        </div>

        <h2 className="player__name">
          {exercise.name}
          <button
            type="button"
            className="info-btn"
            onClick={() => {
              haptic('light')
              setInfoOpen(true)
            }}
            aria-label="Как выполнять"
          >
            <InfoIcon />
          </button>
        </h2>
        <p className="player__timer">{fmtTime(Math.ceil(remaining))}</p>
      </div>

      {infoOpen && <InfoSheet exercise={exercise} onClose={() => setInfoOpen(false)} />}

      <div className="player__controls">
        <button
          type="button"
          className="ctrl"
          onClick={() => {
            haptic('light')
            goTo(index - 1)
          }}
          disabled={index === 0}
          aria-label="Назад"
        >
          <PrevIcon />
        </button>
        <button
          type="button"
          className="ctrl ctrl--main"
          onClick={() => {
            haptic('light')
            setPaused((p) => !p)
          }}
          aria-label={paused ? 'Продолжить' : 'Пауза'}
        >
          {paused ? <PlayIcon /> : <PauseIcon />}
        </button>
        <button
          type="button"
          className="ctrl"
          onClick={() => {
            haptic('light')
            goTo(index + 1)
          }}
          aria-label="Вперёд"
        >
          <NextIcon />
        </button>
      </div>
    </div>
  )
}
