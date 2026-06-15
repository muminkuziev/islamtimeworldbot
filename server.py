"""
IslamTimeWorldBot — WebApp Static File Server + REST API + Bot Webhook (FastAPI)

Local dev:   python server.py          (polling bot runs separately via start_all.ps1)
Production:  uvicorn server:app --host 0.0.0.0 --port $PORT
             Bot uses webhook auto-registered on startup when WEBAPP_URL is set.
"""

import os
import sys
import json
import time
import asyncio
import sqlite3
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path

# ── In-process prayer-times cache (5 min TTL) ─────────────────────────────────
_PT_CACHE: dict = {}
_PT_TTL = 300   # seconds

def _pt_cache_get(key: str):
    item = _PT_CACHE.get(key)
    if item and time.monotonic() < item[1]:
        return item[0]
    return None

def _pt_cache_put(key: str, val: dict):
    _PT_CACHE[key] = (val, time.monotonic() + _PT_TTL)

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
USERS_DB   = BASE_DIR / "data" / "users.db"
BOT_TOKEN  = os.getenv("BOT_TOKEN", "")
WEBAPP_URL = os.getenv("WEBAPP_URL", "")
_PRIMARY_ADMIN = 310467246
ADMIN_IDS = {_PRIMARY_ADMIN}
for _x in os.getenv("ADMIN_IDS", "").split(","):
    if _x.strip().isdigit():
        ADMIN_IDS.add(int(_x.strip()))

# ── User tracking (SQLite) ──────────────────────────────────────────────────
def _init_users_db():
    try:
        conn = sqlite3.connect(str(USERS_DB))
        conn.execute("""CREATE TABLE IF NOT EXISTS users (
            user_id     INTEGER PRIMARY KEY,
            username    TEXT    DEFAULT '',
            first_name  TEXT    DEFAULT '',
            language    TEXT    DEFAULT '',
            city        TEXT    DEFAULT '',
            country     TEXT    DEFAULT '',
            joined_at   TEXT    NOT NULL,
            last_active TEXT    NOT NULL
        )""")
        conn.commit()
        conn.close()
        print("[OK] users.db initialized", flush=True)
    except Exception as e:
        print(f"[WARN] users.db init: {e}", flush=True)

def _track_user(user_id: int, username: str = "", first_name: str = "", language: str = ""):
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    try:
        conn = sqlite3.connect(str(USERS_DB))
        conn.execute("""
        INSERT INTO users (user_id, username, first_name, language, joined_at, last_active)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
            username    = excluded.username,
            first_name  = excluded.first_name,
            language    = CASE WHEN excluded.language != '' THEN excluded.language ELSE language END,
            last_active = excluded.last_active
        """, (user_id, username or "", first_name or "", language, now, now))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[WARN] _track_user: {e}", flush=True)

def _update_user_lang(user_id: int, language: str):
    try:
        conn = sqlite3.connect(str(USERS_DB))
        conn.execute("UPDATE users SET language=? WHERE user_id=?", (language, user_id))
        conn.commit()
        conn.close()
    except Exception:
        pass

