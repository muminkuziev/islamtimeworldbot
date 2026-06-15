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


# ══════════════════════════════════════════════════════════════════════════
#  Admin configuration
# ══════════════════════════════════════════════════════════════════════════

_BASE_DIR  = Path(__file__).parent
_USERS_DB  = _BASE_DIR / "data" / "users.db"

# Primary admin always included; extend via ADMIN_IDS env var (comma-separated)
_PRIMARY_ADMIN = 310467246
_ADMIN_IDS: set[int] = {_PRIMARY_ADMIN}
_env_ids = os.getenv("ADMIN_IDS", "")
for _x in _env_ids.split(","):
    _x = _x.strip()
    if _x.isdigit():
        _ADMIN_IDS.add(int(_x))


async def _require_admin(message: types.Message) -> bool:
    """Return True if sender is admin, otherwise send denial and return False."""
    if message.from_user.id in _ADMIN_IDS:
        return True
    await message.answer("⛔ Sizda ushbu buyruqdan foydalanish huquqi yo'q.")
    return False


# ══════════════════════════════════════════════════════════════════════════
#  Database helpers
# ══════════════════════════════════════════════════════════════════════════

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
        new_today = conn.execute("SELECT COUNT(*) FROM users WHERE joined_at LIKE ?",    (today + "%",)).fetchone()[0]
        active    = conn.execute("SELECT COUNT(*) FROM users WHERE last_active LIKE ?",  (today + "%",)).fetchone()[0]
        by_lang   = conn.execute("SELECT language, COUNT(*) c FROM users GROUP BY language ORDER BY c DESC LIMIT 10").fetchall()
        last_10   = conn.execute("SELECT first_name, username, language, joined_at FROM users ORDER BY joined_at DESC LIMIT 10").fetchall()
        conn.close()
        return {
            "total":      total,
            "new_today":  new_today,
            "active_today": active,
            "by_lang":    [(r["language"] or "?", r["c"]) for r in by_lang],
            "last_10":    [(r["first_name"], r["username"], r["language"], r["joined_at"][:10]) for r in last_10],
        }
    except Exception as e:
        return {"error": str(e)}


def _get_all_user_ids() -> list[int]:
    try:
        conn = sqlite3.connect(str(_USERS_DB))
        rows = conn.execute("SELECT user_id FROM users").fetchall()
        conn.close()
        return [r[0] for r in rows]
    except Exception:
        return []


def _get_recent_users(limit: int = 20) -> list[dict]:
    try:
        conn = sqlite3.connect(str(_USERS_DB))
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            "SELECT user_id, first_name, username, language, joined_at, last_active "
            "FROM users ORDER BY joined_at DESC LIMIT ?", (limit,)
        ).fetchall()
        conn.close()
        return [dict(r) for r in rows]
    except Exception:
        return []


# ══════════════════════════════════════════════════════════════════════════
#  Dispatcher
# ══════════════════════════════════════════════════════════════════════════

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


# ══════════════════════════════════════════════════════════════════════════
#  Public commands
# ══════════════════════════════════════════════════════════════════════════

@dp.message(CommandStart())
async def cmd_start(message: types.Message):
    u = message.from_user
    _track_user(u.id, u.username or "", u.first_name or "", u.language_code or "")
    print(f"[DEBUG] /start from {u.id} @{u.username}", flush=True)
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


# ══════════════════════════════════════════════════════════════════════════
#  Admin commands  (all gated by _require_admin)
# ══════════════════════════════════════════════════════════════════════════

@dp.message(Command("stats"))
async def cmd_stats(message: types.Message):
    if not await _require_admin(message):
        return

    s = _get_stats()
    if "error" in s:
        await message.answer(f"❌ DB xatosi: {s['error']}")
        return

    txt  = "📊 <b>IslamTimeWorldBot — Statistika</b>\n\n"
    txt += f"👥 Jami foydalanuvchilar: <b>{s['total']}</b>\n"
    txt += f"🆕 Bugun yangi:           <b>{s['new_today']}</b>\n"
    txt += f"📱 Bugun faol:            <b>{s['active_today']}</b>\n\n"
    txt += "🌐 <b>Tillar bo'yicha:</b>\n"
    for lang, cnt in s["by_lang"]:
        bar = "█" * min(cnt, 10)
        txt += f"  {lang:<8} {bar} {cnt}\n"
    txt += "\n👤 <b>So'nggi 10 ta:</b>\n"
    for fn, un, lg, jt in s["last_10"]:
        un_str = f" @{un}" if un else ""
        txt += f"  {fn or '?'}{un_str} [{lg or '?'}] — {jt}\n"

    await message.answer(txt, parse_mode="HTML")


@dp.message(Command("users"))
async def cmd_users(message: types.Message):
    if not await _require_admin(message):
        return

    rows = _get_recent_users(20)
    if not rows:
        await message.answer("📭 Hali foydalanuvchi yo'q.")
        return

    txt = f"👥 <b>So'nggi {len(rows)} ta foydalanuvchi:</b>\n\n"
    for i, r in enumerate(rows, 1):
        un  = f"@{r['username']}" if r["username"] else f"ID:{r['user_id']}"
        fn  = r["first_name"] or "?"
        lg  = r["language"] or "?"
        jt  = r["joined_at"][:10] if r["joined_at"] else "?"
        la  = r["last_active"][:10] if r["last_active"] else "?"
        txt += f"{i}. <b>{fn}</b> {un} [{lg}]\n   Qo'shildi: {jt} · Oxirgi: {la}\n"

    await message.answer(txt, parse_mode="HTML")


