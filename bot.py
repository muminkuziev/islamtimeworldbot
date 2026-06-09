import asyncio
import json
import sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from aiogram import Bot, Dispatcher, F, types
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

bot = Bot(token=config.BOT_TOKEN)
dp  = Dispatcher()

# Routers
dp.include_router(prayer_router)


def _webapp_url_valid() -> bool:
    """Telegram requires HTTPS WebApp URLs."""
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
    if _webapp_url_valid():
        await message.answer(
            "🌙 <b>IslamTimeWorldBot</b>\n\n"
            "Assalomu alaykum! Ilovani ochish uchun quyidagi tugmani bosing.\n\n"
            "<i>Assalamu Alaikum! Press the button below to open the app.</i>",
            parse_mode="HTML",
            reply_markup=_webapp_keyboard(),
        )
    else:
        from presentation.keyboards.main_menu import main_keyboard as _mk
        await message.answer(
            "🌙 <b>IslamTimeWorldBot</b>\n\n"
            "Assalomu alaykum! Bot ishga tushdi ✅\n\n"
            "WebApp uchun <code>WEBAPP_URL</code> ni <b>.env</b> faylida HTTPS manzil bilan to'ldiring.\n\n"
            "<i>Bot is running. Set WEBAPP_URL to an HTTPS address to enable the WebApp button.</i>",
            parse_mode="HTML",
            reply_markup=_mk("uz"),
        )


@dp.message(F.web_app_data)
async def on_webapp_data(message: types.Message):
    """Receive data sent from WebApp via Telegram.WebApp.sendData()."""
    try:
        data = json.loads(message.web_app_data.data)
        if data.get("action") == "set_language":
            lang = data.get("lang", "uz")
            await message.answer(
                f"✅ Til saqlandi: <b>{lang}</b>",
                parse_mode="HTML",
                reply_markup=main_keyboard(lang),
            )
    except Exception:
        pass


async def _set_commands():
    await bot.set_my_commands([
        BotCommand(command="start", description="🕌 IslamTimeWorldBot ni ochish"),
    ])


async def main():
    await _set_commands()
    print("✅ IslamTimeWorldBot ishga tushdi...")
    print(f"✅ WEBAPP_URL: {config.WEBAPP_URL}")
    await dp.start_polling(bot, allowed_updates=["message", "web_app_data"])


if __name__ == "__main__":
    asyncio.run(main())