"""
IslamTimeWorldBot — WebApp Static File Server + REST API + Bot Webhook (FastAPI)

Local dev:   python server.py          (polling bot runs separately via start_all.ps1)
Production:  uvicorn server:app --host 0.0.0.0 --port $PORT
             Bot uses webhook auto-registered on startup when WEBAPP_URL is set.
"""

import os
import sys
import json
from contextlib import asynccontextmanager
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Query, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

# ── Config ─────────────────────────────────────────────────────────────────
BASE_DIR   = Path(__file__).parent
WEBAPP_DIR = BASE_DIR / "webapp"
BOT_TOKEN  = os.getenv("BOT_TOKEN", "")
WEBAPP_URL = os.getenv("WEBAPP_URL", "")

# ── Bot (webhook mode — only active when WEBAPP_URL is HTTPS) ──────────────
_bot = None
_dp  = None

def _is_production() -> bool:
    # Render.com sets RENDER=true automatically; also support explicit WEBHOOK_MODE=true
    on_render = os.getenv("RENDER", "").lower() == "true"
    webhook   = os.getenv("WEBHOOK_MODE", "").lower() == "true"
    return bool((on_render or webhook) and WEBAPP_URL.startswith("https://") and BOT_TOKEN)

async def _init_bot():
    global _bot, _dp
    from aiogram import Bot, Dispatcher, F, types
    from aiogram.filters import CommandStart
    from aiogram.types import (
        InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo, BotCommand
    )

    _bot = Bot(token=BOT_TOKEN)
    _dp  = Dispatcher()

    @_dp.message(CommandStart())
    async def cmd_start(message: types.Message):
        kb = InlineKeyboardMarkup(inline_keyboard=[[
            InlineKeyboardButton(
                text="🕌 IslamTimeWorldBot — Open",
                web_app=WebAppInfo(url=WEBAPP_URL),
            )
        ]])
        await message.answer(
            "🌙 <b>IslamTimeWorldBot</b>\n\n"
            "Assalomu alaykum! Ilovani ochish uchun quyidagi tugmani bosing.\n\n"
            "<i>Assalamu Alaikum! Tap the button below to open the app.</i>",
            parse_mode="HTML",
            reply_markup=kb,
        )

    @_dp.message(F.web_app_data)
    async def on_webapp_data(message: types.Message):
        try:
            data = json.loads(message.web_app_data.data)
            if data.get("action") == "set_language":
                lang = data.get("lang", "uz")
                await message.answer(f"✅ Til saqlandi: <b>{lang}</b>", parse_mode="HTML")
        except Exception:
            pass

    await _bot.set_my_commands([
        BotCommand(command="start", description="🕌 IslamTimeWorldBot ni ochish"),
    ])

    webhook_url = f"{WEBAPP_URL.rstrip('/')}/webhook/{BOT_TOKEN}"
    await _bot.set_webhook(webhook_url, drop_pending_updates=True)
    print(f"[OK] Bot webhook set: {webhook_url}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    if _is_production():
        await _init_bot()
    yield
    if _bot:
        await _bot.delete_webhook()
        await _bot.session.close()


# ── App ────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="IslamTimeWorldBot WebApp",
    docs_url="/docs",
    redoc_url=None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ── Static assets ──────────────────────────────────────────────────────────
app.mount("/css",    StaticFiles(directory=str(WEBAPP_DIR / "css")),    name="css")
app.mount("/js",     StaticFiles(directory=str(WEBAPP_DIR / "js")),     name="js")
app.mount("/data",   StaticFiles(directory=str(WEBAPP_DIR / "data")),   name="webapp_data")
app.mount("/assets", StaticFiles(directory=str(WEBAPP_DIR / "assets")), name="assets")

# ── WebApp entry point ─────────────────────────────────────────────────────
@app.get("/")
async def index():
    return FileResponse(str(WEBAPP_DIR / "index.html"))

# ── Dev test page ──────────────────────────────────────────────────────────
@app.get("/test")
async def test_page():
    return FileResponse(str(WEBAPP_DIR / "test_integration.html"))

# ── Health check ───────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return JSONResponse({"status": "ok", "service": "IslamTimeWorldBot"})

# ── Telegram Bot Webhook ──────────────────────────────────────────────────
@app.post("/webhook/{token}")
async def telegram_webhook(token: str, request: Request):
    if not _bot or token != BOT_TOKEN:
        return JSONResponse({"error": "forbidden"}, status_code=403)
    from aiogram.types import Update
    data   = await request.json()
    update = Update.model_validate(data)
    await _dp.feed_update(_bot, update)
    return {"ok": True}


# ── Prayer Times API (full card data) ─────────────────────────────────────
@app.get("/api/prayer-times")
async def api_prayer_times(
    lat:    float = Query(..., ge=-90,  le=90),
    lon:    float = Query(..., ge=-180, le=180),
    lang:   str   = Query("uz"),
    method: int   = Query(3, ge=0, le=23),
):
    """
    Full prayer times card data:
    timings · next-prayer countdown · Hijri/Gregorian dates
    city/country · madhhab · weather · AQI · daily ayah · daily hadith
    """
    import asyncio as _asyncio
    from domain.prayer.service import prayer_service
    from domain.prayer.extras  import fetch_all_extras

    prayer_task = prayer_service.get_prayer_data(lat, lon, lang, method)
    extras_task = fetch_all_extras(lat, lon)

    prayer_data, extras = await _asyncio.gather(prayer_task, extras_task)

    if not prayer_data:
        return JSONResponse(
            {"error": "Could not fetch prayer times. Check coordinates or try again."},
            status_code=503,
        )

    prayer_data.update(extras)          # merge weather / aqi / ayah / hadith
    return JSONResponse(prayer_data)

# ── Hadith API ─────────────────────────────────────────────────────────────
@app.get("/api/hadith")
async def api_hadith(
    collection: str = Query("bukhari"),
    page:       int  = Query(1, ge=1),
    limit:      int  = Query(20, ge=1, le=50),
    lang:       str  = Query("en"),
):
    """Paginated hadith list from SQLite."""
    try:
        import sqlite3, math
        db_path = BASE_DIR / "data" / "hadiths.db"
        if not db_path.exists():
            return JSONResponse({"hadiths": [], "total": 0, "page": page, "pages": 0})
        con = sqlite3.connect(str(db_path))
        con.row_factory = sqlite3.Row
        cur = con.cursor()
        col = "bukhari" if collection != "muslim" else "muslim"
        total  = cur.execute("SELECT COUNT(*) FROM hadiths WHERE collection=?", (col,)).fetchone()[0]
        offset = (page - 1) * limit
        rows   = cur.execute(
            "SELECT * FROM hadiths WHERE collection=? ORDER BY hadith_number LIMIT ? OFFSET ?",
            (col, limit, offset)
        ).fetchall()
        con.close()
        return JSONResponse({"hadiths": [dict(r) for r in rows], "total": total,
                             "page": page, "pages": math.ceil(total / limit)})
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


def _strip_harakat(s: str) -> str:
    """Remove Arabic diacritical marks (harakat/tashkeel) for flexible search."""
    import re
    return re.sub(r'[ً-ْٰۖ-ۜ۟-ۭ]', '', s or '')


@app.get("/api/hadith/search")
async def api_hadith_search(
    q:          str = Query(...),
    collection: str = Query("bukhari"),
    lang:       str = Query("en"),
):
    """Full-text search in hadiths (narrator, Indonesian text, Arabic with harakat stripping)."""
    try:
        import sqlite3
        db_path = BASE_DIR / "data" / "hadiths.db"
        if not db_path.exists():
            return JSONResponse({"hadiths": [], "total": 0})
        con = sqlite3.connect(str(db_path))
        con.row_factory = sqlite3.Row
        cur = con.cursor()
        col  = "bukhari" if collection != "muslim" else "muslim"
        like = f"%{q}%"

        # Fast SQL path: narrator (English) and text (Indonesian)
        sql_rows = cur.execute(
            "SELECT * FROM hadiths WHERE collection=? AND "
            "(narrator LIKE ? OR text LIKE ? OR chapter LIKE ?) LIMIT 50",
            (col, like, like, like)
        ).fetchall()
        results = [dict(r) for r in sql_rows]
        seen_ids = {r["id"] for r in results}

        # Python-level Arabic search with harakat stripping (for Arabic keyword queries)
        if len(results) < 50:
            q_norm = _strip_harakat(q)
            if q_norm and any(0x0600 <= ord(c) <= 0x06FF for c in q_norm):
                ar_rows = cur.execute(
                    "SELECT * FROM hadiths WHERE collection=? AND arabic != '' LIMIT 3000",
                    (col,)
                ).fetchall()
                for row in ar_rows:
                    if len(results) >= 50:
                        break
                    d = dict(row)
                    if d["id"] not in seen_ids and q_norm in _strip_harakat(d.get("arabic", "")):
                        results.append(d)
                        seen_ids.add(d["id"])

        con.close()
        return JSONResponse({"hadiths": results, "total": len(results)})
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


# ── Entry point ────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8080))
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    print(f"[OK] WebApp server  -> http://localhost:{port}")
    print(f"[OK] Prayer API     -> http://localhost:{port}/api/prayer-times?lat=41.3&lon=69.2&lang=uz")
    uvicorn.run(app, host="0.0.0.0", port=port)
