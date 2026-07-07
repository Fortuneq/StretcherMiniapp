#!/usr/bin/env python3
"""Генерация картинок для приложения flexi через kie.ai (nano-banana-pro).

Повторяет минималистичный плоский стиль существующих иллюстраций упражнений
(assets/exercises/*.png), но каждая — НОВАЯ картинка. Плюс логотип flexi.
Все картинки квадратные 1:1. Позы берутся из web/src/data/routines.json
(поле name_en), имена файлов сохраняются — это drop-in замена.

API (kie.ai):
  POST https://api.kie.ai/api/v1/jobs/createTask   -> { data: { taskId } }
  GET  https://api.kie.ai/api/v1/jobs/recordInfo?taskId=...  -> state + resultJson

Ключ из переменной окружения KIE_API_KEY.

Примеры:
  export KIE_API_KEY=...
  python scripts/generate_flexi_images.py --logo           # только логотип
  python scripts/generate_flexi_images.py --one            # 1 упражнение (тест)
  python scripts/generate_flexi_images.py --exercises      # все упражнения
  python scripts/generate_flexi_images.py --all            # логотип + все
  python scripts/generate_flexi_images.py --exercises -j 6 # 6 потоков
  # Повторный запуск пропускает уже готовые файлы (докачка).
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ROUTINES = ROOT / "web" / "src" / "data" / "routines.json"
OUT_EX = ROOT / "assets" / "generated" / "exercises"
OUT_DIR = ROOT / "assets" / "generated"

# Куда зеркалить готовые упражнения, чтобы мини-апп сразу их подхватывал.
MIRRORS = [
    ROOT / "miniapp" / "public" / "exercises",
]

BASE = "https://api.kie.ai/api/v1/jobs"
MODEL = "nano-banana-pro"

# --- Единый стиль (в точности как существующие иллюстрации упражнений) --------
STYLE = (
    "flat vector illustration, minimalist, single human figure performing the "
    "stretching / yoga exercise, clean simple geometric shapes, muted pastel "
    "color palette, solid single-color pastel background, subtle grey yoga mat "
    "under the figure, no outlines, flat shading, simplified head with almost no "
    "facial features, calm modern wellness app aesthetic, figure centered with "
    "generous empty space around it, no text, no logo, no drop shadows"
)

# Разнообразим фон, чтобы набор был живым (детерминированно по индексу).
BACKGROUNDS = [
    "soft powder-blue", "muted teal", "dusty rose", "sage green",
    "warm sand-beige", "pale lavender", "soft coral", "slate blue-grey",
]

LOGO_PROMPT = (
    "minimalist flat vector app logo icon for a stretching and flexibility app "
    "called \"flexi\": a single smooth flexible ribbon, or an abstract human "
    "figure bending into a gentle graceful curve, muted pastel palette with soft "
    "blue and teal, solid light background, clean modern geometric style, "
    "centered and balanced, no photorealism, suitable as an app icon"
)


def api_key() -> str:
    key = os.environ.get("KIE_API_KEY", "").strip()
    if not key:
        sys.exit("Нет ключа. Задай: export KIE_API_KEY=...")
    return key


def _req(url: str, key: str, data: dict | None = None) -> dict:
    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    body = json.dumps(data).encode() if data is not None else None
    req = urllib.request.Request(url, data=body, headers=headers,
                                 method="POST" if data is not None else "GET")
    last = ""
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=90) as r:
                return json.loads(r.read().decode())
        except urllib.error.HTTPError as e:
            last = f"HTTP {e.code}: {e.read().decode(errors='replace')}"
            if e.code in (429, 500, 502, 503, 504):
                time.sleep(3 * (attempt + 1))
                continue
            raise RuntimeError(last)
        except (urllib.error.URLError, TimeoutError) as e:
            last = str(e)
            time.sleep(3 * (attempt + 1))
    raise RuntimeError(last or "request failed")


def create_task(key: str, prompt: str) -> str:
    payload = {
        "model": MODEL,
        "input": {
            "prompt": prompt,
            "aspect_ratio": "1:1",
            "resolution": "2K",
            "output_format": "png",
        },
    }
    resp = _req(f"{BASE}/createTask", key, payload)
    task_id = (resp.get("data") or {}).get("taskId") or resp.get("taskId")
    if not task_id:
        raise RuntimeError(f"нет taskId: {resp}")
    return task_id


def wait_result(key: str, task_id: str, timeout: int = 360) -> str:
    deadline = time.time() + timeout
    while time.time() < deadline:
        resp = _req(f"{BASE}/recordInfo?taskId={urllib.parse.quote(task_id)}", key)
        data = resp.get("data") or {}
        state = data.get("state")
        if state == "success":
            urls = (json.loads(data.get("resultJson") or "{}")).get("resultUrls") or []
            if not urls:
                raise RuntimeError(f"success, но нет resultUrls: {data}")
            return urls[0]
        if state == "fail":
            raise RuntimeError(f"fail: {data.get('failMsg') or data}")
        time.sleep(4)
    raise RuntimeError(f"таймаут задачи {task_id}")


def download(url: str, out: Path) -> None:
    out.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=180) as r:
        out.write_bytes(r.read())


def generate(key: str, prompt: str, out: Path) -> None:
    task_id = create_task(key, prompt)
    url = wait_result(key, task_id)
    download(url, out)


def load_exercises() -> list[tuple[str, str]]:
    """Возвращает [(image_filename, name_en), ...] уникально по файлу."""
    d = json.loads(ROUTINES.read_text(encoding="utf-8"))
    seen: dict[str, str] = {}
    for r in d["routines"]:
        for e in r["exercises"]:
            img = e["image"]
            seen.setdefault(img, e.get("name_en") or e["name"])
    return sorted(seen.items())


def ex_prompt(name_en: str, idx: int) -> str:
    bg = BACKGROUNDS[idx % len(BACKGROUNDS)]
    return (f"{name_en} stretching exercise: a single person performing the "
            f"'{name_en}' pose. {bg} background. {STYLE}")


def run_batch(key: str, items: list[tuple[str, str]], workers: int,
              skip_existing: bool) -> None:
    jobs: list[tuple[str, str, Path]] = []
    for idx, (img, name) in enumerate(items):
        out = OUT_EX / img
        if skip_existing and out.exists() and out.stat().st_size > 0:
            continue
        jobs.append((name, ex_prompt(name, idx), out))

    total = len(jobs)
    done = skipped = failed = 0
    print(f"К генерации: {total} (пропущено готовых: {len(items) - total})",
          file=sys.stderr)
    if not total:
        return

    with ThreadPoolExecutor(max_workers=workers) as pool:
        fut = {pool.submit(generate, key, pr, out): (name, out)
               for name, pr, out in jobs}
        for f in as_completed(fut):
            name, out = fut[f]
            try:
                f.result()
                for mdir in MIRRORS:
                    mdir.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(out, mdir / out.name)
                done += 1
                print(f"  ✓ [{done+failed}/{total}] {out.name}  ({name})",
                      file=sys.stderr)
            except Exception as e:
                failed += 1
                print(f"  ✗ [{done+failed}/{total}] {out.name}: {e}",
                      file=sys.stderr)
    print(f"Готово: {done}, ошибок: {failed}. Ошибки можно докачать повтором "
          f"той же команды.", file=sys.stderr)


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--all", action="store_true", help="логотип + все упражнения")
    p.add_argument("--logo", action="store_true", help="только логотип")
    p.add_argument("--exercises", action="store_true", help="все упражнения")
    p.add_argument("--one", action="store_true", help="одно упражнение (тест)")
    p.add_argument("-j", "--workers", type=int, default=5, help="потоков (пар-зм)")
    p.add_argument("--force", action="store_true", help="не пропускать готовые")
    args = p.parse_args()

    key = api_key()

    if args.logo or args.all:
        print("→ логотип flexi…", file=sys.stderr)
        try:
            generate(key, LOGO_PROMPT, OUT_DIR / "flexi_logo.png")
            print(f"  ✓ {(OUT_DIR / 'flexi_logo.png').relative_to(ROOT)}",
                  file=sys.stderr)
        except Exception as e:
            print(f"  ✗ логотип: {e}", file=sys.stderr)

    items = load_exercises()
    if args.one:
        run_batch(key, items[:1], 1, skip_existing=not args.force)
    elif args.exercises or args.all:
        run_batch(key, items, args.workers, skip_existing=not args.force)

    if not (args.all or args.logo or args.exercises or args.one):
        p.print_help()


if __name__ == "__main__":
    main()
