"""
Extra data fetchers for the Prayer Times screen:
  Weather    — wttr.in (no API key required)
  AQI        — Open-Meteo Air Quality (no API key required)
  Daily Ayah — AlQuran.cloud API (rotates by day of year)
  Daily Hadith — local collection in data/hadiths.py
"""

import asyncio
import aiohttp
import time
from datetime import date, datetime as _dt
from typing import Optional

_TIMEOUT = aiohttp.ClientTimeout(total=10)
_UA      = {"User-Agent": "IslamTimeWorldBot/1.0"}

# ── In-memory TTL cache ───────────────────────────────────────────────────────
_CACHE: dict = {}

def _cget(key):
    item = _CACHE.get(key)
    if item and time.monotonic() < item[1]:
        return item[0]
    return None

def _cput(key, val, ttl: float):
    _CACHE[key] = (val, time.monotonic() + ttl)

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

_DAY_NAMES = {
    "uz":     ["Dushanba","Seshanba","Chorshanba","Payshanba","Juma","Shanba","Yakshanba"],
    "uz_cyr": ["Душанба","Сешанба","Чоршанба","Пайшанба","Жума","Шанба","Якшанба"],
    "en":     ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],
    "ru":     ["Понедельник","Вторник","Среда","Четверг","Пятница","Суббота","Воскресенье"],
    "tr":     ["Pazartesi","Salı","Çarşamba","Perşembe","Cuma","Cumartesi","Pazar"],
    "ar":     ["الإثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت","الأحد"],
    "kk":     ["Дүйсенбі","Сейсенбі","Сәрсенбі","Бейсенбі","Жұма","Сенбі","Жексенбі"],
    "tg":     ["Душанбе","Сешанбе","Чоршанбе","Панҷшанбе","Ҷумъа","Шанбе","Якшанбе"],
    "ky":     ["Дүйшөмбү","Шейшемби","Шаршемби","Бейшемби","Жума","Ишемби","Жекшемби"],
    "de":     ["Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag","Sonntag"],
    "fr":     ["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"],
    "id":     ["Senin","Selasa","Rabu","Kamis","Jumat","Sabtu","Minggu"],
    "hi":     ["सोमवार","मंगलवार","बुधवार","गुरुवार","शुक्रवार","शनिवार","रविवार"],
    "ur":     ["پیر","منگل","بدھ","جمعرات","جمعہ","ہفتہ","اتوار"],
}

def _get_day_name(date_str: str, lang: str) -> str:
    try:
        d = _dt.strptime(date_str, "%Y-%m-%d")
        names = _DAY_NAMES.get(lang) or _DAY_NAMES["en"]
        return names[d.weekday()]
    except Exception:
        return date_str

