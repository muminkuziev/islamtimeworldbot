"""
Extra data fetchers for the Prayer Times screen:
  Weather    — wttr.in (no API key required)
  AQI        — Open-Meteo Air Quality (no API key required)
  Daily Ayah — AlQuran.cloud API (rotates by day of year)
  Daily Hadith — local collection in data/hadiths.py
"""

import asyncio
import aiohttp
from datetime import date
from typing import Optional

_TIMEOUT = aiohttp.ClientTimeout(total=8)
_UA      = {"User-Agent": "IslamTimeWorldBot/1.0"}

# ── Weather descriptions (14 languages) ──────────────────────────────────────

_WEATHER_DESCS = {
    "clear":   {"uz":"Ochiq","uz_cyr":"Очиқ","en":"Clear","ru":"Ясно","tr":"Açık","ar":"صافٍ","kk":"Ашық","tg":"Равшан","ky":"Ачык","de":"Klar","fr":"Clair","id":"Cerah","hi":"साफ","ur":"صاف"},
    "partly":  {"uz":"Qisman bulutli","uz_cyr":"Қисман булутли","en":"Partly Cloudy","ru":"Переменная облачность","tr":"Parçalı bulutlu","ar":"غيوم جزئية","kk":"Ішінара бұлтты","tg":"Қисман абрнок","ky":"Жарым-жартылай булуттуу","de":"Teils bewölkt","fr":"Partiellement nuageux","id":"Berawan sebagian","hi":"आंशिक बादल","ur":"جزوی ابر"},
    "cloudy":  {"uz":"Bulutli","uz_cyr":"Булутли","en":"Cloudy","ru":"Облачно","tr":"Bulutlu","ar":"غائم","kk":"Бұлтты","tg":"Абрнок","ky":"Булуттуу","de":"Bewölkt","fr":"Nuageux","id":"Berawan","hi":"बादल","ur":"ابر"},
    "fog":     {"uz":"Tuman","uz_cyr":"Туман","en":"Foggy","ru":"Туман","tr":"Sisli","ar":"ضباب","kk":"Тұманды","tg":"Туманолуд","ky":"Туман","de":"Neblig","fr":"Brouillard","id":"Berkabut","hi":"कोहरा","ur":"دھند"},
    "drizzle": {"uz":"Shivir yomg'ir","uz_cyr":"Шивир ёмғир","en":"Drizzle","ru":"Морось","tr":"Çiseleyen","ar":"رذاذ","kk":"Жаңбыршашырауы","tg":"Борони сабук","ky":"Чаш жамгыр","de":"Nieselregen","fr":"Bruine","id":"Gerimis","hi":"बूंदाबांदी","ur":"ہلکی بارش"},
    "rain":    {"uz":"Yomg'ir","uz_cyr":"Ёмғир","en":"Rain","ru":"Дождь","tr":"Yağmurlu","ar":"ممطر","kk":"Жаңбырлы","tg":"Борондор","ky":"Жамгырлуу","de":"Regen","fr":"Pluvieux","id":"Hujan","hi":"बारिश","ur":"بارش"},
    "snow":    {"uz":"Qor","uz_cyr":"Қор","en":"Snow","ru":"Снег","tr":"Karlı","ar":"ثلج","kk":"Қарлы","tg":"Барфолуд","ky":"Карлуу","de":"Schnee","fr":"Neige","id":"Bersalju","hi":"बर्फ","ur":"برف"},
    "storm":   {"uz":"Bo'ron","uz_cyr":"Бўрон","en":"Thunderstorm","ru":"Гроза","tr":"Fırtınalı","ar":"عاصفة","kk":"Дауылды","tg":"Тӯфонӣ","ky":"Бороондуу","de":"Gewitter","fr":"Orageux","id":"Badai","hi":"तूफान","ur":"طوفان"},
}

def _weather_desc_key(code: int) -> str:
    c = int(code)
    if c == 113:                                         return "clear"
    if c in (116, 119):                                  return "partly"
    if c == 122:                                         return "cloudy"
    if c in (143, 248, 260):                             return "fog"
    if c in (176, 293, 296, 299, 302):                   return "drizzle"
    if c in (305, 308, 311, 314, 353, 356, 359):         return "rain"
    if c in (200, 386, 389, 392, 395):                   return "storm"
    if c in (179, 182, 185, 227, 230, 323, 326, 329, 332, 335, 338): return "snow"
    return "cloudy"

