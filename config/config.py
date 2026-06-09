import os
from dotenv import load_dotenv

# .env faylini yuklaymiz
load_dotenv()

class Config:
    # Bot tokeni
    BOT_TOKEN = os.getenv("BOT_TOKEN")
    
    # Ma'lumotlar bazasi sozlamalari
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "5432")
    DB_NAME = os.getenv("DB_NAME", "islamtimeworld_db")
    DB_USER = os.getenv("DB_USER", "postgres")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "secret_password")
    
    # WebApp
    WEBAPP_URL = os.getenv("WEBAPP_URL", "https://your-domain.com")

    # API sozlamalari
    ALADHAN_API_URL = os.getenv("ALADHAN_API_URL", "https://api.aladhan.com/v1")
    PRAYTIME_API_KEY = os.getenv("PRAYTIME_API_KEY")

# Sozlamalar obyektini tayyorlaymiz
config = Config()