@dp.message(Command("broadcast"))
async def cmd_broadcast(message: types.Message):
    if not await _require_admin(message):
        return

    # Usage: /broadcast Xabar matni shu yerga
    parts = message.text.split(maxsplit=1)
    if len(parts) < 2 or not parts[1].strip():
        await message.answer(
            "📢 <b>Broadcast — foydalanish:</b>\n\n"
            "<code>/broadcast Xabar matni shu yerda yoziladi</code>\n\n"
            "⚠️ Bu barcha foydalanuvchilarga xabar yuboradi.",
            parse_mode="HTML",
        )
        return

    text    = parts[1].strip()
    user_ids = _get_all_user_ids()
    total   = len(user_ids)

    if total == 0:
        await message.answer("📭 Hali foydalanuvchi yo'q.")
        return

    status_msg = await message.answer(
        f"📤 {total} ta foydalanuvchiga yuborilmoqda...", parse_mode="HTML"
    )

    sent = blocked = failed = 0
    bot: Bot = message.bot
    for uid in user_ids:
        try:
            await bot.send_message(uid, text, parse_mode="HTML")
            sent += 1
        except Exception as e:
            err = str(e).lower()
            if "blocked" in err or "deactivated" in err or "chat not found" in err:
                blocked += 1
            else:
                failed += 1
        await asyncio.sleep(0.05)  # Telegram rate limit: ~20 msg/s

    await status_msg.edit_text(
        f"✅ <b>Broadcast yakunlandi</b>\n\n"
        f"📤 Yuborildi:    {sent}\n"
        f"🚫 Bloklangan:   {blocked}\n"
        f"❌ Xatolik:      {failed}\n"
        f"📊 Jami:         {total}",
        parse_mode="HTML",
    )


@dp.message(Command("logs"))
async def cmd_logs(message: types.Message):
    if not await _require_admin(message):
        return

    log_files = [
        _BASE_DIR / "bot_out2.txt",
        _BASE_DIR / "bot_out.txt",
        _BASE_DIR / "server_out.txt",
    ]
    text = ""
    for f in log_files:
        if f.exists():
            try:
                lines = f.read_text(encoding="utf-8", errors="replace").splitlines()
                recent = "\n".join(lines[-30:]) if lines else "(bo'sh)"
                text = f"📋 <b>{f.name} (oxirgi 30 qator):</b>\n<pre>{recent[:3500]}</pre>"
                break
            except Exception as e:
                text = f"❌ {f.name} o'qishda xatolik: {e}"
                break

    if not text:
        text = "📭 Log fayl topilmadi."

    await message.answer(text, parse_mode="HTML")


@dp.message(Command("restart"))
async def cmd_restart(message: types.Message):
    if not await _require_admin(message):
        return
    await message.answer(
        "🔄 <b>Restart</b>\n\n"
        "Render.com da qayta ishga tushirish uchun:\n"
        "1. Render Dashboard → Manual Deploy\n"
        "2. Yoki GitHub'ga yangi commit push qiling.\n\n"
        "<i>Local botda restart qo'llab-quvvatlanmaydi.</i>",
        parse_mode="HTML",
    )


# ══════════════════════════════════════════════════════════════════════════
#  WebApp data handler
# ══════════════════════════════════════════════════════════════════════════

@dp.message(F.web_app_data)
async def on_webapp_data(message: types.Message):
    try:
        data = json.loads(message.web_app_data.data)
        if data.get("action") == "set_language":
            lang = data.get("lang", "uz")
            await message.answer(f"✅ Til saqlandi: <b>{lang}</b>", parse_mode="HTML")
    except Exception:
        pass


# ══════════════════════════════════════════════════════════════════════════
#  Bot commands menu
# ══════════════════════════════════════════════════════════════════════════

async def _set_commands(bot: Bot):
    # Public commands visible to all users
    await bot.set_my_commands([
        BotCommand(command="start",  description="🕌 IslamTimeWorldBot ni ochish"),
        BotCommand(command="reset",  description="🔄 Sozlamalarni tozalab qayta boshlash"),
    ])
    # Admin-only commands — set separately for the admin user
    for admin_id in _ADMIN_IDS:
        try:
            await bot.set_my_commands(
                [
                    BotCommand(command="start",     description="🕌 IslamTimeWorldBot ni ochish"),
                    BotCommand(command="reset",     description="🔄 Sozlamalarni tozalab qayta boshlash"),
                    BotCommand(command="stats",     description="📊 Statistika"),
                    BotCommand(command="users",     description="👥 Foydalanuvchilar ro'yxati"),
                    BotCommand(command="broadcast", description="📢 Barcha userlarga xabar"),
                    BotCommand(command="logs",      description="📋 Bot log fayli"),
                    BotCommand(command="restart",   description="🔄 Restart yo'riqnomasi"),
                ],
                scope=types.BotCommandScopeChat(chat_id=admin_id),
            )
        except Exception as e:
            print(f"[WARN] set_my_commands for admin {admin_id}: {e}", flush=True)


# ══════════════════════════════════════════════════════════════════════════
#  Entry point
# ══════════════════════════════════════════════════════════════════════════

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

    print(f"✅ Admin IDs: {_ADMIN_IDS}", flush=True)
    await _set_commands(bot)
    print("✅ IslamTimeWorldBot ishga tushdi (polling)...", flush=True)
    print(f"✅ WEBAPP_URL: {config.WEBAPP_URL}", flush=True)

    await dp.start_polling(bot, allowed_updates=["message", "web_app_data"])


if __name__ == "__main__":
    asyncio.run(main())
