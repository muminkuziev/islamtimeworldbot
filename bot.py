import asyncio
import json
import os
import socket
import sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

import aiohttp
from aiogram import Bot, Dispatcher, F, types
from aiogram.client.session.aiohttp import AiohttpSession
from aiogram.filters import CommandStart
from aiogram.types import (
    BotCommand,
    InlineKeyboardMarkup,
    InlineKeyboardButton,
    WebAppInfo,
)

from config.config import config
from presentation.keyboards.main_menu import main_keyboard
from presentation.handlers.prayer import router as prayer_router

# ── Custom resolver: bypass ISP DNS block for api.telegram.org ────────────
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


dp = Dispatcher()
dp.include_router(__import__("presentation.handlers.prayer", fromlist=["router"]).router)


def _webapp_url_valid() -> bool:
    url = config.WEBAPP_URL or ""
    return url.startswith("https://") and url != "https://your-domain.com"


def _webapp_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(
            text="🕌 IslamTimeWorldBot — Open",
            web_app=WebAppInfo(url=config.WEBAPP_URL),
        )
    ]])


@dp.message(CommandStart())
async def cmd_start(message: types.Message):
    print(f"[DEBUG] /start from @{message.from_user.username}", flush=True)
    try:
        if _webapp_url_valid():
            await message.answer(
                "🌙 <b>IslamTimeWorldBot</b>\n\n"
                "Assalomu alaykum! Ilovani ochish uchun quyidagi tugmani bosing.",
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
        BotCommand(command="start", description="🕌 IslamTimeWorldBot ni ochish"),
    ])


async def main():
    _proxy = os.getenv("PROXY_URL", "").strip() or None

    if _proxy:
        session = AiohttpSession(proxy=_proxy)
        print(f"✅ Proxy: {_proxy}", flush=True)
    else:
        import ssl, certifi
        session = AiohttpSession()
        session._connector_init["resolver"] = _BypassResolver()
        print(f"✅ DNS bypass resolver: {_TELEGRAM_HOST} → {_TELEGRAM_IPS[0]}", flush=True)

    bot = Bot(token=config.BOT_TOKEN, session=session)

    await _set_commands(bot)
    print("✅ IslamTimeWorldBot ishga tushdi...", flush=True)
    print(f"✅ WEBAPP_URL: {config.WEBAPP_URL}", flush=True)
    await dp.start_polling(bot, allowed_updates=["message", "web_app_data"])


if __name__ == "__main__":
    asyncio.run(main())
