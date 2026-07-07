import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import data from '../data/routines.json'
import { PAYMENT_URL } from '../lib/config'

export default function RoutineDetail() {
  const { slug } = useParams()
  const routine = data.routines.find((r) => r.slug === slug)

  const similar = useMemo(() => {
    if (!routine) return []
    return data.routines
      .filter((r) => r.slug !== routine.slug && r.category === routine.category)
      .slice(0, 4)
  }, [routine])

  if (!routine) {
    return (
      <section className="routine">
        <div className="section-heading">
          <h1>Практика не найдена</h1>
          <p>
            Такой практики нет. <Link to="/routines">Вернуться к списку</Link>.
          </p>
        </div>
      </section>
    )
  }

  return (
    <>
      <section className="routine-hero">
        <div className="routine-hero__text">
          <Link to="/routines" className="back-link">
            ← Все практики
          </Link>
          <span className="routine-card__cat">
            {data.categories[routine.category]}
          </span>
          <h1>{routine.title}</h1>
          <p className="routine-hero__meta">
            {routine.duration_min} мин · {routine.exercises.length} упражнений
          </p>
          <p className="routine-hero__desc">{routine.description}</p>
          <a className="btn btn--primary btn--lg" href={PAYMENT_URL}>
            Оплатить и начать
          </a>
        </div>
        <div className="routine-hero__visual">
          {routine.cover && (
            <div className="phone-glow" aria-hidden="true" />
          )}
          {routine.cover && (
            <img
              src={`/exercises/${routine.cover}`}
              alt=""
              className="routine-hero__cover"
            />
          )}
        </div>
      </section>

      <section className="exercises">
        <div className="section-heading">
          <h2>Что будешь делать</h2>
          <p>{routine.exercises.length} упражнений по порядку</p>
        </div>
        <ol className="exercises__list">
          {routine.exercises.map((e, i) => (
            <li className="exercise" key={`${e.image}-${i}`}>
              <div className="exercise__num">{i + 1}</div>
              <div className="exercise__img">
                <img src={`/exercises/${e.image}`} alt={e.name} />
              </div>
              <div className="exercise__body">
                <h3>{e.name}</h3>
                <p>{e.name_en}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {similar.length > 0 && (
        <section className="similar">
          <div className="section-heading">
            <h2>Похожие практики</h2>
          </div>
          <div className="routines__grid routines__grid--compact">
            {similar.map((r) => (
              <Link
                className="routine-card"
                to={`/routines/${r.slug}`}
                key={r.slug}
              >
                <div className="routine-card__cover">
                  {r.cover && <img src={`/exercises/${r.cover}`} alt="" />}
                </div>
                <div className="routine-card__body">
                  <span className="routine-card__cat">
                    {data.categories[r.category]}
                  </span>
                  <h3>{r.title}</h3>
                  <p className="routine-card__meta">
                    {r.duration_min} мин · {r.exercises.length} упражнений
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="cta">
        <div className="cta__card">
          <h2>Готов попробовать?</h2>
          <p>
            Оформи подписку — и открой все {data.routines.length} практик прямо в
            Telegram.
          </p>
          <a className="btn btn--primary btn--lg" href={PAYMENT_URL}>
            Перейти к оплате
          </a>
        </div>
      </section>
    </>
  )
}
