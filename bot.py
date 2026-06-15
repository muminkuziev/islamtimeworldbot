import asyncio
import json
import os
import socket
import sqlite3
import sys
from datetime import datetime
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

import aiohttp
from aiogram import Bot, Dispatcher, F, types
from aiogram.client.session.aiohttp import AiohttpSession
from aiogram.filters import Command, CommandStart
from aiogram.types import (
    BotCommand,
    InlineKeyboardMarkup,
    InlineKeyboardButton,
    WebAppInfo,
)

from config.config import config
from presentation.keyboards.main_menu import main_keyboard
from presentation.handlers.prayer import router as prayer_router

# ── DNS bypass for api.telegram.org ───────────────────────────────────────
_TELEGRAM_HOST = "api.telegram.org"
_TELEGRAM_IPS  = ["149.154.167.220", "149.154.166.110", "149.154.175.53"]


class _BypassResolver:
    async def resolve(self, host, port=0, family=socket.AF_INET):
        if host == _TELEGRAM_HOST:
            print(f"[DNS] {host} → {_TELEGRAM_IPS[0]}", flush=True)
            return [{"hostname": host, "host": _TELEGRAM_IPS[0],
                     "port": port, "family": socket.AF_INET,
                     "proto": 0, "flags": 0}]
        resolver = aiohttp.ThreadedResolver()
        return await resolver.resolve(host, port, family)

    async def close(self):
        pass


# ── User tracking ──────────────────────────────────────────────────────────
_BASE_DIR = Path(__file__).parent
_USERS_DB = _BASE_DIR / "data" / "users.db"
_ADMIN_IDS = {int(x) for x in os.getenv("ADMIN_IDS", "").split(",") if x.strip().isdigit()}


def _track_user(user_id: int, username: str = "", first_name: str = "", language: str = ""):
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    try:
        conn = sqlite3.connect(str(_USERS_DB))
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


def _get_stats() -> dict:
    today = datetime.utcnow().strftime("%Y-%m-%d")
    try:
        conn = sqlite3.connect(str(_USERS_DB))
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


# ── Dispatcher ─────────────────────────────────────────────────────────────
dp = Dispatcher()
dp.include_router(__import__("presentation.handlers.prayer", fromlist=["router"]).router)


def _webapp_url_valid() -> bool:
    url = config.WEBAPP_URL or ""
    return url.startswith("https://") and url != "https://your-domain.com"


def _webapp_keyboard(url: str = "") -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(
            text="🕌 IslamTimeWorldBot — Open",
            web_app=WebAppInfo(url=url or config.WEBAPP_URL),
        )
    ]])


@dp.message(CommandStart())
async def cmd_start(message: types.Message):
    u = message.from_user
    _track_user(u.id, u.username or "", u.first_name or "", u.language_code or "")
    print(f"[DEBUG] /start from @{u.username}", flush=True)
    try:
        if _webapp_url_valid():
            await message.answer(
                "🌙 <b>IslamTimeWorldBot</b>\n\n"
                "Assalomu alaykum! Ilovani ochish uchun quyidagi tugmani bosing.\n\n"
                "<i>Assalamu Alaikum! Tap the button below to open the app.</i>",
                parse_mode="HTML",
                reply_markup=_webapp_keyboard(),
            )
        else:
            await message.answer(
                "🌙 <b>IslamTimeWorldBot</b>\nAssalomu alaykum! ✅",
                parse_mode="HTML",
            )
        print("[DEBUG] /start reply sent OK", flush=True)
    except Exception as e:
        print(f"[DEBUG] /start ERROR: {e}", flush=True)


@dp.message(Command("reset"))
async def cmd_reset(message: types.Message):
    reset_url = (config.WEBAPP_URL.rstrip("/") + "?reset=1") if _webapp_url_valid() else ""
    if not reset_url:
        await message.answer("❌ WEBAPP_URL sozlanmagan — reset ishlaydi faqat WebApp ochilganda.")
        return
    kb = InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text="🔄 Reset & Restart", web_app=WebAppInfo(url=reset_url))
    ]])
    await message.answer(
        "🔄 <b>Onboarding reset</b>\n\n"
        "Ilovani qayta boshlash uchun tugmani bosing.\n"
        "<i>Tap to clear saved settings and restart from Language screen.</i>",
        parse_mode="HTML",
        reply_markup=kb,
    )


@dp.message(Command("stats"))
async def cmd_stats(message: types.Message):
    if _ADMIN_IDS and message.from_user.id not in _ADMIN_IDS:
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


@dp.message(F.web_app_data)
async def on_webapp_data(message: types.Message):
    try:
        data = json.loads(message.web_app_data.data)
        if data.get("action") == "set_language":
            lang = data.get("lang", "uz")
            await message.answer(f"✅ Til saqlandi: <b>{lang}</b>", parse_mode="HTML")
    except Exception:
        pass


async def _set_commands(bot: Bot):
    await bot.set_my_commands([
        BotCommand(command="start",  description="🕌 IslamTimeWorldBot ni ochish"),
        BotCommand(command="reset",  description="🔄 Sozlamalarni tozalab qayta boshlash"),
        BotCommand(command="stats",  description="📊 Foydalanuvchilar statistikasi (admin)"),
    ])


async def main():
    _proxy = os.getenv("PROXY_URL", "").strip() or None

    if _proxy:
        session = AiohttpSession(proxy=_proxy)
        print(f"✅ Proxy: {_proxy}", flush=True)
    else:
        session = AiohttpSession()
        session._connector_init["resolver"] = _BypassResolver()
        print(f"✅ DNS bypass: {_TELEGRAM_HOST} → {_TELEGRAM_IPS[0]}", flush=True)

    bot = Bot(token=config.BOT_TOKEN, session=session)

    await _set_commands(bot)
    print("✅ IslamTimeWorldBot ishga tushdi (polling)...", flush=True)
    print(f"✅ WEBAPP_URL: {config.WEBAPP_URL}", flush=True)
    await dp.start_polling(bot, allowed_updates=["message", "web_app_data"])


if __name__ == "__main__":
    asyncio.run(main())
