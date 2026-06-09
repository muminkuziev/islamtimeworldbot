"""
IslamTimeWorldBot — Hadith Database Builder
Source: api.hadith.gading.dev (free, no key)
  Bukhari: 6638 hadiths  |  Muslim: 4930 hadiths
Fields: number, arab (Arabic), id (Indonesian translation)
Run: python scripts/build_hadith_db.py
"""

import asyncio
import aiohttp
import sqlite3
import re
import sys
import time
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

BASE_DIR = Path(__file__).parent.parent
DB_PATH  = BASE_DIR / "data" / "hadiths.db"

API_BASE = "https://api.hadith.gading.dev"
BATCH    = 100      # hadiths per request (max 200 for this API)

COLLECTIONS = [
    {"key": "bukhari", "total": 6638, "api": "bukhari"},
    {"key": "muslim",  "total": 4930, "api": "muslim"},
]

# ── Schema ──────────────────────────────────────────────────────────────────
SCHEMA = """
CREATE TABLE IF NOT EXISTS hadiths (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    collection     TEXT    NOT NULL,
    hadith_number  INTEGER NOT NULL,
    narrator       TEXT    DEFAULT '',
    text           TEXT    NOT NULL DEFAULT '',
    arabic         TEXT    DEFAULT '',
    chapter        TEXT    DEFAULT ''
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_col_num ON hadiths(collection, hadith_number);
CREATE INDEX IF NOT EXISTS ix_col ON hadiths(collection);
"""

def init_db(con):
    for stmt in SCHEMA.strip().split(";"):
        s = stmt.strip()
        if s:
            con.execute(s)
    con.commit()

def count(con, col):
    return con.execute(
        "SELECT COUNT(*) FROM hadiths WHERE collection=?", (col,)
    ).fetchone()[0]

def insert_batch(con, rows):
    con.executemany(
        """INSERT OR IGNORE INTO hadiths
           (collection, hadith_number, narrator, text, arabic)
           VALUES (?,?,?,?,?)""",
        [(r["collection"], r["number"], r["narrator"], r["text"], r["arabic"])
         for r in rows],
    )
    con.commit()

# ── Narrator extraction ──────────────────────────────────────────────────────
_NARRATOR_RE = re.compile(r'\[([^\]]{3,60})\]')

def extract_narrator(indonesian_text):
    """Extract first bracketed name from Indonesian translation."""
    m = _NARRATOR_RE.search(indonesian_text or "")
    return m.group(1).strip() if m else ""

# ── HTTP ─────────────────────────────────────────────────────────────────────
async def fetch_range(session, api_name, start, end, retries=4):
    url   = API_BASE + "/books/" + api_name + "?range=" + str(start) + "-" + str(end)
    delay = 2.0
    for attempt in range(retries):
        try:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as r:
                if r.status == 429:
                    await asyncio.sleep(delay * (attempt + 1))
                    continue
                if r.status != 200:
                    return []
                data = await r.json(content_type=None)
                hadiths = (data.get("data") or {}).get("hadiths") or []
                return hadiths
        except Exception as exc:
            if attempt < retries - 1:
                await asyncio.sleep(delay * (attempt + 1))
            else:
                print("\n  ⚠  fetch failed " + str(start) + "-" + str(end) + ": " + str(exc))
    return []

def parse_row(raw, collection):
    id_text  = raw.get("id", "")
    narrator = extract_narrator(id_text)
    return {
        "collection":    collection,
        "number":        raw.get("number", 0),
        "narrator":      narrator,
        "text":          id_text,        # Indonesian (best available free translation)
        "arabic":        raw.get("arab", ""),
    }

# ── Download one collection ──────────────────────────────────────────────────
async def download_collection(session, con, col):
    key      = col["key"]
    api_name = col["api"]
    total    = col["total"]
    already  = count(con, key)

    if already >= total:
        print("  ✅ " + key + ": already complete (" + str(already) + "/" + str(total) + ")")
        return

    print("\n📥 Downloading " + key + " (" + str(already) + " in DB → need " + str(total) + ")…")
    start_from = already + 1
    t0 = time.time()

    for batch_start in range(start_from, total + 1, BATCH):
        batch_end = min(batch_start + BATCH - 1, total)
        raws      = await fetch_range(session, api_name, batch_start, batch_end)

        if raws:
            rows = [parse_row(r, key) for r in raws]
            insert_batch(con, rows)

        done    = count(con, key)
        pct     = done / total * 100
        elapsed = time.time() - t0
        rate    = done / elapsed if elapsed > 0 else 0
        eta     = int((total - done) / rate) if rate > 0 else 0
        print(
            "\r  " + key + ": " + str(done).rjust(5) + "/" + str(total) +
            "  (" + ("%.1f" % pct) + "%)  " +
            "ETA=" + str(eta) + "s   ",
            end="", flush=True,
        )
        await asyncio.sleep(0.2)  # respectful rate limiting

    final = count(con, key)
    print("\n  ✅ " + key + ": " + str(final) + "/" + str(total) + " saved")

# ── Main ─────────────────────────────────────────────────────────────────────
async def main():
    print("🕌 IslamTimeWorldBot — Hadith DB Builder")
    print("   DB → " + str(DB_PATH))
    print("   Bukhari: 6638  |  Muslim: 4930  |  Total: 11568\n")

    con = sqlite3.connect(str(DB_PATH))
    init_db(con)

    connector = aiohttp.TCPConnector(limit=3)
    async with aiohttp.ClientSession(connector=connector) as session:
        for col in COLLECTIONS:
            await download_collection(session, con, col)

    print("\n📊 Final counts:")
    for col in COLLECTIONS:
        n     = count(con, col["key"])
        check = "✅" if n >= int(col["total"] * 0.9) else "⚠️ incomplete"
        print("   " + col["key"].ljust(8) + ": " + str(n).rjust(5) +
              " / " + str(col["total"]) + "  " + check)

    con.close()
    size_mb = DB_PATH.stat().st_size / 1024 / 1024
    print("\n✅ Done!  DB size: " + ("%.1f" % size_mb) + " MB")
    print("   Path: " + str(DB_PATH))

if __name__ == "__main__":
    asyncio.run(main())
