# flexi — Telegram Mini App

Мобильное приложение растяжки в духе Bend: практики по зонам, плеер с таймером,
стрики, «флексометр» и конструктор собственных растяжек. Работает как Telegram
Mini App и как обычный мобильный веб (PWA) — эта же сборка позже оборачивается
в TWA для Google Play.

## Запуск локально

```bash
npm install
npm run dev        # http://localhost:5173 (открыть в мобильном вьюпорте DevTools)
npm run build      # статика в dist/
```

Вне Telegram всё работает: интеграции (хаптика, CloudStorage, BackButton)
автоматически превращаются в no-op.

## Подключение к Telegram

1. Создай бота у [@BotFather](https://t.me/BotFather): `/newbot`.
2. Задеплой `dist/` на любой HTTPS-хостинг (Vercel, Cloudflare Pages, GitHub Pages).
3. В BotFather: `/newapp` (или Bot Settings → Menu Button) → укажи URL сборки.
4. Открой бота → кнопка меню запустит flexi.

Роутинг сделан на hash-роутере, поэтому подходит любой статический хостинг
без настройки rewrite-правил.

## Что внутри

- **Сегодня** — дата, подборка дня (ротация по дню года), зоны тела, стрик.
- **Практики** — 50 программ с фильтром по категориям.
- **Плеер** — кольцевой таймер на упражнение, пауза/вперёд/назад, хаптика,
  экран завершения со статистикой.
- **Создать** — конструктор «собери растяжку»: выбор упражнений по порядку,
  30/45/60 сек на упражнение.
- **Статистика** — флексометр (+2% за активный день, −1% за пропуск),
  активный и лучший стрик, неделя, история сессий.
- **Сохранённые** — закладки.

Прогресс хранится в `localStorage` и зеркалится в Telegram CloudStorage —
переживает смену устройства.

## Android / Google Play (Capacitor)

Та же сборка упакована в нативное приложение через Capacitor — весь веб
лежит внутри APK/AAB, домен и хостинг не нужны. Проект в `android/`.

```bash
npm run build && npx cap sync android          # обновить веб-код внутри Android-проекта
cd android
JAVA_HOME=$(/usr/libexec/java_home -v 21) ./gradlew bundleRelease   # .aab для Play Console
JAVA_HOME=$(/usr/libexec/java_home -v 21) ./gradlew assembleRelease # .apk для теста на устройстве
```

Артефакты:
- AAB: `android/app/build/outputs/bundle/release/app-release.aab` — его заливаешь
  в Google Play Console (Создать приложение → Production → Create release).
- APK: `android/app/build/outputs/apk/release/app-release.apk` — можно сразу
  поставить на телефон для проверки.

Подпись: ключ `android/keystore/flexi-upload.jks`, пароли в
`android/keystore.properties`. **Сохрани оба файла в надёжном месте и не
коммить** — без ключа нельзя будет обновлять приложение в Play. Package id:
`com.flexi.stretch`, поменять можно в `capacitor.config.json` +
`android/app/build.gradle` до первой публикации.

Перед релизом в Play понадобится: аккаунт Play Console ($25), скриншоты,
иконка 512×512 (`assets/icon-only.png` — временная, ждём новый брендинг),
политика конфиденциальности (URL).

## iOS / App Store (Capacitor)

Проект в `ios/` (Swift Package Manager, CocoaPods не нужен).
Минимальная версия — **iOS 15**, то есть работают iPhone 7 (iOS 15.8),
iPhone 8, iPhone X и все новее. Сборка целится в Safari 15
(`build.target` в `vite.config.js`), шрифты вшиты локально — приложение
полностью офлайн.

Единственное, что нужно доустановить, — **Xcode из Mac App Store**
(Command Line Tools недостаточно). Дальше:

```bash
npm run build && npx cap sync ios   # обновить веб-код внутри iOS-проекта
npx cap open ios                    # открыть проект в Xcode
```

В Xcode:
1. Target **App** → Signing & Capabilities → выбери свою команду
   (нужен Apple Developer Program, $99/год). Bundle ID: `com.flexi.stretch`.
2. Проверка на симуляторе/своём iPhone: кнопка Run (▶).
3. Релиз: выбери девайс «Any iOS Device (arm64)» → Product → Archive →
   Distribute App → App Store Connect. Дальше TestFlight и ревью Apple.

Либо из терминала после установки Xcode:

```bash
sudo xcode-select -s /Applications/Xcode.app
xcodebuild -project ios/App/App.xcodeproj -scheme App \
  -destination generic/platform=iOS archive -archivePath build/App.xcarchive
```
