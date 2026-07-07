"""flexi API: пользователи, триал, подписки, платежи Telegram Stars.

Аутентификация — подпись Telegram WebApp initData (заголовок Authorization: tma <initData>).
Хранилище — SQLite. Платежи — абстракция провайдеров: сейчас Stars (XTR), позже ЮKassa.
"""
import hashlib
import hmac
import json
import os
import sqlite3
import time
from urllib.parse import parse_qsl

import httpx
from fastapi import Depends, FastAPI, Header, HTTPException, Request

BOT_TOKEN = os.environ["BOT_TOKEN"]
WEBHOOK_SECRET = os.environ.get("WEBHOOK_SECRET", "")
DB_PATH = os.environ.get("DB_PATH", "/data/flexi.db")
APP_URL = os.environ.get("APP_URL", "https://true-scale.ru/")
TG_API = f"https://api.telegram.org/bot{BOT_TOKEN}"

TRIAL_HOURS = 24
INIT_DATA_MAX_AGE = 24 * 3600

# Планы подписки. Рубли — витринная цена (и будущая ЮKassa),
# stars — цена в XTR (~1.6 ₽ за звезду, округлено).
PLANS = {
    "month": {"title": "1 месяц", "rub": 600, "stars": 375, "days": 30},
    "quarter": {"title": "3 месяца", "rub": 1200, "stars": 750, "days": 90},
    "year": {"title": "1 год", "rub": 3000, "stars": 1875, "days": 365},
}

app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)


# --- БД ---

def db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db() -> None:
    with db() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                tg_id INTEGER PRIMARY KEY,
                username TEXT,
                first_name TEXT,
                created_at INTEGER NOT NULL,
                premium_until INTEGER NOT NULL DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tg_id INTEGER NOT NULL,
                plan TEXT NOT NULL,
                provider TEXT NOT NULL,
                amount INTEGER NOT NULL,
                currency TEXT NOT NULL,
                charge_id TEXT UNIQUE,
                created_at INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS custom_routines (
                tg_id INTEGER PRIMARY KEY,
                data TEXT NOT NULL,
                updated_at INTEGER NOT NULL
            );
            """
        )


init_db()


# --- Аутентификация по initData ---

def validate_init_data(init_data: str) -> dict:
    pairs = dict(parse_qsl(init_data, keep_blank_values=True))
    received_hash = pairs.pop("hash", "")
    check_string = "\n".join(f"{k}={v}" for k, v in sorted(pairs.items()))
    secret = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
    expected = hmac.new(secret, check_string.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, received_hash):
        raise HTTPException(401, "bad initData signature")
    if time.time() - int(pairs.get("auth_date", 0)) > INIT_DATA_MAX_AGE:
        raise HTTPException(401, "initData expired")
    try:
        return json.loads(pairs["user"])
    except (KeyError, ValueError):
        raise HTTPException(401, "no user in initData")


def current_user(authorization: str = Header("")) -> sqlite3.Row:
    scheme, _, init_data = authorization.partition(" ")
    if scheme != "tma" or not init_data:
        raise HTTPException(401, "expected Authorization: tma <initData>")
    tg_user = validate_init_data(init_data)
    now = int(time.time())
    with db() as conn:
        conn.execute(
            """INSERT INTO users (tg_id, username, first_name, created_at)
               VALUES (?, ?, ?, ?)
               ON CONFLICT(tg_id) DO UPDATE SET
                 username = excluded.username, first_name = excluded.first_name""",
            (tg_user["id"], tg_user.get("username"), tg_user.get("first_name"), now),
        )
        return conn.execute(
            "SELECT * FROM users WHERE tg_id = ?", (tg_user["id"],)
        ).fetchone()


def entitlement(user: sqlite3.Row) -> dict:
    now = int(time.time())
    trial_until = user["created_at"] + TRIAL_HOURS * 3600
    if user["premium_until"] > now:
        status = "premium"
    elif trial_until > now:
        status = "trial"
    else:
        status = "free"
    return {
        "status": status,
        "trial_until": trial_until,
        "premium_until": user["premium_until"] or None,
    }


# --- API для miniapp ---

@app.get("/api/me")
def me(user: sqlite3.Row = Depends(current_user)):
    return {
        **entitlement(user),
        "plans": [
            {"id": pid, "title": p["title"], "rub": p["rub"],
             "stars": p["stars"], "days": p["days"]}
            for pid, p in PLANS.items()
        ],
    }


@app.post("/api/invoice")
async def create_invoice(body: dict, user: sqlite3.Row = Depends(current_user)):
    plan_id = body.get("plan")
    plan = PLANS.get(plan_id)
    if not plan:
        raise HTTPException(400, "unknown plan")
    provider = body.get("provider", "stars")
    if provider != "stars":  # ЮKassa подключим отдельным провайдером
        raise HTTPException(400, "provider not available")
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{TG_API}/createInvoiceLink",
            json={
                "title": f"Подписка flexi · {plan['title']}",
                "description": "Полный доступ ко всем практикам и конструктору",
                "payload": f"sub:{user['tg_id']}:{plan_id}",
                "currency": "XTR",
                "prices": [{"label": plan["title"], "amount": plan["stars"]}],
            },
            timeout=15,
        )
    data = r.json()
    if not data.get("ok"):
        raise HTTPException(502, f"telegram: {data.get('description')}")
    return {"link": data["result"]}


@app.get("/api/custom-routines")
def get_custom(user: sqlite3.Row = Depends(current_user)):
    with db() as conn:
        row = conn.execute(
            "SELECT data, updated_at FROM custom_routines WHERE tg_id = ?",
            (user["tg_id"],),
        ).fetchone()
    if not row:
        return {"routines": [], "updated_at": 0}
    return {"routines": json.loads(row["data"]), "updated_at": row["updated_at"]}


@app.put("/api/custom-routines")
def put_custom(body: dict, user: sqlite3.Row = Depends(current_user)):
    routines = body.get("routines")
    if not isinstance(routines, list) or len(routines) > 100:
        raise HTTPException(400, "routines must be a list (max 100)")
    raw = json.dumps(routines, ensure_ascii=False)
    if len(raw) > 200_000:
        raise HTTPException(400, "too large")
    now = int(time.time())
    with db() as conn:
        conn.execute(
            """INSERT INTO custom_routines (tg_id, data, updated_at) VALUES (?, ?, ?)
               ON CONFLICT(tg_id) DO UPDATE SET data = excluded.data,
                 updated_at = excluded.updated_at""",
            (user["tg_id"], raw, now),
        )
    return {"ok": True, "updated_at": now}


# --- Вебхук бота: платежи и /start ---

async def tg_call(method: str, payload: dict) -> None:
    async with httpx.AsyncClient() as client:
        await client.post(f"{TG_API}/{method}", json=payload, timeout=15)


def grant_premium(tg_id: int, plan_id: str, provider: str, amount: int,
                  currency: str, charge_id: str | None) -> None:
    plan = PLANS[plan_id]
    now = int(time.time())
    with db() as conn:
        try:
            conn.execute(
                """INSERT INTO payments (tg_id, plan, provider, amount, currency,
                   charge_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (tg_id, plan_id, provider, amount, currency, charge_id, now),
            )
        except sqlite3.IntegrityError:
            return  # повторная доставка того же платежа
        row = conn.execute(
            "SELECT premium_until, created_at FROM users WHERE tg_id = ?", (tg_id,)
        ).fetchone()
        base = max(now, row["premium_until"]) if row else now
        new_until = base + plan["days"] * 86400
        conn.execute(
            """INSERT INTO users (tg_id, created_at, premium_until) VALUES (?, ?, ?)
               ON CONFLICT(tg_id) DO UPDATE SET premium_until = ?""",
            (tg_id, now, new_until, new_until),
        )