# Wind direction codes → localized full names (ablative/from form where applicable)
_WIND_DIR = {
    "N":   {"uz":"Shimoldan","en":"From N","ru":"С севера","tr":"Kuzeyden","ar":"من الشمال","kk":"Солтүстіктен","de":"Von N","fr":"Du nord","id":"Dari U","hi":"उत्तर से","ur":"شمال سے"},
    "NNE": {"uz":"Shimoli-sharqdan","en":"From NNE","ru":"С ССВ","tr":"Kuzey-Kuzeydoğudan","ar":"من الشمال الشمالي الشرقي","kk":"ССШ-дан","de":"Von NNO","fr":"Du NNE","id":"Dari UUL","hi":"उत्तर-उत्तरपूर्व से","ur":"شمال شمال مشرق سے"},
    "NE":  {"uz":"Shimoli-sharqdan","en":"From NE","ru":"С СВ","tr":"Kuzeydoğudan","ar":"من الشمال الشرقي","kk":"СШ-дан","de":"Von NO","fr":"Du NE","id":"Dari TL","hi":"उत्तरपूर्व से","ur":"شمال مشرق سے"},
    "ENE": {"uz":"Sharqdan","en":"From ENE","ru":"С ВСВ","tr":"Doğu-Kuzeydoğudan","ar":"من الشرق الشمالي الشرقي","kk":"ВСС-дан","de":"Von ONO","fr":"De l'ENE","id":"Dari TTL","hi":"पूर्व-उत्तरपूर्व से","ur":"مشرق شمال مشرق سے"},
    "E":   {"uz":"Sharqdan","en":"From E","ru":"С востока","tr":"Doğudan","ar":"من الشرق","kk":"Шығыстан","de":"Von O","fr":"De l'est","id":"Dari T","hi":"पूर्व से","ur":"مشرق سے"},
    "ESE": {"uz":"Sharqdan","en":"From ESE","ru":"С ВЮВ","tr":"Doğu-Güneydoğudan","ar":"من الشرق الجنوبي الشرقي","kk":"ВОЖ-дан","de":"Von OSO","fr":"De l'ESE","id":"Dari TTG","hi":"पूर्व-दक्षिणपूर्व से","ur":"مشرق جنوب مشرق سے"},
    "SE":  {"uz":"Janubi-sharqdan","en":"From SE","ru":"С ЮВ","tr":"Güneydoğudan","ar":"من الجنوب الشرقي","kk":"ОЖ-дан","de":"Von SO","fr":"Du SE","id":"Dari TG","hi":"दक्षिणपूर्व से","ur":"جنوب مشرق سے"},
    "SSE": {"uz":"Janubdan","en":"From SSE","ru":"С ЮЮВ","tr":"Güney-Güneydoğudan","ar":"من الجنوب الجنوبي الشرقي","kk":"ООЖ-дан","de":"Von SSO","fr":"Du SSE","id":"Dari SST","hi":"दक्षिण-दक्षिणपूर्व से","ur":"جنوب جنوب مشرق سے"},
    "S":   {"uz":"Janubdan","en":"From S","ru":"С юга","tr":"Güneyden","ar":"من الجنوب","kk":"Оңтүстіктен","de":"Von S","fr":"Du sud","id":"Dari S","hi":"दक्षिण से","ur":"جنوب سے"},
    "SSW": {"uz":"Janubdan","en":"From SSW","ru":"С ЮЮЗ","tr":"Güney-Güneybatıdan","ar":"من الجنوب الجنوبي الغربي","kk":"ООБ-дан","de":"Von SSW","fr":"Du SSO","id":"Dari SSB","hi":"दक्षिण-दक्षिणपश्चिम से","ur":"جنوب جنوب مغرب سے"},
    "SW":  {"uz":"Janubi-g'arbdan","en":"From SW","ru":"С ЮЗ","tr":"Güneybatıdan","ar":"من الجنوب الغربي","kk":"ОБ-дан","de":"Von SW","fr":"Du SO","id":"Dari BD","hi":"दक्षिणपश्चिम से","ur":"جنوب مغرب سے"},
    "WSW": {"uz":"G'arbdan","en":"From WSW","ru":"С ЗЮЗ","tr":"Batı-Güneybatıdan","ar":"من الغرب الجنوبي الغربي","kk":"БОЖ-дан","de":"Von WSW","fr":"De l'OSO","id":"Dari BBD","hi":"पश्चिम-दक्षिणपश्चिम से","ur":"مغرب جنوب مغرب سے"},
    "W":   {"uz":"G'arbdan","en":"From W","ru":"С запада","tr":"Batıdan","ar":"من الغرب","kk":"Батыстан","de":"Von W","fr":"De l'ouest","id":"Dari B","hi":"पश्चिम से","ur":"مغرب سے"},
    "WNW": {"uz":"G'arbdan","en":"From WNW","ru":"С ЗСЗ","tr":"Batı-Kuzeybatıdan","ar":"من الغرب الشمالي الغربي","kk":"БСС-дан","de":"Von WNW","fr":"De l'ONO","id":"Dari BBU","hi":"पश्चिम-उत्तरपश्चिम से","ur":"مغرب شمال مغرب سے"},
    "NW":  {"uz":"Shimoli-g'arbdan","en":"From NW","ru":"С СЗ","tr":"Kuzeybatıdan","ar":"من الشمال الغربي","kk":"СБ-дан","de":"Von NW","fr":"Du NO","id":"Dari BL","hi":"उत्तरपश्चिम से","ur":"شمال مغرب سے"},
    "NNW": {"uz":"Shimoldan","en":"From NNW","ru":"С ССЗ","tr":"Kuzey-Kuzeybatıdan","ar":"من الشمال الشمالي الغربي","kk":"ССБ-дан","de":"Von NNW","fr":"Du NNO","id":"Dari UUB","hi":"उत्तर-उत्तरपश्चिम से","ur":"شمال شمال مغرب سے"},
}

