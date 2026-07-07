"""stretcher API: пользователи, триал, подписки, платежи Telegram Stars.

Аутентификация — подпись Telegram WebApp initData (заголовок Authorization: tma <initData>).
Хранилище — SQLite. Платежи — абстракция провайдеров: сейчас Stars (XTR), позже ЮKassa.
"""
import hashlib
import hmac
import json
import os
import re
import sqlite3
import time
import uuid
from urllib.parse import parse_qsl

import httpx
from fastapi import Depends, FastAPI, Header, HTTPException, Request, Response
from prometheus_client import (
    CONTENT_TYPE_LATEST,
    Counter,
    Histogram,
    Gauge,
    generate_latest,
)

BOT_TOKEN = os.environ["BOT_TOKEN"]
WEBHOOK_SECRET = os.environ.get("WEBHOOK_SECRET", "")
DB_PATH = os.environ.get("DB_PATH", "/data/stretcher.db")
APP_URL = os.environ.get("APP_URL", "https://true-scale.ru/")
DOCS_URL = os.environ.get("DOCS_URL", "https://true-scale.ru/docs/")
TG_API = f"https://api.telegram.org/bot{BOT_TOKEN}"

# ЮKassa: без ключей провайдер выключен (оплата картой недоступна)
YOOKASSA_SHOP_ID = os.environ.get("YOOKASSA_SHOP_ID", "")
YOOKASSA_SECRET_KEY = os.environ.get("YOOKASSA_SECRET_KEY", "")
YOOKASSA_RETURN_URL = os.environ.get("YOOKASSA_RETURN_URL", "https://t.me/stretcher_robot")
YK_API = "https://api.yookassa.ru/v3"

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


# --- Метрики Prometheus ---

HTTP_REQUESTS = Counter(
    "stretcher_http_requests_total", "HTTP-запросы", ["method", "path", "status"]
)
HTTP_DURATION = Histogram(
    "stretcher_http_request_duration_seconds", "Длительность запросов", ["method", "path"]
)
PAYMENTS_TOTAL = Gauge(
    "stretcher_payments_total", "Оплаты за всё время", ["provider", "plan"]
)
REVENUE_TOTAL = Gauge(
    "stretcher_revenue_total", "Выручка за всё время", ["provider", "plan", "currency"]
)
USERS_TOTAL = Gauge("stretcher_users_total", "Всего пользователей")
PREMIUM_ACTIVE = Gauge("stretcher_premium_active", "Активных платных подписок")
TRIAL_ACTIVE = Gauge("stretcher_trial_active", "Пользователей на триале")
CUSTOM_ROUTINES = Gauge("stretcher_custom_routines_users", "Пользователей со своими программами")

# Группируем пути, чтобы не плодить метки на каждый запрос
KNOWN_PATHS = {
    "/api/me", "/api/invoice", "/api/custom-routines",
    "/api/tg-webhook", "/api/yk-webhook", "/api/pay/yookassa",
    "/api/health", "/api/metrics",
}


@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    path = request.url.path if request.url.path in KNOWN_PATHS else "other"
    start = time.monotonic()
    response = await call_next(request)
    HTTP_DURATION.labels(request.method, path).observe(time.monotonic() - start)
    HTTP_REQUESTS.labels(request.method, path, response.status_code).inc()
    return response


def refresh_business_metrics() -> None:
    now = int(time.time())
    with db() as conn:
        USERS_TOTAL.set(conn.execute("SELECT COUNT(*) FROM users").fetchone()[0])
        PREMIUM_ACTIVE.set(
            conn.execute(
                "SELECT COUNT(*) FROM users WHERE premium_until > ?", (now,)
            ).fetchone()[0]
        )
        TRIAL_ACTIVE.set(
            conn.execute(
                "SELECT COUNT(*) FROM users WHERE premium_until <= ? AND created_at + ? > ?",
                (now, TRIAL_HOURS * 3600, now),
            ).fetchone()[0]
        )
        CUSTOM_ROUTINES.set(
            conn.execute("SELECT COUNT(*) FROM custom_routines").fetchone()[0]
        )
        for provider, plan, cnt, total, currency in conn.execute(
            """SELECT provider, plan, COUNT(*), SUM(amount), currency
               FROM payments GROUP BY provider, plan, currency"""
        ):
            PAYMENTS_TOTAL.labels(provider, plan).set(cnt)
            # Stars храним в звёздах, ЮKassa — в копейках
            value = total / 100 if currency == "RUB" else total
            REVENUE_TOTAL.labels(provider, plan, currency).set(value)


@app.get("/api/metrics")
def metrics():
    refresh_business_metrics()
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


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
                "title": f"Подписка stretcher · {plan['title']}",
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


# --- ЮKassa: оплата картой для физлиц и юрлиц ---

@app.get("/api/pay/methods")
def pay_methods():
    return {"stars": True, "yookassa": bool(YOOKASSA_SHOP_ID and YOOKASSA_SECRET_KEY)}


