from telebot import types
from keyboards.main_menu import get_main_menu

def register_start_handler(bot):

    @bot.message_handler(commands=['start'])
    def start_command(message):
        bot.send_message(
            message.chat.id,
            "Assalomu alaykum!\n\nIslam Time World Botga xush kelibsiz.",
            reply_markup=get_main_menu()
        )