def _calc_dew_point(temp_c: float, humidity: int) -> int:
    """Magnus formula approximation for dew point."""
    import math
    try:
        a, b = 17.27, 237.7
        alpha = (a * temp_c / (b + temp_c)) + math.log(max(humidity, 1) / 100.0)
        return round((b * alpha) / (a - alpha))
    except Exception:
        return round(temp_c)

def _get_wind_dir(code: str, lang: str) -> str:
    mapping = _WIND_DIR.get(code.strip().upper(), {})
    return mapping.get(lang) or mapping.get("en") or code

def _wmo_desc_key(code: int) -> str:
    """Map WMO weather code (Open-Meteo) to description key."""
    if code == 0:                       return "clear"
    if code in (1, 2):                  return "partly"
    if code == 3:                       return "cloudy"
    if code in (45, 48):                return "fog"
    if code in (51, 53, 55, 56, 57):   return "drizzle"
    if code in (61, 63, 65, 66, 67, 80, 81, 82): return "rain"
    if code in (71, 73, 75, 77, 85, 86):          return "snow"
    if code in (95, 96, 99):            return "storm"
    return "cloudy"

def _wmo_icon(code: int) -> str:
    if code == 0:                       return "☀️"
    if code in (1, 2):                  return "⛅"
    if code == 3:                       return "☁️"
    if code in (45, 48):                return "🌫️"
    if code in (51, 53, 55, 56, 57):   return "🌦️"
    if code in (61, 63, 65, 66, 67, 80, 81, 82): return "🌧️"
    if code in (71, 73, 75, 77, 85, 86):          return "❄️"
    if code in (95, 96, 99):            return "⛈️"
    return "🌡️"

def _deg_to_compass(deg: float) -> str:
    dirs = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"]
    return dirs[round((float(deg) % 360) / 22.5) % 16]


