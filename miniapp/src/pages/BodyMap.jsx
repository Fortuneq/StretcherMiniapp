import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import RoutineCard from '../components/RoutineCard'
import { routines, plural } from '../lib/data'
import { getUser, haptic } from '../lib/telegram'
import { BackIcon } from '../components/Icons'

// Зоны тела: координаты в процентах от контейнера с фигурой.
// blobs — эллипсы подсветки; одна зона может состоять из пары (лево/право).
const ZONES = {
  front: [
    { id: 'neck', label: 'Шея', cats: ['upper'], blobs: [{ x: 50, y: 25.5, rx: 5, ry: 3 }] },
    { id: 'shoulders', label: 'Плечи', cats: ['upper', 'posture'], blobs: [{ x: 42, y: 28, rx: 5.5, ry: 3.5 }, { x: 58, y: 28, rx: 5.5, ry: 3.5 }] },
    { id: 'chest', label: 'Грудь и осанка', cats: ['posture'], blobs: [{ x: 50, y: 34, rx: 8, ry: 4.5 }] },
    { id: 'core', label: 'Пресс и кор', cats: ['core'], blobs: [{ x: 50, y: 43, rx: 6.5, ry: 4.5 }] },
    { id: 'wrists', label: 'Руки и запястья', cats: ['office', 'upper'], blobs: [{ x: 32, y: 52, rx: 4.5, ry: 4 }, { x: 68, y: 52, rx: 4.5, ry: 4 }] },
    { id: 'hips', label: 'Бёдра', cats: ['hips'], blobs: [{ x: 44.5, y: 53, rx: 5, ry: 4.5 }, { x: 55.5, y: 53, rx: 5, ry: 4.5 }] },
    { id: 'quads', label: 'Передняя поверхность ног', cats: ['legs'], blobs: [{ x: 45, y: 63, rx: 5, ry: 6.5 }, { x: 55, y: 63, rx: 5, ry: 6.5 }] },
    { id: 'shins', label: 'Колени и голени', cats: ['legs'], blobs: [{ x: 45.5, y: 78, rx: 4, ry: 6.5 }, { x: 54.5, y: 78, rx: 4, ry: 6.5 }] },
  ],
  back: [
    { id: 'neck', label: 'Шея', cats: ['upper'], blobs: [{ x: 50, y: 24, rx: 5, ry: 3.5 }] },
    { id: 'upper-back', label: 'Верх спины', cats: ['back', 'posture'], blobs: [{ x: 50, y: 32, rx: 8, ry: 5 }] },
    { id: 'lower-back', label: 'Поясница', cats: ['back'], blobs: [{ x: 50, y: 40, rx: 7, ry: 4 }] },
    { id: 'glutes', label: 'Ягодицы и таз', cats: ['hips'], blobs: [{ x: 50, y: 48, rx: 8, ry: 5 }] },
    { id: 'hamstrings', label: 'Задняя поверхность', cats: ['legs'], blobs: [{ x: 45, y: 62, rx: 5, ry: 6.5 }, { x: 55, y: 62, rx: 5, ry: 6.5 }] },
    { id: 'calves', label: 'Икры и стопы', cats: ['legs'], blobs: [{ x: 45.5, y: 77, rx: 4, ry: 6 }, { x: 54.5, y: 77, rx: 4, ry: 6 }] },
  ],
}

