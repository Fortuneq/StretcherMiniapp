// Фоновая предзагрузка всех иллюстраций при старте приложения.
// После пережатия в WebP весь набор весит <1 МБ, так что греем кэш целиком:
// дальше любые экраны открываются без сетевых задержек. Стартуем после
// полной загрузки страницы, чтобы не тормозить первый рендер.
import { routines, exerciseImg } from './data'

const CONCURRENCY = 8

export function preloadAllImages() {
  const urls = new Set()
  for (const r of routines) {
    for (const e of r.exercises) urls.add(exerciseImg(e.image))
  }
  for (const g of ['f', 'm']) {
    for (const s of ['front', 'back']) {
      urls.add(`${import.meta.env.BASE_URL}body/${g}-${s}.webp`)
    }
  }

  const queue = [...urls]
  function next() {
    const url = queue.shift()
    if (!url) return
    const img = new Image()
    img.decoding = 'async'
    img.onload = next
    img.onerror = next
    img.src = url
  }
  const start = () => {
    for (let i = 0; i < CONCURRENCY; i += 1) next()
  }

  if (document.readyState === 'complete') setTimeout(start, 300)
  else window.addEventListener('load', () => setTimeout(start, 300), { once: true })
}
