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

# ── Weather (wttr.in) ─────────────────────────────────────────────────────────

_WEATHER_ICONS: dict[range, str] = {}  # built lazily

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


async def fetch_weather(lat: float, lon: float) -> Optional[dict]:
    """Return current weather from wttr.in as a structured dict."""
    url = f"https://wttr.in/{lat},{lon}?format=j1"
    try:
        async with aiohttp.ClientSession() as sess:
            async with sess.get(url, headers=_UA, timeout=_TIMEOUT) as resp:
                if resp.status == 200:
                    raw  = await resp.json(content_type=None)
                    cond = raw["current_condition"][0]
                    code = int(cond.get("weatherCode", 113))
                    return {
                        "temp_c":       int(cond.get("temp_C", 0)),
                        "temp_f":       int(cond.get("temp_F", 32)),
                        "feels_like_c": int(cond.get("FeelsLikeC", 0)),
                        "description":  cond.get("weatherDesc", [{}])[0].get("value", ""),
                        "humidity":     int(cond.get("humidity", 0)),
                        "wind_kmph":    int(cond.get("windspeedKmph", 0)),
                        "icon":         _weather_icon(code),
                        "uv_index":     int(cond.get("uvIndex", 0)),
                    }
    except Exception:
        pass
    return None


# ── AQI (Open-Meteo Air Quality API) ─────────────────────────────────────────

def _aqi_label(aqi: float) -> str:
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


async def fetch_aqi(lat: float, lon: float) -> Optional[dict]:
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
                    return {
                        "aqi":      int(aqi),
                        "label":    _aqi_label(aqi),
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

async def fetch_all_extras(lat: float, lon: float) -> dict:
    weather, aqi, ayah = await asyncio.gather(
        fetch_weather(lat, lon),
        fetch_aqi(lat, lon),
        fetch_daily_ayah(),
    )
    return {
        "weather":       weather,
        "aqi":           aqi,
        "daily_ayah":    ayah,
        "daily_hadith":  get_daily_hadith(),
    }