def _weather_icon(code: int) -> str:
    c = int(code)
    if c == 113:                             return "☀️"
    if c in (116, 119):                      return "⛅"
    if c == 122:                             return "☁️"
    if c in (143, 248, 260):                 return "🌫️"
    if c in (176, 293, 296, 299, 302):       return "🌦️"
    if c in (305, 308, 311, 314, 353, 356, 359): return "🌧️"
    if c in (200, 386, 389, 392, 395):       return "⛈️"
    if c in (179, 182, 185, 227, 230, 323, 326, 329, 332, 335, 338): return "❄️"
    return "🌡️"


async def fetch_weather(lat: float, lon: float, lang: str = "en") -> Optional[dict]:
    """Return current weather from wttr.in as a structured dict."""
    url = f"https://wttr.in/{lat},{lon}?format=j1"
    try:
        async with aiohttp.ClientSession() as sess:
            async with sess.get(url, headers=_UA, timeout=_TIMEOUT) as resp:
                if resp.status == 200:
                    raw  = await resp.json(content_type=None)
                    cond = raw["current_condition"][0]
                    code = int(cond.get("weatherCode", 113))
                    desc_key  = _weather_desc_key(code)
                    desc_map  = _WEATHER_DESCS.get(desc_key, _WEATHER_DESCS["cloudy"])
                    desc      = desc_map.get(lang) or desc_map.get("en", "")
                    return {
                        "temp_c":       int(cond.get("temp_C", 0)),
                        "temp_f":       int(cond.get("temp_F", 32)),
                        "feels_like_c": int(cond.get("FeelsLikeC", 0)),
                        "description":  desc,
                        "humidity":     int(cond.get("humidity", 0)),
                        "wind_kmph":    int(cond.get("windspeedKmph", 0)),
                        "icon":         _weather_icon(code),
                        "uv_index":     int(cond.get("uvIndex", 0)),
                    }
    except Exception:
        pass
    return None


# ── AQI labels (14 languages) ────────────────────────────────────────────────

_AQI_LABELS = {
    "Good":      {"uz":"Yaxshi",      "uz_cyr":"Яхши",         "en":"Good",       "ru":"Хорошее",        "tr":"İyi",          "ar":"جيد",         "kk":"Жақсы",       "tg":"Хуб",          "ky":"Жакшы",          "de":"Gut",          "fr":"Bon",          "id":"Baik",           "hi":"अच्छा",   "ur":"اچھا"},
    "Fair":      {"uz":"Qoniqarli",   "uz_cyr":"Қониқарли",    "en":"Fair",       "ru":"Приемлемое",     "tr":"Orta",         "ar":"مقبول",        "kk":"Орташа",      "tg":"Қаноатбахш",   "ky":"Орто",           "de":"Mäßig",        "fr":"Correct",      "id":"Cukup",          "hi":"ठीक",     "ur":"ٹھیک"},
    "Moderate":  {"uz":"O'rtacha",    "uz_cyr":"Ўртача",        "en":"Moderate",   "ru":"Умеренное",      "tr":"Kabul edilebilir","ar":"متوسط",      "kk":"Қалыпты",     "tg":"Мӯтадил",      "ky":"Орточо",         "de":"Mäßig",        "fr":"Modéré",       "id":"Sedang",         "hi":"मध्यम",   "ur":"معتدل"},
    "Poor":      {"uz":"Yomon",       "uz_cyr":"Ёмон",          "en":"Poor",       "ru":"Плохое",         "tr":"Kötü",         "ar":"سيء",          "kk":"Нашар",       "tg":"Бад",          "ky":"Начар",          "de":"Schlecht",     "fr":"Mauvais",      "id":"Buruk",          "hi":"खराब",    "ur":"خراب"},
    "Very Poor": {"uz":"Juda yomon",  "uz_cyr":"Жуда ёмон",    "en":"Very Poor",  "ru":"Очень плохое",   "tr":"Çok kötü",     "ar":"سيء جداً",     "kk":"Өте нашар",   "tg":"Хеле бад",     "ky":"Абдан начар",    "de":"Sehr schlecht","fr":"Très mauvais", "id":"Sangat Buruk",   "hi":"बहुत खराब","ur":"بہت خراب"},
    "Hazardous": {"uz":"Xavfli",      "uz_cyr":"Хавфли",       "en":"Hazardous",  "ru":"Опасное",        "tr":"Tehlikeli",    "ar":"خطير",         "kk":"Қауіпті",     "tg":"Хавфнок",      "ky":"Коркунучтуу",    "de":"Gefährlich",   "fr":"Dangereux",    "id":"Berbahaya",      "hi":"खतरनाक",  "ur":"خطرناک"},
}