async def fetch_weather(lat: float, lon: float, lang: str = "en") -> Optional[dict]:
    """Return current weather + hourly + 5-day forecast from Open-Meteo. Cached 10 min."""
    loc_key  = (round(lat, 1), round(lon, 1))
    raw_key  = f"weather_raw:{loc_key}"
    lang_key = f"weather:{loc_key}:{lang}"

    cached = _cget(lang_key)
    if cached is not None:
        return cached

    raw = _cget(raw_key)
    if raw is None:
        url    = "https://api.open-meteo.com/v1/forecast"
        params = {
            "latitude":  round(lat, 4),
            "longitude": round(lon, 4),
            "current":   "temperature_2m,apparent_temperature,weather_code,"
                         "relative_humidity_2m,wind_speed_10m,wind_direction_10m,"
                         "surface_pressure,visibility",
            "hourly":    "temperature_2m,weather_code,precipitation_probability,uv_index",
            "daily":     "weather_code,temperature_2m_max,temperature_2m_min,"
                         "precipitation_probability_max,sunrise,sunset",
            "timezone":  "auto",
            "forecast_days": 6,
            "wind_speed_unit": "kmh",
        }
        try:
            async with aiohttp.ClientSession() as sess:
                async with sess.get(url, params=params, timeout=_TIMEOUT) as resp:
                    if resp.status == 200:
                        raw = await resp.json(content_type=None)
                        _cput(raw_key, raw, 600)
        except Exception:
            pass

    if raw is None:
        return None

    curr  = raw.get("current", {})
    hrly  = raw.get("hourly",  {})
    daily = raw.get("daily",   {})

    code     = int(curr.get("weather_code", 0))
    desc_key = _wmo_desc_key(code)
    desc_map = _WEATHER_DESCS.get(desc_key, _WEATHER_DESCS["cloudy"])

    temp_c    = round(float(curr.get("temperature_2m",       0)))
    feels_c   = round(float(curr.get("apparent_temperature", temp_c)))
    humidity  = int(curr.get("relative_humidity_2m",  0))
    wind_kmph = round(float(curr.get("wind_speed_10m", 0)))
    wind_dir  = _deg_to_compass(curr.get("wind_direction_10m", 0))
    pressure  = round(float(curr.get("surface_pressure", 0))) or None
    vis_m     = curr.get("visibility", None)
    vis_km    = round(float(vis_m) / 1000) if vis_m is not None else None

    # ── Current hour index in hourly array ─────────────────────────────────
    now_dt   = _dt.now()
    now_date = now_dt.date()
    now_hour = now_dt.hour
    times_hr = hrly.get("time", [])
    curr_idx = 0
    for i, t in enumerate(times_hr):
        try:
            dt = _dt.fromisoformat(t)
            if dt.date() == now_date and dt.hour == now_hour:
                curr_idx = i
                break
        except Exception:
            pass

    # UV index from current hour in hourly
    uv_list  = hrly.get("uv_index", [])
    uv_index = round(float(uv_list[curr_idx])) if uv_list and curr_idx < len(uv_list) else None

    # Today's min/max from daily[0]
    d_min = daily.get("temperature_2m_min", [])
    d_max = daily.get("temperature_2m_max", [])
    temp_min = round(float(d_min[0])) if d_min else None
    temp_max = round(float(d_max[0])) if d_max else None

    # ── Hourly: next 8 slots from current index ─────────────────────────────
    h_temps = hrly.get("temperature_2m", [])
    h_codes = hrly.get("weather_code",   [])
    h_pops  = hrly.get("precipitation_probability", [])
    hourly: list = []
    for i in range(curr_idx, min(curr_idx + 8, len(h_temps))):
        t = times_hr[i] if i < len(times_hr) else ""
        try:
            h_hour = _dt.fromisoformat(t).hour
        except Exception:
            h_hour = 0
        hourly.append({
            "time":       f"{h_hour:02d}:00",
            "temp_c":     round(float(h_temps[i])) if i < len(h_temps) else 0,
            "code":       int(h_codes[i])          if i < len(h_codes) else 0,
            "precip_pct": int(h_pops[i])           if i < len(h_pops)  else 0,
        })

    # ── 5-day forecast from daily ────────────────────────────────────────────
    d_dates = daily.get("time", [])
    d_codes = daily.get("weather_code", [])
    d_pops  = daily.get("precipitation_probability_max", [])
    forecast: list = []
    for i in range(min(5, len(d_dates))):
        forecast.append({
            "date":       d_dates[i],
            "day_name":   _get_day_name(d_dates[i], lang),
            "temp_min_c": round(float(d_min[i])) if i < len(d_min) else 0,
            "temp_max_c": round(float(d_max[i])) if i < len(d_max) else 0,
            "code":       int(d_codes[i])        if i < len(d_codes) else 0,
            "precip_pct": int(d_pops[i])         if i < len(d_pops)  else 0,
        })

    # ── Sunrise / sunset from daily[0] ─────────────────────────────────────
    def _iso_to_hhmm(s: str) -> str:
        try: return _dt.fromisoformat(s).strftime("%H:%M")
        except Exception: return ""

    sr_list = daily.get("sunrise", [])
    ss_list = daily.get("sunset",  [])
    sunrise_hm = _iso_to_hhmm(sr_list[0]) if sr_list else ""
    sunset_hm  = _iso_to_hhmm(ss_list[0]) if ss_list else ""

    result = {
        "temp_c":        temp_c,
        "feels_like_c":  feels_c,
        "temp_min_c":    temp_min,
        "temp_max_c":    temp_max,
        "description":   desc_map.get(lang) or desc_map.get("en", ""),
        "humidity":      humidity,
        "wind_kmph":     wind_kmph,
        "wind_dir":      wind_dir,
        "wind_dir_full": _get_wind_dir(wind_dir, lang),
        "pressure_hpa":  pressure,
        "visibility_km": vis_km,
        "dew_point_c":   _calc_dew_point(temp_c, humidity),
        "icon":          _wmo_icon(code),
        "uv_index":      uv_index,
        "sunrise":       sunrise_hm,
        "sunset":        sunset_hm,
        "hourly":        hourly,
        "forecast":      forecast,
    }
    _cput(lang_key, result, 600)
    return result


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
    """Return European AQI + PM data from Open-Meteo. Cached 10 min per location."""
    loc_key  = (round(lat, 1), round(lon, 1))
    raw_key  = f"aqi_raw:{loc_key}"
    lang_key = f"aqi:{loc_key}:{lang}"

    cached = _cget(lang_key)
    if cached is not None:
        return cached

    curr = _cget(raw_key)
    if curr is None:
        url    = "https://air-quality-api.open-meteo.com/v1/air-quality"
        params = {"latitude": lat, "longitude": lon,
                  "current": "european_aqi,pm2_5,pm10,nitrogen_dioxide,ozone,sulphur_dioxide,carbon_monoxide"}
        try:
            async with aiohttp.ClientSession() as sess:
                async with sess.get(url, params=params, timeout=_TIMEOUT) as resp:
                    if resp.status == 200:
                        raw  = await resp.json(content_type=None)
                        curr = raw.get("current", {})
                        _cput(raw_key, curr, 600)
        except Exception:
            pass

    if not curr:
        return None

    aqi    = float(curr.get("european_aqi") or 0)
    lkey   = _aqi_label_key(aqi)
    lmap   = _AQI_LABELS.get(lkey, _AQI_LABELS["Good"])
    result = {
        "aqi":   int(aqi),
        "label": lmap.get(lang) or lmap.get("en", lkey),
        "icon":  _aqi_icon(aqi),
        "color": _aqi_color(aqi),
        "pm2_5": round(float(curr.get("pm2_5")              or 0), 1),
        "pm10":  round(float(curr.get("pm10")               or 0), 1),
        "no2":   round(float(curr.get("nitrogen_dioxide")   or 0), 1),
        "ozone": round(float(curr.get("ozone")              or 0), 1),
        "so2":   round(float(curr.get("sulphur_dioxide")    or 0), 1),
        "co":    round(float((curr.get("carbon_monoxide")   or 0) / 1000), 3),
    }
    _cput(lang_key, result, 600)
    return result


