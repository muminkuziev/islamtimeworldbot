from telebot.types import ReplyKeyboardMarkup, KeyboardButton


def get_main_menu():
    markup = ReplyKeyboardMarkup(resize_keyboard=True)

    btn1 = KeyboardButton("🕌 Namoz vaqtlari")
    btn2 = KeyboardButton("🧭 Qibla")
    btn3 = KeyboardButton("📖 Qur'on")
    btn4 = KeyboardButton("📚 Hadislar")
    btn5 = KeyboardButton("⚙️ Sozlamalar")

    markup.row(btn1, btn2)
    markup.row(btn3, btn4)
    markup.row(btn5)

    return markup
