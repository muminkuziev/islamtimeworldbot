import telebot

from config import BOT_TOKEN
from handlers.start import register_start_handler

bot = telebot.TeleBot(BOT_TOKEN)

register_start_handler(bot)

print("Islam Time World Bot ishga tushdi...")

bot.infinity_polling()
