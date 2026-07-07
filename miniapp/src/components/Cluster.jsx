import { exerciseImg } from '../lib/data'

// Гроздь круглых иллюстраций упражнений — как на карточке дня в Bend
const LAYOUT = [
  { x: 28, y: 12, s: 56 },
  { x: 96, y: 4, s: 64 },
  { x: 160, y: 24, s: 52 },
  { x: 6, y: 66, s: 50 },
  { x: 68, y: 62, s: 72 },
  { x: 148, y: 74, s: 58 },
  { x: 40, y: 118, s: 54 },
  { x: 108, y: 128, s: 48 },
]

export default function Cluster({ exercises }) {
  const items = exercises.slice(0, LAYOUT.length)
  // Высота — по нижней точке реально показанных кружков, чтобы не было пустоты
  const height = Math.max(...items.map((_, i) => LAYOUT[i].y + LAYOUT[i].s)) + 6
  return (
    <div className="cluster" style={{ height }} aria-hidden="true">
      {items.map((e, i) => {
        const p = LAYOUT[i]
        return (
          <img
            key={`${e.image}-${i}`}
            src={exerciseImg(e.image)}
            alt=""
            className="cluster__dot"
            style={{ left: p.x, top: p.y, width: p.s, height: p.s }}
            loading="lazy"
          />
        )
      })}
    </div>
  )
}