def _get_stats() -> dict:
    today = datetime.utcnow().strftime("%Y-%m-%d")
    try:
        conn = sqlite3.connect(str(USERS_DB))
        conn.row_factory = sqlite3.Row
        total     = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        new_today = conn.execute("SELECT COUNT(*) FROM users WHERE joined_at LIKE ?", (today+"%",)).fetchone()[0]
        active    = conn.execute("SELECT COUNT(*) FROM users WHERE last_active LIKE ?", (today+"%",)).fetchone()[0]
        by_lang   = conn.execute("SELECT language, COUNT(*) c FROM users GROUP BY language ORDER BY c DESC LIMIT 10").fetchall()
        last_10   = conn.execute("SELECT first_name, username, language, joined_at FROM users ORDER BY joined_at DESC LIMIT 10").fetchall()
        conn.close()
        return {
            "total": total, "new_today": new_today, "active_today": active,
            "by_lang": [(r["language"] or "?", r["c"]) for r in by_lang],
            "last_10": [(r["first_name"], r["username"], r["language"], r["joined_at"][:10]) for r in last_10],
        }
    except Exception as e:
        return {"error": str(e)}

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
    import socket
    import aiohttp
    from aiogram import Bot, Dispatcher, F, types
    from aiogram.client.session.aiohttp import AiohttpSession
    from aiogram.filters import Command, CommandStart
    from aiogram.types import (
        InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo, BotCommand
    )

    _TG_HOST = "api.telegram.org"
    _TG_IPS  = ["149.154.167.220", "149.154.166.110", "149.154.175.53"]

    class _BypassResolver:
        async def resolve(self, host, port=0, family=socket.AF_INET):
            if host == _TG_HOST:
                print(f"[DNS] {host} → {_TG_IPS[0]}", flush=True)
                return [{"hostname": host, "host": _TG_IPS[0],
                         "port": port, "family": socket.AF_INET,
                         "proto": 0, "flags": 0}]
            resolver = aiohttp.ThreadedResolver()
            return await resolver.resolve(host, port, family)
        async def close(self):
            pass

    _proxy = os.getenv("PROXY_URL", "").strip() or None
    if _proxy:
        session = AiohttpSession(proxy=_proxy)
        print(f"[OK] Bot proxy: {_proxy}", flush=True)
    else:
        session = AiohttpSession()
        session._connector_init["resolver"] = _BypassResolver()
        print(f"[OK] Bot DNS bypass: {_TG_HOST} → {_TG_IPS[0]}", flush=True)

    _bot = Bot(token=BOT_TOKEN, session=session)
    _dp  = Dispatcher()

    @_dp.message(CommandStart())
    async def cmd_start(message: types.Message):
        u = message.from_user
        _track_user(u.id, u.username or "", u.first_name or "", u.language_code or "")
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

    @_dp.message(Command("stats"))
    async def cmd_stats(message: types.Message):
        if message.from_user.id not in ADMIN_IDS:
            await message.answer("⛔ Sizda ushbu buyruqdan foydalanish huquqi yo'q.")
            return
        s = _get_stats()
        if "error" in s:
            await message.answer(f"❌ {s['error']}")
            return
        txt  = "📊 <b>IslamTimeWorldBot Stats</b>\n\n"
        txt += f"👥 Jami: <b>{s['total']}</b>\n"
        txt += f"🆕 Bugun yangi: <b>{s['new_today']}</b>\n"
        txt += f"📱 Bugun faol: <b>{s['active_today']}</b>\n\n"
        txt += "🌐 <b>Tillar:</b>\n"
        for lang, cnt in s['by_lang']:
            txt += f"  {lang}: {cnt}\n"
        txt += "\n👤 <b>So'nggi 10:</b>\n"
        for fn, un, lg, jt in s['last_10']:
            un_str = f" @{un}" if un else ""
            txt += f"  {fn or '?'}{un_str} ({lg or '?'}) — {jt}\n"
        await message.answer(txt, parse_mode="HTML")

    @_dp.message(Command("reset"))
    async def cmd_reset(message: types.Message):
        kb = InlineKeyboardMarkup(inline_keyboard=[[
            InlineKeyboardButton(
                text="🔄 Reset & Restart",
                web_app=WebAppInfo(url=WEBAPP_URL + "?reset=1"),
            )
        ]])
        await message.answer(
            "🔄 <b>Onboarding reset</b>\n\n"
            "Ilovani qayta boshlash uchun tugmani bosing.\n"
            "<i>Tap to clear saved settings and restart from Language screen.</i>",
            parse_mode="HTML",
            reply_markup=kb,
        )

    @_dp.message(Command("users"))
    async def cmd_users(message: types.Message):
        if message.from_user.id not in ADMIN_IDS:
            await message.answer("⛔ Sizda ushbu buyruqdan foydalanish huquqi yo'q.")
            return
        s = _get_stats()
        if "error" in s:
            await message.answer(f"❌ {s['error']}")
            return
        txt = f"👥 <b>So'nggi foydalanuvchilar:</b>\n\n"
        for fn, un, lg, jt in s["last_10"]:
            un_str = f" @{un}" if un else ""
            txt += f"  {fn or '?'}{un_str} [{lg or '?'}] — {jt}\n"
        await message.answer(txt, parse_mode="HTML")

    @_dp.message(Command("broadcast"))
    async def cmd_broadcast(message: types.Message):
        if message.from_user.id not in ADMIN_IDS:
            await message.answer("⛔ Sizda ushbu buyruqdan foydalanish huquqi yo'q.")
            return
        parts = message.text.split(maxsplit=1)
        if len(parts) < 2 or not parts[1].strip():
            await message.answer(
                "📢 <b>Broadcast:</b>\n<code>/broadcast Xabar matni</code>",
                parse_mode="HTML",
            )
            return
        text_to_send = parts[1].strip()
        try:
            conn = sqlite3.connect(str(USERS_DB))
            user_ids = [r[0] for r in conn.execute("SELECT user_id FROM users").fetchall()]
            conn.close()
        except Exception:
            user_ids = []
        if not user_ids:
            await message.answer("📭 Hali foydalanuvchi yo'q.")
            return
        status_msg = await message.answer(f"📤 {len(user_ids)} ta foydalanuvchiga yuborilmoqda...")
        sent = blocked = failed = 0
        for uid in user_ids:
            try:
                await _bot.send_message(uid, text_to_send, parse_mode="HTML")
                sent += 1
            except Exception as e:
                err = str(e).lower()
                if "blocked" in err or "deactivated" in err or "chat not found" in err:
                    blocked += 1
                else:
                    failed += 1
            await asyncio.sleep(0.05)
        await _bot.edit_message_text(
            f"✅ <b>Broadcast yakunlandi</b>\n\n"
            f"📤 Yuborildi: {sent}\n🚫 Bloklangan: {blocked}\n❌ Xatolik: {failed}",
            chat_id=message.chat.id, message_id=status_msg.message_id,
            parse_mode="HTML",
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

    try:
        # Public commands for all users
        await _bot.set_my_commands([
            BotCommand(command="start", description="🕌 IslamTimeWorldBot ni ochish"),
            BotCommand(command="reset", description="🔄 Sozlamalarni tozalab qayta boshlash"),
        ])
        # Admin-only command menu (per-chat scope)
        admin_cmds = [
            BotCommand(command="start",     description="🕌 IslamTimeWorldBot ni ochish"),
            BotCommand(command="reset",     description="🔄 Sozlamalarni tozalab qayta boshlash"),
            BotCommand(command="stats",     description="📊 Statistika"),
            BotCommand(command="users",     description="👥 Foydalanuvchilar ro'yxati"),
            BotCommand(command="broadcast", description="📢 Barcha userlarga xabar"),
        ]
        from aiogram.types import BotCommandScopeChat
        for admin_id in ADMIN_IDS:
            try:
                await _bot.set_my_commands(admin_cmds, scope=BotCommandScopeChat(chat_id=admin_id))
            except Exception:
                pass
        print("[OK] set_my_commands done", flush=True)
    except Exception as e:
        print(f"[WARN] set_my_commands failed: {e}", flush=True)

    webhook_url = f"{WEBAPP_URL.rstrip('/')}/webhook/{BOT_TOKEN}"
    try:
        await _bot.set_webhook(webhook_url, drop_pending_updates=True)
        print(f"[OK] Bot webhook set: {webhook_url}", flush=True)
    except Exception as e:
        print(f"[ERROR] set_webhook failed: {e}", flush=True)
        import traceback; traceback.print_exc()


@asynccontextmanager
async def lifespan(app: FastAPI):
    _init_users_db()
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

@app.get("/prayer-test")
async def prayer_test_page():
    return FileResponse(str(WEBAPP_DIR / "prayer_test.html"))

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
    try:
        data   = await request.json()
        update = Update.model_validate(data)
        await _dp.feed_update(_bot, update)
    except Exception as e:
        # Always return 200 to Telegram — retrying a bad update causes flood
        print(f"[WARN] webhook handler error: {e}", flush=True)
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
    from domain.prayer.service import prayer_service
    from domain.prayer.extras  import fetch_all_extras

    cache_key = f"{round(lat, 2)},{round(lon, 2)},{method},{lang}"
    cached = _pt_cache_get(cache_key)
    if cached is not None:
        return JSONResponse(cached)

    prayer_task = prayer_service.get_prayer_data(lat, lon, lang, method)
    extras_task = fetch_all_extras(lat, lon, lang)

    prayer_data, extras = await asyncio.gather(prayer_task, extras_task)

    if not prayer_data:
        return JSONResponse(
            {"error": "Could not fetch prayer times. Check coordinates or try again."},
            status_code=503,
        )

    prayer_data.update(extras)
    # Only cache when weather + aqi loaded; skip cache on partial failures so next
    # request retries the failing external APIs instead of serving stale nulls.
    if extras.get('weather') is not None and extras.get('aqi') is not None:
        _pt_cache_put(cache_key, prayer_data)
    return JSONResponse(prayer_data)

# ── Category → Chapter mapping (Uzbek Bukhari) ─────────────────────────────
CATEGORY_CHAPTERS: dict = {
    "Iymon":   [2],
    "Tahorat": [4, 5, 6, 7],
    "Namoz":   [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
    "Ro'za":   [25, 26],
    "Haj":     [21, 22, 23],
    "Zakot":   [42, 44, 50],
    "Savdo":   [27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41],
    "Nikoh":   [144, 145, 146],
    "Ilm":     [3, 143],
    "Adab":    [154, 155, 156, 158],
    "Zikr":    [157, 176],
    "Qiyomat": [159, 169, 170, 172, 174],
}

def _muslim_row(r, lang: str) -> dict:
    """Convert a hadiths_muslim SQLite row to the API response dict."""
    if lang in ("uz", "uz_cyr"):
        text = (r["uz_cyr"] if lang == "uz_cyr" else r["uz_text"]) or ""
    elif lang == "ru":
        text = r["ru_text"] or ""
    else:
        text = r["en_text"] or ""
    return {
        "id":            r["id"],
        "collection":    "muslim",
        "hadith_number": r["hadith_number"],
        "narrator":      "",
        "text":          text,
        "arabic":        r["arabic"] or "",
        "chapter":       r["chapter_name"] or "",
        "chapter_id":    r["book_id"],
        "jild":          "",
        "apk_id":        0,
    }


# ── Hadith API ─────────────────────────────────────────────────────────────
@app.get("/api/hadith")
async def api_hadith(
    collection: str      = Query("bukhari"),
    page:       int      = Query(1, ge=1),
    limit:      int      = Query(20, ge=1, le=50),
    lang:       str      = Query("en"),
    chapter_id: int|None = Query(None),
):
    """Paginated hadith list. chapter_id filters by specific Bukhari chapter (uz only)."""
    import math
    db_path = BASE_DIR / "data" / "hadiths.db"
    if not db_path.exists():
        return JSONResponse({"hadiths": [], "total": 0, "page": page, "pages": 0})

    col    = "bukhari" if collection != "muslim" else "muslim"
    offset = (page - 1) * limit
    use_uz = lang in ("uz", "uz_cyr") and col == "bukhari"

    def _query():
        import sqlite3
        con = sqlite3.connect(str(db_path))
        con.row_factory = sqlite3.Row
        cur = con.cursor()

        if use_uz:
            tbl_ok = cur.execute(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='hadiths_uz_bukhari'"
            ).fetchone()[0]
            if tbl_ok:
                if chapter_id is not None:
                    total = cur.execute(
                        "SELECT COUNT(*) FROM hadiths_uz_bukhari WHERE chapter_id=?",
                        (chapter_id,)
                    ).fetchone()[0]
                    rows = cur.execute(
                        "SELECT sort_order, apk_id, jild_id, chapter_id, chapter_name, uz_text "
                        "FROM hadiths_uz_bukhari WHERE chapter_id=? ORDER BY sort_order LIMIT ? OFFSET ?",
                        (chapter_id, limit, offset)
                    ).fetchall()
                else:
                    total = cur.execute("SELECT COUNT(*) FROM hadiths_uz_bukhari").fetchone()[0]
                    rows  = cur.execute(
                        "SELECT sort_order, apk_id, jild_id, chapter_id, chapter_name, uz_text "
                        "FROM hadiths_uz_bukhari ORDER BY sort_order LIMIT ? OFFSET ?",
                        (limit, offset)
                    ).fetchall()
                result = [{
                    "id":            r["sort_order"],
                    "collection":    "bukhari",
                    "hadith_number": r["sort_order"],
                    "narrator":      "",
                    "text":          r["uz_text"],
                    "arabic":        "",
                    "chapter":       r["chapter_name"],
                    "chapter_id":    r["chapter_id"],
                    "jild":          r["jild_id"],
                    "apk_id":        r["apk_id"],
                } for r in rows]
                con.close()
                return result, total

        if col == "muslim":
            if chapter_id is not None:
                total = cur.execute(
                    "SELECT COUNT(*) FROM hadiths_muslim WHERE book_id=?", (chapter_id,)
                ).fetchone()[0]
                rows = cur.execute(
                    "SELECT * FROM hadiths_muslim WHERE book_id=? ORDER BY hadith_number LIMIT ? OFFSET ?",
                    (chapter_id, limit, offset)
                ).fetchall()
            else:
                total = cur.execute("SELECT COUNT(*) FROM hadiths_muslim").fetchone()[0]
                rows  = cur.execute(
                    "SELECT * FROM hadiths_muslim ORDER BY hadith_number LIMIT ? OFFSET ?",
                    (limit, offset)
                ).fetchall()
            result = [_muslim_row(r, lang) for r in rows]
            con.close()
            return result, total

        total = cur.execute("SELECT COUNT(*) FROM hadiths WHERE collection=?", (col,)).fetchone()[0]
        rows  = cur.execute(
            "SELECT * FROM hadiths WHERE collection=? ORDER BY hadith_number LIMIT ? OFFSET ?",
            (col, limit, offset)
        ).fetchall()
        result = [dict(r) for r in rows]
        con.close()
        return result, total

    try:
        rows, total = await asyncio.to_thread(_query)
        return JSONResponse({"hadiths": rows, "total": total,
                             "page": page, "pages": math.ceil(total / limit)})
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.get("/api/hadith/categories")
async def api_hadith_categories(lang: str = Query("en")):
    """Returns all categories with hadith counts (uz/bukhari only)."""
    if lang not in ("uz", "uz_cyr"):
        return JSONResponse({"categories": []})
    db_path = BASE_DIR / "data" / "hadiths.db"
    if not db_path.exists():
        return JSONResponse({"categories": []})

    def _query():
        import sqlite3
        con = sqlite3.connect(str(db_path))
        cur = con.cursor()
        out = []
        for name, ids in CATEGORY_CHAPTERS.items():
            if not ids:
                continue
            ph  = ",".join("?" * len(ids))
            row = cur.execute(
                f"SELECT COUNT(*) FROM hadiths_uz_bukhari WHERE chapter_id IN ({ph})", ids
            ).fetchone()
            out.append({"name": name, "count": row[0] if row else 0, "chapter_count": len(ids)})
        con.close()
        return out

    try:
        cats = await asyncio.to_thread(_query)
        return JSONResponse({"categories": cats})
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.get("/api/hadith/muslim/books")
async def api_hadith_muslim_books():
    """Returns the 57 Sahih Muslim books with hadith counts."""
    db_path = BASE_DIR / "data" / "hadiths.db"
    if not db_path.exists():
        return JSONResponse({"books": []})

    def _query():
        import sqlite3
        con = sqlite3.connect(str(db_path))
        cur = con.cursor()
        rows = cur.execute(
            "SELECT book_id, chapter_name, COUNT(*) "
            "FROM hadiths_muslim GROUP BY book_id, chapter_name ORDER BY book_id"
        ).fetchall()
        con.close()
        return [{"book_id": r[0], "name": r[1], "count": r[2]} for r in rows]

    try:
        books = await asyncio.to_thread(_query)
        return JSONResponse({"books": books})
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.get("/api/hadith/category")
async def api_hadith_category(name: str = Query(...), lang: str = Query("en")):
    """Returns chapters for a named category (uz/bukhari only)."""
    ids = CATEGORY_CHAPTERS.get(name, [])
    if lang not in ("uz", "uz_cyr") or not ids:
        return JSONResponse({"category": name, "chapters": [], "total": 0})
    db_path = BASE_DIR / "data" / "hadiths.db"
    if not db_path.exists():
        return JSONResponse({"category": name, "chapters": [], "total": 0})

    def _query():
        import sqlite3
        con = sqlite3.connect(str(db_path))
        cur = con.cursor()
        ph  = ",".join("?" * len(ids))
        rows = cur.execute(
            f"SELECT chapter_id, chapter_name, jild_id, COUNT(*) "
            f"FROM hadiths_uz_bukhari WHERE chapter_id IN ({ph}) "
            f"GROUP BY chapter_id, chapter_name, jild_id ORDER BY chapter_id",
            ids
        ).fetchall()
        total = cur.execute(
            f"SELECT COUNT(*) FROM hadiths_uz_bukhari WHERE chapter_id IN ({ph})", ids
        ).fetchone()[0]
        chapters = [{"chapter_id": r[0], "chapter_name": r[1], "jild": r[2], "count": r[3]}
                    for r in rows]
        con.close()
        return chapters, total

    try:
        chapters, total = await asyncio.to_thread(_query)
        return JSONResponse({"category": name, "chapters": chapters, "total": total})
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
    """Full-text search. For lang=uz/uz_cyr + bukhari: searches Uzbek translation table."""
    db_path = BASE_DIR / "data" / "hadiths.db"
    if not db_path.exists():
        return JSONResponse({"hadiths": [], "total": 0})

    col    = "bukhari" if collection != "muslim" else "muslim"
    use_uz = lang in ("uz", "uz_cyr") and col == "bukhari"

    def _search():
        import sqlite3
        con = sqlite3.connect(str(db_path))
        con.row_factory = sqlite3.Row
        cur  = con.cursor()
        like = f"%{q}%"

        if use_uz:
            tbl_ok = cur.execute(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='hadiths_uz_bukhari'"
            ).fetchone()[0]
            if tbl_ok:
                # Try numeric search by sort_order
                try:
                    num = int(q.strip())
                    rows = cur.execute(
                        "SELECT sort_order, apk_id, jild_id, chapter_name, uz_text "
                        "FROM hadiths_uz_bukhari WHERE sort_order=? LIMIT 1",
                        (num,)
                    ).fetchall()
                except ValueError:
                    rows = []
                if not rows:
                    rows = cur.execute(
                        "SELECT sort_order, apk_id, jild_id, chapter_name, uz_text "
                        "FROM hadiths_uz_bukhari "
                        "WHERE uz_text LIKE ? OR chapter_name LIKE ? LIMIT 50",
                        (like, like)
                    ).fetchall()
                results = [{
                    "id":            r["sort_order"],
                    "collection":    "bukhari",
                    "hadith_number": r["sort_order"],
                    "narrator":      "",
                    "text":          r["uz_text"],
                    "arabic":        "",
                    "chapter":       r["chapter_name"],
                    "jild":          r["jild_id"],
                    "apk_id":        r["apk_id"],
                } for r in rows]
                con.close()
                return results

        if col == "muslim":
            try:
                num = int(q.strip())
                rows = cur.execute(
                    "SELECT * FROM hadiths_muslim WHERE hadith_number=? LIMIT 1", (num,)
                ).fetchall()
            except ValueError:
                rows = []
            if not rows:
                rows = cur.execute(
                    "SELECT * FROM hadiths_muslim WHERE "
                    "en_text LIKE ? OR chapter_name LIKE ? LIMIT 50",
                    (like, like)
                ).fetchall()
            q_norm = _strip_harakat(q)
            if len(rows) < 50 and q_norm and any(0x0600 <= ord(c) <= 0x06FF for c in q_norm):
                ar_rows = cur.execute(
                    "SELECT * FROM hadiths_muslim WHERE arabic IS NOT NULL LIMIT 3000"
                ).fetchall()
                seen = {r["id"] for r in rows}
                for row in ar_rows:
                    if len(rows) >= 50:
                        break
                    if row["id"] not in seen and q_norm in _strip_harakat(row["arabic"] or ""):
                        rows.append(row)
                        seen.add(row["id"])
            con.close()
            return [_muslim_row(r, lang) for r in rows]

        sql_rows = cur.execute(
            "SELECT * FROM hadiths WHERE collection=? AND "
            "(narrator LIKE ? OR text LIKE ? OR chapter LIKE ?) LIMIT 50",
            (col, like, like, like)
        ).fetchall()
        results  = [dict(r) for r in sql_rows]
        seen_ids = {r["id"] for r in results}

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
        return results

    try:
        results = await asyncio.to_thread(_search)
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
