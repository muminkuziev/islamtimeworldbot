import requests
from config.config import config

class PrayerTimeClient:
    def __init__(self):
        self.base_url = config.ALADHAN_API_URL

    def get_prayer_times(self, latitude, longitude):
        # Namoz vaqtlarini Aladhan API orqali olish
        endpoint = f"{self.base_url}/timings?latitude={latitude}&longitude={longitude}"
        response = requests.get(endpoint)
        if response.status_code == 200:
            return response.json()
        return None

# API mijozi obyektini yaratamiz
prayer_client = PrayerTimeClient()