from aiogram import Router
from aiogram.filters import CommandStart
from aiogram.types import Message

from presentation.keyboards.language_keyboard import language_keyboard

router = Router()


@router.message(CommandStart())
async def start_handler(message: Message):
    await message.answer(
        "🌍 Tilni tanlang\n\n"
        "🌍 Select Language\n"
        "🌍 Выберите язык",
        reply_markup=language_keyboard()
    )