#!/usr/bin/env python3
"""Скачивает список рутин с bend.com, все картинки и собирает routines.json."""
import html as html_mod
import json
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"
EX_DIR = ASSETS / "exercises"
OUT_JSON = ROOT / "web" / "src" / "data" / "routines.raw.json"

EX_DIR.mkdir(parents=True, exist_ok=True)
OUT_JSON.parent.mkdir(parents=True, exist_ok=True)


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8", errors="replace")


def download(url: str, out: Path) -> None:
    if out.exists() and out.stat().st_size > 0:
        return
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        out.write_bytes(r.read())


def get_slugs() -> list[str]:
    html = fetch("https://bend.com/routines")
    return sorted(set(re.findall(r'href="/routines/([a-z0-9-]+)"', html)))


IMG_TAG_RE = re.compile(r"<img\b[^>]*>", re.IGNORECASE)
ATTR_RE = re.compile(r'(\w+)="([^"]*)"')
NEXT_URL_RE = re.compile(r"/_next/image\?url=([^&\"]+)")


def unquote(u: str) -> str:
    return urllib.parse.unquote(u)


def clean(text: str) -> str:
    return html_mod.unescape(text).strip()


def parse_routine(slug: str) -> dict:
    url = f"https://bend.com/routines/{slug}"
    html = fetch(url)

    title_m = re.search(r"<h1[^>]*>([^<]+)</h1>", html)
    title = clean(title_m.group(1)) if title_m else slug

    dur_m = re.search(r"(\d+)\s*minutes", html)
    duration = int(dur_m.group(1)) if dur_m else None

    desc_m = re.search(r'<meta name="description" content="([^"]+)"', html)
    description = clean(desc_m.group(1)) if desc_m else ""

    exercises: list[dict] = []
    seen_names: set[str] = set()
    for tag in IMG_TAG_RE.findall(html):
        attrs = dict(ATTR_RE.findall(tag))
        alt = attrs.get("alt", "")
        src = attrs.get("src", "")
        if "exercise_images" not in src:
            continue
        m = NEXT_URL_RE.search(src)
        if not m:
            continue
        real_url = unquote(m.group(1))
        image_name = Path(urllib.parse.urlparse(real_url).path).name
        name = clean(alt)
        if name.endswith(" demonstration"):
            continue
        if name in seen_names:
            continue
        seen_names.add(name)
        exercises.append({"name": name, "image": image_name, "image_url": real_url})

    return {
        "slug": slug,
        "title": title,
        "duration_min": duration,
        "description": description,
        "exercises": exercises,
    }


def main() -> None:
    slugs = get_slugs()
    print(f"Found {len(slugs)} routines", file=sys.stderr)

    all_ex_urls: set[str] = set()
    routines: list[dict] = []
    for i, slug in enumerate(slugs, 1):
        try:
            r = parse_routine(slug)
        except Exception as e:
            print(f"[{i}/{len(slugs)}] {slug} FAILED: {e}", file=sys.stderr)
            continue
        routines.append(r)
        for e in r["exercises"]:
            all_ex_urls.add(e["image_url"])
        print(
            f"[{i}/{len(slugs)}] {slug}: {r['title']}, "
            f"{r['duration_min']}min, {len(r['exercises'])} exercises",
            file=sys.stderr,
        )

    print(f"Downloading {len(all_ex_urls)} exercise images...", file=sys.stderr)
    for u in sorted(all_ex_urls):
        name = Path(urllib.parse.urlparse(u).path).name
        try:
            download(u, EX_DIR / name)
        except Exception as e:
            print(f"  FAIL {u}: {e}", file=sys.stderr)

    OUT_JSON.write_text(
        json.dumps(routines, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"Wrote {OUT_JSON}", file=sys.stderr)


if __name__ == "__main__":
    main()
