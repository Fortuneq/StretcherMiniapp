import { useSearchParams } from 'react-router-dom'
import RoutineCard from '../components/RoutineCard'
import { categories, routines, byCategory } from '../lib/data'
import { haptic } from '../lib/telegram'

export default function Library() {
  const [params, setParams] = useSearchParams()
  const cat = params.get('cat')
  const list = cat ? byCategory(cat) : routines

  function pick(next) {
    haptic('light')
    setParams(next ? { cat: next } : {}, { replace: true })
  }

  return (
    <div className="page">
      <header className="page-head">
        <h1>Практики</h1>
        <p>{list.length} программ растяжки</p>
      </header>

      <div className="chips">
        <button
          type="button"
          className={`chip${!cat ? ' is-active' : ''}`}
          onClick={() => pick(null)}
        >
          Все
        </button>
        {Object.entries(categories).map(([key, label]) => (
          <button
            type="button"
            key={key}
            className={`chip${cat === key ? ' is-active' : ''}`}
            onClick={() => pick(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="rgrid">
        {list.map((r) => (
          <RoutineCard routine={r} key={r.slug} />
        ))}
      </div>
    </div>
  )
}