@app.post("/api/pay/yookassa")
async def pay_yookassa(body: dict, user: sqlite3.Row = Depends(current_user)):
    if not (YOOKASSA_SHOP_ID and YOOKASSA_SECRET_KEY):
        raise HTTPException(503, "оплата картой пока недоступна")
    plan_id = body.get("plan")
    plan = PLANS.get(plan_id)
    if not plan:
        raise HTTPException(400, "unknown plan")

    email = (body.get("email") or "").strip()
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        raise HTTPException(400, "нужен e-mail для чека")

    buyer_type = body.get("buyer_type", "individual")
    customer = {"email": email}
    if buyer_type == "company":
        org_name = (body.get("org_name") or "").strip()
        inn = (body.get("inn") or "").strip()
        if not org_name:
            raise HTTPException(400, "нужно название организации")
        if not re.fullmatch(r"\d{10}", inn):
            raise HTTPException(400, "ИНН организации должен состоять из 10 цифр")
        customer = {"full_name": org_name, "inn": inn, "email": email}
    elif buyer_type != "individual":
        raise HTTPException(400, "buyer_type: individual или company")

    amount = {"value": f"{plan['rub']:.2f}", "currency": "RUB"}
    payload = {
        "amount": amount,
        "capture": True,
        "confirmation": {"type": "redirect", "return_url": YOOKASSA_RETURN_URL},
        "description": f"Подписка stretcher · {plan['title']} (tg {user['tg_id']})",
        "metadata": {
            "tg_id": str(user["tg_id"]),
            "plan": plan_id,
            "buyer_type": buyer_type,
        },
        "receipt": {
            "customer": customer,
            "items": [{
                "description": f"Доступ к сервису stretcher · {plan['title']}",
                "quantity": "1.00",
                "amount": amount,
                "vat_code": 1,
                "payment_subject": "service",
                "payment_mode": "full_payment",
            }],
        },
    }
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{YK_API}/payments",
            json=payload,
            auth=(YOOKASSA_SHOP_ID, YOOKASSA_SECRET_KEY),
            headers={"Idempotence-Key": str(uuid.uuid4())},
            timeout=20,
        )
    data = r.json()
    if r.status_code not in (200, 201) or "confirmation" not in data:
        raise HTTPException(502, f"yookassa: {data.get('description', r.status_code)}")
    return {
        "payment_id": data["id"],
        "confirmation_url": data["confirmation"]["confirmation_url"],
    }


@app.post("/api/yk-webhook")
async def yk_webhook(request: Request):
    if not (YOOKASSA_SHOP_ID and YOOKASSA_SECRET_KEY):
        raise HTTPException(503, "not configured")
    event = await request.json()
    if event.get("event") != "payment.succeeded":
        return {"ok": True}
    payment_id = event.get("object", {}).get("id", "")
    if not payment_id:
        return {"ok": True}
    # Телу вебхука не доверяем — статус подтверждаем прямым запросом к ЮKassa
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{YK_API}/payments/{payment_id}",
            auth=(YOOKASSA_SHOP_ID, YOOKASSA_SECRET_KEY),
            timeout=20,
        )
    payment = r.json()
    if payment.get("status") != "succeeded":
        return {"ok": True}
    meta = payment.get("metadata", {})
    plan_id = meta.get("plan")
    tg_id = meta.get("tg_id")
    if not (plan_id in PLANS and tg_id):
        return {"ok": True}
    kopeks = round(float(payment["amount"]["value"]) * 100)
    grant_premium(int(tg_id), plan_id, "yookassa", kopeks, "RUB", payment_id)
    await tg_call("sendMessage", {
        "chat_id": int(tg_id),
        "text": "Оплата прошла, подписка активна! Полный доступ открыт 🤸",
    })
    return {"ok": True}


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

        text = message.get("text") or ""

        if text.startswith("/start"):
            await tg_call("sendMessage", {
                "chat_id": chat_id,
                "text": (
                    "Привет! Я stretcher — растяжка на каждый день.\n"
                    "Первые сутки — полный доступ бесплатно.\n\n"
                    "Используя сервис, вы принимаете оферту и правила сервиса, "
                    "политику обработки персональных данных и даёте согласие на "
                    "обработку персональных данных (документы — по кнопкам ниже).\n"
                    "Удалить свои данные можно в любой момент командой /delete_me."
                ),
                "reply_markup": {"inline_keyboard": [
                    [{"text": "Открыть приложение", "web_app": {"url": APP_URL}}],
                    [{"text": "📄 Оферта и правила сервиса", "url": f"{DOCS_URL}oferta.html"}],
                    [{"text": "🔒 Политика обработки ПДн", "url": f"{DOCS_URL}privacy.html"}],
                    [{"text": "📝 Согласие на обработку ПДн", "url": f"{DOCS_URL}consent.html"}],
                ]},
            })
            return {"ok": True}

        if text.startswith("/delete_me"):
            tg_id = message["from"]["id"]
            with db() as conn:
                conn.execute("DELETE FROM custom_routines WHERE tg_id = ?", (tg_id,))
                conn.execute("DELETE FROM users WHERE tg_id = ?", (tg_id,))
                # payments храним: первичные учётные документы по 54-ФЗ
            await tg_call("sendMessage", {
                "chat_id": chat_id,
                "text": (
                    "Персональные данные удалены: профиль, подписка и сохранённые "
                    "программы стёрты. Дальнейшее использование приложения станет "
                    "возможным после повторного принятия оферты и политики ПДн — "
                    "просто открой приложение заново."
                ),
            })
    return {"ok": True}


@app.get("/api/health")
def health():
    return {"ok": True}