# ── Uzbek Cyrillic → Latin transliteration ───────────────────────────────────

def _uz_cyr_to_lat(text: str) -> str:
    """Convert Uzbek Cyrillic text to Uzbek Latin script."""
    return (text
        .replace('Щ', 'Sh').replace('щ', 'sh')
        .replace('Ш', 'Sh').replace('ш', 'sh')
        .replace('Ч', 'Ch').replace('ч', 'ch')
        .replace('Ю', 'Yu').replace('ю', 'yu')
        .replace('Я', 'Ya').replace('я', 'ya')
        .replace('Ё', 'Yo').replace('ё', 'yo')
        .replace('Ж', 'J') .replace('ж', 'j')
        .replace('Ъ', "'") .replace('ъ', "'")
        .replace('Ь', '')  .replace('ь', '')
        .replace('Ғ', "G'").replace('ғ', "g'")
        .replace('Қ', 'Q') .replace('қ', 'q')
        .replace('Ҳ', 'H') .replace('ҳ', 'h')
        .replace('Ў', "O'").replace('ў', "o'")
        .replace('А', 'A') .replace('а', 'a')
        .replace('Б', 'B') .replace('б', 'b')
        .replace('В', 'V') .replace('в', 'v')
        .replace('Г', 'G') .replace('г', 'g')
        .replace('Д', 'D') .replace('д', 'd')
        .replace('Е', 'E') .replace('е', 'e')
        .replace('З', 'Z') .replace('з', 'z')
        .replace('И', 'I') .replace('и', 'i')
        .replace('Й', 'Y') .replace('й', 'y')
        .replace('К', 'K') .replace('к', 'k')
        .replace('Л', 'L') .replace('л', 'l')
        .replace('М', 'M') .replace('м', 'm')
        .replace('Н', 'N') .replace('н', 'n')
        .replace('О', 'O') .replace('о', 'o')
        .replace('П', 'P') .replace('п', 'p')
        .replace('Р', 'R') .replace('р', 'r')
        .replace('С', 'S') .replace('с', 's')
        .replace('Т', 'T') .replace('т', 't')
        .replace('У', 'U') .replace('у', 'u')
        .replace('Ф', 'F') .replace('ф', 'f')
        .replace('Х', 'X') .replace('х', 'x')
        .replace('Э', 'E') .replace('э', 'e')
        .replace('Ц', 'Ts').replace('ц', 'ts')
    )


