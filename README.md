# Stretcher — daily stretching in Telegram

A daily stretching service that runs as a Telegram Mini App — no install needed: open the bot and start a session. Comes with **61 programs** and **140 exercises**, each with an illustration and technique description.

Live: [@stretcher_robot](https://t.me/stretcher_robot)

## Features

- **"What to stretch?"** — an interactive body map (female / male figure, front and back). Mark the areas that hurt or feel tight and get matching programs.
- **Programs** — a catalogue of 61 routines across 11 categories, from 3 to 30 minutes
- **Player** — progress-ring timer, auto-advance between exercises, pause, and a "how to do it" sheet for every exercise
- **Builder** — compose your own routine from 140 exercises (30/45/60 s each) and save it
- **Stats** — a cumulative regularity score, streaks, history and total minutes; synced via Telegram CloudStorage and the backend
- **Pick of the day** — three programs rotated daily on the Today screen
- **Subscriptions** — 24-hour full trial, then a free "exercise of the day" tier or a paid subscription

## Tech stack

| Part | Technology |
|---|---|
| Mini App | React, Vite, Telegram WebApp SDK; also works as a PWA, Capacitor config for native builds |
| API | FastAPI, SQLite, Telegram Stars payments, Prometheus metrics |
| Landing | `web/` (Vite) |
| Content tooling | Python and Node scripts to scrape routines, translate them and generate illustrations |
| Deploy | Docker, Caddy, `scripts/deploy.sh` |

## Project structure

```
miniapp/   — the Telegram Mini App
api/       — backend: users, trial, subscriptions, Telegram Stars payments
web/       — landing / website
deploy/    — Caddy config and monitoring
scripts/   — content pipeline and deploy script
PROJECT.md — full catalogue of programs and exercises (generated from app data)
```

## Getting started

```bash
cd miniapp
npm install
npm run dev        # http://localhost:5173 (use a mobile viewport in DevTools)
```

Outside Telegram everything still works: Telegram integrations (haptics, CloudStorage, BackButton) turn into no-ops.

## Documentation

[`PROJECT.md`](PROJECT.md) is generated from the app data (`node scripts/build_project_md.mjs`) and contains the complete program and exercise catalogue.
