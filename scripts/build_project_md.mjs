// Генерирует PROJECT.md — описание проекта stretcher и полный каталог
// программ и упражнений из данных приложения. Запуск из корня репо:
//   node scripts/build_project_md.mjs
import { readFileSync, writeFileSync } from 'node:fs'

const data = JSON.parse(readFileSync('miniapp/src/data/routines.json', 'utf8'))
const descriptions = (await import('../miniapp/src/data/descriptions.js')).default
const { categories, routines } = data

const plural = (n, one, few, many) => {
  const m10 = n % 10, m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few
  return many
}

// Уникальные упражнения по алфавиту
const exercises = new Map()
for (const r of routines) {
  for (const e of r.exercises) {
    if (!exercises.has(e.name_en)) exercises.set(e.name_en, e)
  }
}
const exList = [...exercises.values()].sort((a, b) => a.name.localeCompare(b.name, 'ru'))

let md = `# stretcher — растяжка на каждый день

> Документ сгенерирован из данных приложения: \`node scripts/build_project_md.mjs\`

## О проекте

**stretcher** — сервис ежедневной растяжки в Telegram (аналог приложения Bend).
Работает как Telegram Mini App без установки: открыл бота — занимаешься.

- Приложение: [@stretcher_robot](https://t.me/stretcher_robot) (кнопка меню «Растяжка»)
- Сайт/лендинг с оплатой: https://true-scale.ru/start/
- Репозиторий: github.com/Fortuneq/StretcherMiniapp
- Контент: **${routines.length} ${plural(routines.length, 'программа', 'программы', 'программ')}** и **${exList.length} ${plural(exList.length, 'упражнение', 'упражнения', 'упражнений')}** с иллюстрациями и описаниями техники на русском

## Возможности

- **«Что потянуть?»** — стартовый экран: карта тела (женская/мужская фигура,
  вид спереди и со спины). Пользователь отмечает зоны, которые болят или
  которые хочется потянуть, — приложение подбирает подходящие программы.
- **Программы** — каталог из ${routines.length} ${plural(routines.length, 'практики', 'практик', 'практик')} по ${Object.keys(categories).length} категориям, от 3 до 30 минут.
- **Плеер** — таймер с кольцом прогресса, автопереход между упражнениями,
  пауза, шторка «как выполнять» с техникой каждого упражнения.
- **Конструктор** — сборка собственной программы из ${exList.length} упражнений
  (30/45/60 секунд на упражнение), сохранение в «Мои программы».
- **Статистика** — флексометр (накопительный показатель регулярности),
  стрики, история практик, минуты растяжки. Прогресс синхронизируется через
  Telegram CloudStorage и бэкенд.
- **Подборка дня** — ежедневная ротация трёх программ на экране «Сегодня».
- **Профиль** — статус подписки, свои программы, документы, отзыв согласия ПДн.

## Модель доступа

| Режим | Что доступно |
|---|---|
| Триал (первые 24 часа) | Полный доступ ко всему |
| Бесплатный | Одно «упражнение дня» в сутки, остальное под замком |
| Подписка | Всё без ограничений |

Тарифы: **600 ₽/мес · 1200 ₽/3 мес (400 ₽/мес) · 3000 ₽/год (250 ₽/мес)**.
Оплата: Telegram Stars внутри приложения, банковская карта через ЮKassa
(физлица и юрлица — для юрлиц название организации и ИНН попадают в чек 54-ФЗ),
а также лендинг true-scale.ru/start/ с активацией доступа по одноразовой
ссылке в бота.

## Категории программ

`
for (const [key, label] of Object.entries(categories)) {
  const rs = routines.filter((r) => r.category === key)
  md += `- **${label}** — ${rs.length} ${plural(rs.length, 'программа', 'программы', 'программ')}\n`
}

md += `\n## Все программы\n`
for (const [key, label] of Object.entries(categories)) {
  const rs = routines.filter((r) => r.category === key)
  if (!rs.length) continue
  md += `\n### ${label}\n\n| Программа | Мин | Упр. | Описание | Состав |\n|---|---|---|---|---|\n`
  for (const r of rs) {
    const names = r.exercises.map((e) => e.name).join(', ')
    md += `| **${r.title}** | ${r.duration_min} | ${r.exercises.length} | ${r.description} | ${names} |\n`
  }
}

md += `\n## Все упражнения (${exList.length})\n\n`
for (const e of exList) {
  const desc = descriptions[e.name_en]
  md += `### ${e.name} (${e.name_en})\n\n`
  md += desc ? `${desc}\n\n` : `_Описание в работе._\n\n`
}

md += `## Технически, кратко

- **Фронтенд**: React + Vite (hash-роутер), иллюстрации WebP с предзагрузкой
  при старте, статику раздаёт nginx с годовым immutable-кэшем.
- **Бэкенд**: FastAPI + SQLite — пользователи, триал, подписки, платежи
  (Stars и ЮKassa), лиды, согласия ПДн; prometheus-метрики, дашборд Grafana.
- **Инфраструктура**: docker-контейнеры за Caddy (авто-HTTPS), деплой только
  через git (\`scripts/deploy.sh\`, blue-green без простоя).
- **Нативные обёртки**: Capacitor для Android (Google Play, TWA) и iOS.
`

writeFileSync('PROJECT.md', md)
console.log(`PROJECT.md: ${routines.length} программ, ${exList.length} упражнений, ${(md.length / 1024).toFixed(0)} КБ`)
