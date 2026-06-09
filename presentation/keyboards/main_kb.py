from aiogram.types import ReplyKeyboardMarkup, KeyboardButton

main_keyboard = ReplyKeyboardMarkup(
    keyboard=[
        [KeyboardButton(text="🕌 Namoz vaqtlari"), KeyboardButton(text="🧭 Qibla")],
        [KeyboardButton(text="📍 Yaqin masjidlar"), KeyboardButton(text="📖 Qur'on")],
        [KeyboardButton(text="📚 Hadislar"), KeyboardButton(text="🤲 Duolar")],
        [KeyboardButton(text="📿 Zikr & Salovatlar"), KeyboardButton(text="📅 Hijriy taqvim")],
        [KeyboardButton(text="🕋 Allohning 99 ismi"), KeyboardButton(text="⚙️ Sozlamalar")]
    ],
    resize_keyboard=True
)