from config.config import config

class BotLogic:
    def __init__(self):
        self.token = config.BOT_TOKEN
        
    def get_welcome_message(self):
        return "Assalomu alaykum! Islomiy dunyo botiga xush kelibsiz. Men sizga namoz vaqtlari, Qur'on va hadislar bo'yicha ko'maklashaman."

# Bot mantiqiy obyektini yaratamiz
bot_logic = BotLogic()