export default function BodyMap() {
  const [gender, setGender] = useState('f')
  const [side, setSide] = useState('front')
  const [selected, setSelected] = useState([]) // `${side}:${id}`
  const [results, setResults] = useState(false)
  const user = getUser()

  function toggle(zoneKey) {
    haptic('light')
    setSelected((cur) =>
      cur.includes(zoneKey) ? cur.filter((k) => k !== zoneKey) : [...cur, zoneKey],
    )
  }

  const selectedZones = useMemo(
    () =>
      selected
        .map((key) => {
          const [s, id] = key.split(':')
          return ZONES[s].find((z) => z.id === id)
        })
        .filter(Boolean),
    [selected],
  )

  const matched = useMemo(() => {
    const cats = new Set(selectedZones.flatMap((z) => z.cats))
    return routines
      .filter((r) => cats.has(r.category))
      .sort((a, b) => a.duration_min - b.duration_min)
  }, [selectedZones])

  if (results) {
    return (
      <div className="page">
        <header className="page-head">
          <button
            type="button"
            className="icon-btn bodymap__back"
            onClick={() => {
              haptic('light')
              setResults(false)
            }}
            aria-label="Назад к карте тела"
          >
            <BackIcon />
          </button>
          <h1>Подойдут эти практики</h1>
          <p>
            {selectedZones.map((z) => z.label).join(' · ')} —{' '}
            {matched.length} {plural(matched.length, 'программа', 'программы', 'программ')}
          </p>
        </header>
        <div className="rgrid">
          {matched.map((r) => (
            <RoutineCard routine={r} key={r.slug} />
          ))}
        </div>
        <Link className="all-link" to="/builder">
          Или собери свою из отдельных упражнений
          <span>→</span>
        </Link>
      </div>
    )
  }

  const zones = ZONES[side]

  return (
    <div className="page bodymap">
      <header className="bodymap__head">
        <div className="seg seg--small">
          <button
            type="button"
            className={`seg__b${gender === 'f' ? ' is-active' : ''}`}
            onClick={() => {
              haptic('light')
              setGender('f')
            }}
          >
            Ж
          </button>
          <button
            type="button"
            className={`seg__b${gender === 'm' ? ' is-active' : ''}`}
            onClick={() => {
              haptic('light')
              setGender('m')
            }}
          >
            М
          </button>
        </div>
        <h1>Что потянуть?</h1>
        <Link className="today-head__avatar" to="/profile" aria-label="Профиль">
          {user?.photo_url ? (
            <img src={user.photo_url} alt="" />
          ) : (
            <span>{(user?.first_name || 'S')[0]}</span>
          )}
        </Link>
      </header>

      <div className="bodymap__stage">
        <div className="bodymap__figure">
          <img
            className="bodymap__img"
            src={`${import.meta.env.BASE_URL}body/${gender}-${side}.webp`}
            alt={side === 'front' ? 'Фигура спереди' : 'Фигура сзади'}
            draggable="false"
          />
          {zones.map((z) => {
            const key = `${side}:${z.id}`
            const on = selected.includes(key)
            return z.blobs.map((b, i) => (
              <button
                type="button"
                key={`${key}-${i}`}
                className={`bodymap__zone${on ? ' is-on' : ''}`}
                style={{
                  left: `${b.x - b.rx}%`,
                  top: `${b.y - b.ry}%`,
                  width: `${b.rx * 2}%`,
                  height: `${b.ry * 2}%`,
                }}
                onClick={() => toggle(key)}
                aria-pressed={on}
                aria-label={z.label}
              />
            ))
          })}
        </div>
        <button
          type="button"
          className="bodymap__flip"
          onClick={() => {
            haptic('light')
            setSide((s) => (s === 'front' ? 'back' : 'front'))
          }}
        >
          ↻ 180°
        </button>
      </div>

      <div className="bodymap__dock">
        {selectedZones.length === 0 ? (
          <p className="bodymap__hint">Отметь на фигуре, что болит или что хочется потянуть</p>
        ) : (
          <p className="bodymap__hint bodymap__hint--picked">
            {selectedZones.map((z) => z.label).join(' · ')}
          </p>
        )}
        <button
          type="button"
          className="btn btn--dark btn--big"
          disabled={selectedZones.length === 0}
          onClick={() => {
            haptic('medium')
            setResults(true)
          }}
        >
          {selectedZones.length === 0
            ? 'Выбери зоны'
            : `Показать упражнения · ${matched.length}`}
        </button>
      </div>
    </div>
  )
}
