"""
Build the canonical verified HadeethEnc corpus: every hadith on hadeethenc.com
that has a translation in all 13 IslamTimeWorld canonical languages, fetched
directly from the official HadeethEnc public API (https://hadeethenc.com/api-docs/).

This is NOT AI-generated or AI-translated religious content — every language's
text is HadeethEnc's own published translation, fetched verbatim via their API.

Usage:
    python scripts/build_hadeethenc_verified_db.py

Output:
    data/hadeethenc_verified.db  (SQLite; table hadeeth_verified + build_meta)

Re-running this script re-derives the corpus from the live API from scratch —
it is idempotent (drops and rebuilds its own tables only) and does not touch
any other database or table.
"""
import json
import sqlite3
import sys
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "data" / "hadeethenc_verified.db"
API_BASE = "https://hadeethenc.com/api/v1"

CANONICAL_LANGS = ["ar", "en", "id", "ur", "bn", "fr", "hi", "fa", "tr", "ru", "uz", "de", "ms"]


def fetch_json(url: str, tries: int = 4):
    last_err = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "IslamTimeWorld-corpus-build/1.0"})
            with urllib.request.urlopen(req, timeout=20) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except Exception as e:  # noqa: BLE001 - retry on any transient failure
            last_err = e
            time.sleep(0.4 * (i + 1))
    raise RuntimeError(f"Failed to fetch {url}: {last_err}")


def discover_candidate_ids() -> list[dict]:
    """Scan every HadeethEnc category and return hadith IDs whose `translations`
    list is a superset of CANONICAL_LANGS. Deduplicates across categories
    (a hadith can belong to more than one category)."""
    categories = fetch_json(f"{API_BASE}/categories/list/?language=en")
    categories.sort(key=lambda c: int(c["hadeeths_count"]), reverse=True)

    seen: set[str] = set()
    candidates: dict[str, dict] = {}

    for cat in categories:
        if int(cat["hadeeths_count"]) == 0:
            continue
        page = 1
        last_page = 1
        while page <= last_page:
            url = f"{API_BASE}/hadeeths/list/?language=en&category_id={cat['id']}&page={page}"
            data = fetch_json(url)
            last_page = data["meta"]["last_page"] if data.get("meta") else 1
            for h in data["data"]:
                if h["id"] in seen:
                    continue
                seen.add(h["id"])
                if all(lang in h["translations"] for lang in CANONICAL_LANGS):
                    candidates[h["id"]] = {"id": h["id"], "title": h["title"]}
            page += 1
        print(f"  scanned category {cat['id']:>4} ({cat['title'][:40]:40}) "
              f"unique_seen={len(seen):5} candidates={len(candidates)}", file=sys.stderr)

    return sorted(candidates.values(), key=lambda c: int(c["id"]))


def fetch_one(hadith_id: str, lang: str) -> dict:
    url = f"{API_BASE}/hadeeths/one/?language={lang}&id={hadith_id}"
    d = fetch_json(url)
    return {
        "id": d["id"],
        "language": lang,
        "title": d.get("title", ""),
        "hadeeth": d.get("hadeeth", ""),
        "attribution": d.get("attribution", ""),
        "grade": d.get("grade", ""),
        "explanation": d.get("explanation", ""),
        "source": "hadeethenc.com",
        "source_api": url,
    }


def build():
    print("Step 1/3: discovering hadith IDs with full 13-language coverage...", file=sys.stderr)
    candidates = discover_candidate_ids()
    print(f"Found {len(candidates)} candidate hadith IDs.", file=sys.stderr)

    print("Step 2/3: fetching full content for every ID x language...", file=sys.stderr)
    records = []
    total = len(candidates) * len(CANONICAL_LANGS)
    done = 0
    for c in candidates:
        for lang in CANONICAL_LANGS:
            records.append(fetch_one(c["id"], lang))
            done += 1
            if done % 100 == 0:
                print(f"  fetched {done}/{total}", file=sys.stderr)

    print("Step 3/3: verifying integrity gate...", file=sys.stderr)
    expected_ids = {c["id"] for c in candidates}
    report = verify(records, expected_ids)
    print(json.dumps(report, indent=2), file=sys.stderr)
    if not report["PASS"]:
        print("INTEGRITY GATE FAILED — refusing to write database.", file=sys.stderr)
        sys.exit(1)

    write_db(records, report)
    print(f"Wrote {DB_PATH} ({len(records)} records, gate PASS).", file=sys.stderr)


def verify(records: list[dict], expected_ids: set[str]) -> dict:
    expected_total = len(expected_ids) * len(CANONICAL_LANGS)
    seen_keys: dict[str, int] = {}
    for r in records:
        key = f"{r['id']}|{r['language']}"
        seen_keys[key] = seen_keys.get(key, 0) + 1
    duplicates = [k for k, n in seen_keys.items() if n > 1]
    missing = [
        f"{i}|{l}" for i in expected_ids for l in CANONICAL_LANGS
        if f"{i}|{l}" not in seen_keys
    ]
    empty_text = [f"{r['id']}|{r['language']}" for r in records if not r["hadeeth"].strip()]
    mojibake = [
        f"{r['id']}|{r['language']}" for r in records
        if "�" in r["hadeeth"] or "�" in r["title"]
    ]
    return {
        "expected_id_count": len(expected_ids),
        "expected_total": expected_total,
        "actual_total": len(records),
        "duplicate_keys": duplicates,
        "missing_cells": missing,
        "empty_text_count": len(empty_text),
        "mojibake_count": len(mojibake),
        "PASS": (
            len(records) == expected_total
            and not duplicates
            and not missing
            and not empty_text
            and not mojibake
        ),
    }


def write_db(records: list[dict], report: dict):
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(str(DB_PATH))
    cur = con.cursor()
    cur.execute("DROP TABLE IF EXISTS hadeeth_verified")
    cur.execute("DROP TABLE IF EXISTS build_meta")
    cur.execute("""
        CREATE TABLE hadeeth_verified (
            id           TEXT NOT NULL,
            language     TEXT NOT NULL,
            title        TEXT,
            hadeeth_text TEXT NOT NULL,
            attribution  TEXT,
            grade        TEXT,
            explanation  TEXT,
            source       TEXT NOT NULL,
            source_api   TEXT,
            PRIMARY KEY (id, language)
        )
    """)
    cur.execute("""
        CREATE TABLE build_meta (
            key   TEXT PRIMARY KEY,
            value TEXT
        )
    """)
    cur.executemany(
        """INSERT INTO hadeeth_verified
           (id, language, title, hadeeth_text, attribution, grade, explanation, source, source_api)
           VALUES (?,?,?,?,?,?,?,?,?)""",
        [
            (r["id"], r["language"], r["title"], r["hadeeth"], r["attribution"],
             r["grade"], r["explanation"], r["source"], r["source_api"])
            for r in records
        ],
    )
    meta = {
        "built_at_utc": datetime.now(timezone.utc).isoformat(),
        "canonical_languages": ",".join(CANONICAL_LANGS),
        "hadith_id_count": str(report["expected_id_count"]),
        "record_count": str(report["actual_total"]),
        "gate_pass": "1" if report["PASS"] else "0",
        "provider": "hadeethenc.com official API (https://hadeethenc.com/api-docs/)",
        "review_status": "provider_published",  # published by HadeethEnc; not independently re-reviewed by IslamTimeWorld scholars
    }
    cur.executemany("INSERT INTO build_meta (key, value) VALUES (?, ?)", list(meta.items()))
    con.commit()
    con.close()


if __name__ == "__main__":
    build()