@app.post("/api/tg-webhook")
async def tg_webhook(
    request: Request,
    x_telegram_bot_api_secret_token: str = Header(""),
):
    if WEBHOOK_SECRET and x_telegram_bot_api_secret_token != WEBHOOK_SECRET:
        raise HTTPException(403, "bad secret")
    update = await request.json()

    if pcq := update.get("pre_checkout_query"):
        payload = pcq.get("invoice_payload", "")
        ok = payload.startswith("sub:") and payload.split(":")[2] in PLANS
        await tg_call("answerPreCheckoutQuery", {
            "pre_checkout_query_id": pcq["id"],
            "ok": ok,
            **({} if ok else {"error_message": "Неизвестный тариф, попробуй ещё раз."}),
        })
        return {"ok": True}

    if message := update.get("message"):
        chat_id = message["chat"]["id"]

        if sp := message.get("successful_payment"):
            _, tg_id, plan_id = sp["invoice_payload"].split(":")
            grant_premium(
                int(tg_id), plan_id, "stars",
                sp["total_amount"], sp["currency"],
                sp.get("telegram_payment_charge_id"),
            )
            await tg_call("sendMessage", {
                "chat_id": chat_id,
                "text": "Подписка активна! Полный доступ открыт — хорошей практики 🤸",
            })
            return {"ok": True}

        if (message.get("text") or "").startswith("/start"):
            await tg_call("sendMessage", {
                "chat_id": chat_id,
                "text": ("Привет! Я flexi — растяжка на каждый день.\n"
                         "Первые сутки — полный доступ бесплатно."),
                "reply_markup": {"inline_keyboard": [[
                    {"text": "Открыть приложение", "web_app": {"url": APP_URL}}
                ]]},
            })
    return {"ok": True}


@app.get("/api/health")
def health():
    return {"ok": True}
