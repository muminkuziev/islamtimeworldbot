from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
from config.constants import LANGUAGES

def language_keyboard():
    keyboard = []

    row = []

    for code, name in LANGUAGES.items():
        row.append(
            InlineKeyboardButton(
                text=name,
                callback_data=f"lang_{code}"
            )
        )

        if len(row) == 2:
            keyboard.append(row)
            row = []

    if row:
        keyboard.append(row)

    return InlineKeyboardMarkup(
        inline_keyboard=keyboard
    )