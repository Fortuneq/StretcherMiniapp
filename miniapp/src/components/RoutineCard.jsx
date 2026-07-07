import { Link } from 'react-router-dom'
import { useSyncExternalStore } from 'react'
import { categories } from '../lib/data'
import { getAccess, subscribeAccess } from '../lib/access'
import { LockIcon } from './Icons'
import Cluster from './Cluster'

export default function RoutineCard({ routine }) {
  const access = useSyncExternalStore(subscribeAccess, getAccess)
  const locked = access.status === 'free'
  return (
    <Link className="rcard" to={`/routine/${routine.slug}`}>
      <div className="rcard__img">
        <Cluster exercises={routine.exercises} scale={0.62} />
        {locked && (
          <span className="lock-badge">
            <LockIcon width={14} height={14} />
          </span>
        )}
      </div>
      <div className="rcard__body">
        <span className="rcard__cat">{categories[routine.category]}</span>
        <h3 className="rcard__title">{routine.title}</h3>
        <p className="rcard__meta">
          {routine.duration_min} мин · {routine.exercises.length} упр.
        </p>
      </div>
    </Link>
  )
}
