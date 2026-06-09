from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command
from config.config import config
from presentation.keyboards.main_kb import main_keyboard

# Bot va Dispatcher'ni ulaymiz
bot = Bot(token=config.BOT_TOKEN)
dp = Dispatcher()

@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    await message.answer(
        "Assalomu alaykum! Islomiy dunyo botiga xush kelibsiz. Quyidagi tugmalardan birini tanlang:",
        reply_markup=main_keyboard
    )

# Botni ishga tushirish uchun async funksiya
async def run_bot():
    await dp.start_polling(bot)