def _aqi_label_key(aqi: float) -> str:
    if aqi <= 20:  return "Good"
    if aqi <= 40:  return "Fair"
    if aqi <= 60:  return "Moderate"
    if aqi <= 80:  return "Poor"
    if aqi <= 100: return "Very Poor"
    return "Hazardous"

def _aqi_icon(aqi: float) -> str:
    if aqi <= 20:  return "😊"
    if aqi <= 40:  return "😐"
    if aqi <= 60:  return "😷"
    if aqi <= 80:  return "😨"
    return "☠️"

def _aqi_color(aqi: float) -> str:
    if aqi <= 20:  return "#1B7A45"
    if aqi <= 40:  return "#B8A800"
    if aqi <= 60:  return "#D27C00"
    if aqi <= 80:  return "#C0392B"
    return "#7B241C"


async def fetch_aqi(lat: float, lon: float, lang: str = "en") -> Optional[dict]:
    """Return European AQI + PM data from Open-Meteo."""
    url = "https://air-quality-api.open-meteo.com/v1/air-quality"
    params = {
        "latitude":  lat,
        "longitude": lon,
        "current":   "european_aqi,pm2_5,pm10,nitrogen_dioxide,ozone",
    }
    try:
        async with aiohttp.ClientSession() as sess:
            async with sess.get(url, params=params, timeout=_TIMEOUT) as resp:
                if resp.status == 200:
                    raw  = await resp.json(content_type=None)
                    curr = raw.get("current", {})
                    aqi  = float(curr.get("european_aqi") or 0)
                    key  = _aqi_label_key(aqi)
                    lmap = _AQI_LABELS.get(key, _AQI_LABELS["Good"])
                    return {
                        "aqi":      int(aqi),
                        "label":    lmap.get(lang) or lmap.get("en", key),
                        "icon":     _aqi_icon(aqi),
                        "color":    _aqi_color(aqi),
                        "pm2_5":    round(float(curr.get("pm2_5")  or 0), 1),
                        "pm10":     round(float(curr.get("pm10")   or 0), 1),
                        "no2":      round(float(curr.get("nitrogen_dioxide") or 0), 1),
                        "ozone":    round(float(curr.get("ozone")  or 0), 1),
                    }
    except Exception:
        pass
    return None


# ── Daily Ayah (AlQuran.cloud) ────────────────────────────────────────────────

async def fetch_daily_ayah() -> Optional[dict]:
    """Return today's ayah (deterministic: same day → same ayah)."""
    day      = date.today().timetuple().tm_yday
    ayah_num = (day % 6236) + 1          # cycle through all 6236 ayahs
    url      = f"https://api.alquran.cloud/v1/ayah/{ayah_num}/editions/quran-uthmani,en.sahih"

    try:
        async with aiohttp.ClientSession() as sess:
            async with sess.get(url, headers=_UA, timeout=_TIMEOUT) as resp:
                if resp.status == 200:
                    raw = await resp.json(content_type=None)
                    if raw.get("code") == 200:
                        ar, en = raw["data"][0], raw["data"][1]
                        surah  = ar.get("surah", {})
                        return {
                            "arabic":       ar.get("text", ""),
                            "translation":  en.get("text", ""),
                            "surah_en":     surah.get("englishName", ""),
                            "surah_ar":     surah.get("name", ""),
                            "surah_number": surah.get("number", 0),
                            "ayah_number":  ar.get("numberInSurah", 0),
                            "reference":    f"Surah {surah.get('englishName','')} ({surah.get('number','')}:{ar.get('numberInSurah','')})",
                        }
    except Exception:
        pass
    return None


# ── Daily Hadith (local collection) ──────────────────────────────────────────

def get_daily_hadith() -> dict:
    """Return today's hadith from the local 30-hadith collection."""
    from data.hadiths import DAILY_HADITHS
    day = date.today().timetuple().tm_yday
    return DAILY_HADITHS[day % len(DAILY_HADITHS)]


# ── Convenience: fetch all extras at once ────────────────────────────────────

async def fetch_all_extras(lat: float, lon: float, lang: str = "en") -> dict:
    weather, aqi, ayah = await asyncio.gather(
        fetch_weather(lat, lon, lang),
        fetch_aqi(lat, lon, lang),
        fetch_daily_ayah(),
    )
    return {
        "weather":       weather,
        "aqi":           aqi,
        "daily_ayah":    ayah,
        "daily_hadith":  get_daily_hadith(),
    }
