// Смоук-тест механики: практика → плеер → пропуск всех упражнений →
// экран завершения → статистика (стрик и история должны обновиться).
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL ?? 'http://localhost:4788'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })

async function fail(msg) {
  await page.screenshot({ path: '/tmp/stretcher-e2e-fail.png' })
  console.error('FAIL:', msg)
  await browser.close()
  process.exit(1)
}

// 1. Экран практики
await page.goto(`${BASE}/#/routine/back`)
await page.getByRole('button', { name: 'Начать' }).click()

// 2. Плеер: пропускаем 4 упражнения кнопкой «вперёд»
for (let i = 0; i < 4; i += 1) {
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: 'Вперёд' }).click()
}

// 3. Экран завершения
try {
  await page.getByText('Готово!').waitFor({ timeout: 3000 })
} catch {
  await fail('нет экрана завершения')
}
await page.screenshot({ path: '/tmp/stretcher-done.png' })

// 4. Статистика после перезагрузки (localStorage должен сохраниться)
await page.goto(`${BASE}/#/stats`)
await page.reload()
const streak = await page.locator('.stat-card strong').first().textContent()
if (!streak.startsWith('1')) await fail(`стрик = "${streak}", ожидался 1 день`)

await page.getByRole('button', { name: 'История' }).click()
const row = await page.locator('.history__title').first().textContent()
if (!row.includes('Спина')) await fail(`в истории "${row}", ожидалась «Спина»`)

await page.screenshot({ path: '/tmp/stretcher-stats-after.png' })
console.log('OK: сессия записана, стрик 1 день, история заполнена')
await browser.close()
