import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import data from '../data/routines.json'

const ALL = 'all'

export default function Routines() {
  const [cat, setCat] = useState(ALL)
  const routines = data.routines
  const categories = data.categories

  const catOrder = Object.keys(categories)

  const filtered = useMemo(() => {
    if (cat === ALL) return routines
    return routines.filter((r) => r.category === cat)
  }, [cat, routines])

  return (
    <section className="routines">
      <div className="section-heading">
        <h1>Все практики</h1>
        <p>
          {routines.length} готовых практик под разный запрос — утро, поясница,
          офис, восстановление. Открой любую и посмотри упражнения.
        </p>
      </div>

      <div className="filters">
        <button
          className={`filter ${cat === ALL ? 'filter--active' : ''}`}
          onClick={() => setCat(ALL)}
        >
          Все
        </button>
        {catOrder.map((key) => (
          <button
            key={key}
            className={`filter ${cat === key ? 'filter--active' : ''}`}
            onClick={() => setCat(key)}
          >
            {categories[key]}
          </button>
        ))}
      </div>

      <div className="routines__grid">
        {filtered.map((r) => (
          <Link className="routine-card" to={`/routines/${r.slug}`} key={r.slug}>
            <div className="routine-card__cover">
              {r.cover ? (
                <img src={`/exercises/${r.cover}`} alt="" />
              ) : (
                <div className="routine-card__cover--placeholder" />
              )}
            </div>
            <div className="routine-card__body">
              <span className="routine-card__cat">{categories[r.category]}</span>
              <h3>{r.title}</h3>
              <p className="routine-card__meta">
                {r.duration_min} мин · {r.exercises.length} упражнений
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
