import { useMemo, useState, useSyncExternalStore } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { allExercises, exerciseImg } from '../lib/data'
import { haptic } from '../lib/telegram'
import { getAccess, subscribeAccess } from '../lib/access'
import { saveCustomRoutine } from '../lib/customRoutines'
import { CloseIcon, LockIcon } from '../components/Icons'

const DURATIONS = [30, 45, 60]

// Конструктор «Собери растяжку» — как Select Stretches в Bend
export default function Builder() {
  const navigate = useNavigate()
  const access = useSyncExternalStore(subscribeAccess, getAccess)
  const [selected, setSelected] = useState([]) // name_en в порядке выбора
  const [perSec, setPerSec] = useState(30)
  const [saveOpen, setSaveOpen] = useState(false)
  const [name, setName] = useState('')

  const byKey = useMemo(() => {
    const m = new Map()
    allExercises.forEach((e) => m.set(e.name_en, e))
    return m
  }, [])

  function toggle(key) {
    haptic('light')
    setSelected((cur) =>
      cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key],
    )
  }

  function start() {
    haptic('medium')
    const exercises = selected.map((k) => byKey.get(k))
    const routine = {
      slug: 'custom',
      title: 'Моя растяжка',
      duration_min: Math.round((selected.length * perSec) / 60) || 1,
      per_sec: perSec,
      exercises,
    }
    navigate('/player/custom', { state: { routine } })
  }

  function save() {
    haptic('success')
    saveCustomRoutine({
      title: name,
      per_sec: perSec,
      exercises: selected.map((k) => byKey.get(k)),
    })
    setSaveOpen(false)
    navigate('/saved')
  }

  // Конструктор — часть полного доступа
  if (!access.loading && access.status === 'free') {
    return (
      <div className="page page--builder">
        <div className="empty">
          <LockIcon width={40} height={40} />
          <h2>Конструктор — в подписке</h2>
          <p>Собирай свои программы из 140 упражнений с полным доступом.</p>
          <Link className="btn btn--dark" to="/paywall">
            Открыть полный доступ
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page page--builder">
      <header className="page-head page-head--center">
        <h1>Собери растяжку</h1>
      </header>

      {selected.length > 0 && (
        <div className="picked">
          {selected.map((k, i) => (
            <button
              type="button"
              className="picked__item"
              key={k}
              onClick={() => toggle(k)}
              aria-label={`Убрать ${byKey.get(k).name}`}
            >
              <img src={exerciseImg(byKey.get(k).image)} alt="" />
              <span className="picked__num">{i + 1}</span>
            </button>
          ))}
        </div>
      )}

      <div className="duration-row">
        <span className="duration-row__label">На упражнение:</span>
        {DURATIONS.map((d) => (
          <button
            type="button"
            key={d}
            className={`chip${perSec === d ? ' is-active' : ''}`}
            onClick={() => {
              haptic('light')
              setPerSec(d)
            }}
          >
            {d} сек
          </button>
        ))}
      </div>

      <div className="exgrid">
        {allExercises.map((e) => {
          const order = selected.indexOf(e.name_en)
          return (
            <button
              type="button"
              className={`exgrid__item${order >= 0 ? ' is-selected' : ''}`}
              key={e.name_en}
              onClick={() => toggle(e.name_en)}
            >
              <span className="exgrid__imgwrap">
                <img src={exerciseImg(e.image)} alt="" loading="lazy" />
                {order >= 0 && <span className="exgrid__num">{order + 1}</span>}
              </span>
              <span className="exgrid__name">{e.name}</span>
            </button>
          )
        })}
      </div>

      <div className="start-dock start-dock--row">
        <button
          type="button"
          className="btn btn--dark btn--big"
          disabled={selected.length === 0}
          onClick={start}
        >
          {selected.length === 0
            ? 'Выбери упражнения'
            : `Начать · ${selected.length} упр. · ~${Math.max(1, Math.round((selected.length * perSec) / 60))} мин`}
        </button>
        {selected.length > 0 && (
          <button
            type="button"
            className="btn btn--light btn--big btn--fit"
            onClick={() => {
              haptic('light')
              setName('')
              setSaveOpen(true)
            }}
          >
            Сохранить
          </button>
        )}
      </div>

      {saveOpen && (
        <div className="sheet-backdrop" onClick={() => setSaveOpen(false)}>
          <div
            className="sheet sheet--save"
            role="dialog"
            aria-label="Сохранить программу"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="icon-btn sheet__close"
              onClick={() => setSaveOpen(false)}
              aria-label="Закрыть"
            >
              <CloseIcon />
            </button>
            <h2 className="sheet__title">Сохранить программу</h2>
            <p className="sheet__sub">
              {selected.length} упр. · {perSec} сек на каждое
            </p>
            <input
              className="input"
              type="text"
              placeholder="Моя растяжка"
              value={name}
              maxLength={40}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            <button type="button" className="btn btn--dark btn--big" onClick={save}>
              Сохранить
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
