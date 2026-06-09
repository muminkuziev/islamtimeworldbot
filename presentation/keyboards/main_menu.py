from aiogram.types import ReplyKeyboardMarkup, KeyboardButton


MAIN_MENU_TEXTS = {
    "uz": [
        "🕌 Namoz vaqtlari", "🧭 Qibla",
        "📍 Yaqin masjidlar", "📖 Qur'on",
        "📚 Hadislar", "🤲 Duolar",
        "❤️ Zikr & Salovatlar", "📅 Hijriy taqvim",
        "🕋 Allohning 99 ismi", "⚙️ Sozlamalar",
    ],
    "en": [
        "🕌 Prayer Times", "🧭 Qibla",
        "📍 Nearby Mosques", "📖 Quran",
        "📚 Hadith", "🤲 Duas",
        "❤️ Dhikr & Salawat", "📅 Hijri Calendar",
        "🕋 99 Names of Allah", "⚙️ Settings",
    ],
    "ru": [
        "🕌 Время намаза", "🧭 Кибла",
        "📍 Ближайшие мечети", "📖 Коран",
        "📚 Хадисы", "🤲 Дуа",
        "❤️ Зикр и салават", "📅 Хиджрий календарь",
        "🕋 99 имен Аллаха", "⚙️ Настройки",
    ],
}


def main_keyboard(lang_code: str = "uz"):
    buttons = MAIN_MENU_TEXTS.get(lang_code, MAIN_MENU_TEXTS["uz"])

    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text=buttons[0]), KeyboardButton(text=buttons[1])],
            [KeyboardButton(text=buttons[2]), KeyboardButton(text=buttons[3])],
            [KeyboardButton(text=buttons[4]), KeyboardButton(text=buttons[5])],
            [KeyboardButton(text=buttons[6]), KeyboardButton(text=buttons[7])],
            [KeyboardButton(text=buttons[8]), KeyboardButton(text=buttons[9])],
        ],
        resize_keyboard=True
    )