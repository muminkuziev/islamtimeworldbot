from aiogram.types import ReplyKeyboardMarkup, KeyboardButton


def location_keyboard(lang_code: str = "uz"):
    return ReplyKeyboardMarkup(
        keyboard=[
            [
                KeyboardButton(
                    text="📍 Lokatsiya yuborish",
                    request_location=True
                )
            ],
            [
                KeyboardButton(text="🏠 Asosiy menyu")
            ],
        ],
        resize_keyboard=True,
        one_time_keyboard=False
    )