# ── Daily Ayah (AlQuran.cloud) ────────────────────────────────────────────────

_AYAH_EDITIONS = {
    "uz": "uz.sodik", "uz_cyr": "uz.sodik",
    "en": "en.sahih",
    "ru": "ru.kuliev",
    "tr": "tr.diyanet",
    "ar": None,
    "kk": "ru.kuliev", "tg": "ru.kuliev", "ky": "ru.kuliev",
    "de": "de.aburida",
    "fr": "fr.hamidullah",
    "id": "id.indonesian",
    "hi": "hi.hindi",
    "ur": "ur.ahmedali",
}

async def fetch_daily_ayah(lang: str = "en") -> Optional[dict]:
    """Return today's ayah. Cached 24 h per lang (same ayah all day for everyone)."""
    day      = date.today().timetuple().tm_yday
    cache_key = f"ayah:{day}:{lang}"

    cached = _cget(cache_key)
    if cached is not None:
        return cached

    ayah_num = (day % 6236) + 1
    edition  = _AYAH_EDITIONS.get(lang, "en.sahih")
    url = (
        f"https://api.alquran.cloud/v1/ayah/{ayah_num}/editions/quran-uthmani,{edition}"
        if edition else
        f"https://api.alquran.cloud/v1/ayah/{ayah_num}/editions/quran-uthmani"
    )
    try:
        async with aiohttp.ClientSession() as sess:
            async with sess.get(url, headers=_UA, timeout=_TIMEOUT) as resp:
                if resp.status == 200:
                    raw = await resp.json(content_type=None)
                    if raw.get("code") == 200:
                        data  = raw["data"]
                        ar    = data[0]
                        tr_ed = data[1] if edition and len(data) > 1 else None
                        surah = ar.get("surah", {})
                        translation = tr_ed.get("text", "") if tr_ed else ""
                        if lang == "uz" and translation:
                            translation = _uz_cyr_to_lat(translation)
                        result = {
                            "arabic":       ar.get("text", ""),
                            "translation":  translation,
                            "surah_en":     surah.get("englishName", ""),
                            "surah_ar":     surah.get("name", ""),
                            "surah_number": surah.get("number", 0),
                            "ayah_number":  ar.get("numberInSurah", 0),
                            "reference":    f"Surah {surah.get('englishName','')} ({surah.get('number','')}:{ar.get('numberInSurah','')})",
                        }
                        _cput(cache_key, result, 86400)  # cache 24 h
                        return result
    except Exception:
        pass
    return None


# ── Daily Hadith (local collection) ──────────────────────────────────────────

_HADITH_LANG_FALLBACK = {"uz_cyr": "uz", "kk": "ru", "tg": "ru", "ky": "ru"}

def get_daily_hadith(lang: str = "en") -> dict:
    """Return today's hadith in the user's language from the local 30-hadith collection."""
    from data.hadiths import DAILY_HADITHS
    day = date.today().timetuple().tm_yday
    h   = DAILY_HADITHS[day % len(DAILY_HADITHS)]
    l   = _HADITH_LANG_FALLBACK.get(lang, lang)

    text = h.get("text", "")
    if isinstance(text, dict):
        text = text.get(l) or text.get("en", "")

    narrator = h.get("narrator", "")
    if isinstance(narrator, dict):
        narrator = narrator.get(l) or narrator.get("en", "")

    return {"text": text, "source": h.get("source", ""), "narrator": narrator}


# ── Convenience: fetch all extras at once ────────────────────────────────────

async def fetch_all_extras(lat: float, lon: float, lang: str = "en") -> dict:
    weather, aqi, ayah = await asyncio.gather(
        fetch_weather(lat, lon, lang),
        fetch_aqi(lat, lon, lang),
        fetch_daily_ayah(lang),
    )
    return {
        "weather":       weather,
        "aqi":           aqi,
        "daily_ayah":    ayah,
        "daily_hadith":  get_daily_hadith(lang),
    }
