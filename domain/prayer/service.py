"""Prayer times domain service — fetches, processes, and formats data."""

import asyncio
from datetime import datetime
from typing import Optional
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from infrastructure.external.aladhan_api import fetch_timings
from infrastructure.external.geocoding_api import reverse_geocode

# ── Prayer display order ─────────────────────────────────────────────────────
PRAYER_KEYS = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"]

# Sunrise is shown but skipped when finding the "next salah"
_SALAH_KEYS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"]

PRAYER_ICONS = {
    "Fajr":    "🌙",
    "Sunrise": "☀️",
    "Dhuhr":   "🌤",
    "Asr":     "⛅",
    "Maghrib": "🌆",
    "Isha":    "🌃",
}

# ── Prayer names in 14 languages ─────────────────────────────────────────────
PRAYER_NAMES: dict[str, list[str]] = {
    # Order: Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha
    "uz":     ["Bomdod",        "Quyosh chiqishi",  "Peshin",   "Asr",    "Shom",    "Xufton"],
    "uz_cyr": ["Бомдод",        "Қуёш чиқиши",      "Пешин",    "Аср",    "Шом",     "Хуфтон"],
    "en":     ["Fajr",          "Sunrise",           "Dhuhr",    "Asr",    "Maghrib", "Isha"],
    "ru":     ["Фаджр",         "Восход",            "Зухр",     "Аср",    "Магриб",  "Иша"],
    "tr":     ["Sabah",         "Güneş",             "Öğle",     "İkindi", "Akşam",   "Yatsı"],
    "ar":     ["الفجر",         "الشروق",            "الظهر",    "العصر",  "المغرب",  "العشاء"],
    "kk":     ["Таң намазы",    "Күн шығуы",         "Бесін",    "Аср",    "Ақшам",   "Күфтан"],
    "tg":     ["Бомдод",        "Тулӯи офтоб",       "Пешин",    "Аср",    "Шом",     "Хуфтон"],
    "pl":     ["Fajr",          "Wschód słońca",     "Zuhr",     "Asr",    "Maghrib", "Isza"],
    "de":     ["Fajr",          "Sonnenaufgang",     "Dhuhr",    "Asr",    "Maghrib", "Isha"],
    "fr":     ["Fajr",          "Lever du soleil",   "Dhuhr",    "Asr",    "Maghrib", "Isha"],
    "id":     ["Subuh",         "Terbit",            "Dzuhur",   "Ashar",  "Maghrib", "Isya"],
    "hi":     ["फज्र",          "सूर्योदय",          "ज़ुहर",    "अस्र",   "मग़रिब",  "इशा"],
    "ur":     ["فجر",           "طلوع آفتاب",        "ظہر",      "عصر",    "مغرب",    "عشاء"],
}

# ── Bot UI i18n strings ───────────────────────────────────────────────────────

# Button texts that trigger the prayer handler (all 14 languages)
ALL_PRAYER_BUTTON_TEXTS: set[str] = {
    "🕌 Namoz vaqtlari",      # uz
    "🕌 Намоз вақтлари",      # uz_cyr
    "🕌 Prayer Times",         # en
    "🕌 Время намаза",          # ru
    "🕌 Namaz Vakitleri",       # tr
    "🕌 مواقيت الصلاة",        # ar
    "🕌 Намаз уақыттары",      # kk
    "🕌 Вақти намоз",           # tg
    "🕌 Czasy modlitwy",        # pl
    "🕌 Gebetszeiten",          # de
    "🕌 Heures de prière",      # fr
    "🕌 Waktu Sholat",          # id
    "🕌 नमाज़ का वक्त",          # hi
    "🕌 نماز کے اوقات",          # ur
}

ASK_LOCATION_TEXT: dict[str, str] = {
    "uz":     "📍 Namoz vaqtlarini bilish uchun <b>lokatsiyangizni yuboring</b>:",
    "uz_cyr": "📍 Намоз вақтларини билиш учун <b>локациянгизни юборинг</b>:",
    "en":     "📍 <b>Send your location</b> to get prayer times:",
    "ru":     "📍 <b>Отправьте вашу локацию</b> для получения времени намаза:",
    "tr":     "📍 Namaz vakitlerini öğrenmek için <b>konumunuzu gönderin</b>:",
    "ar":     "📍 <b>أرسل موقعك</b> لمعرفة أوقات الصلاة:",
    "kk":     "📍 Намаз уақыттарын білу үшін <b>орналасқан жеріңізді жіберіңіз</b>:",
    "tg":     "📍 Барои донистани вақти намоз, <b>мавқеатонро фиристед</b>:",
    "pl":     "📍 <b>Wyślij lokalizację</b>, aby poznać czasy modlitwy:",
    "de":     "📍 <b>Senden Sie Ihren Standort</b> für die Gebetszeiten:",
    "fr":     "📍 <b>Envoyez votre emplacement</b> pour les heures de prière:",
    "id":     "📍 <b>Kirim lokasi Anda</b> untuk mendapatkan waktu sholat:",
    "hi":     "📍 नमाज़ का वक्त जानने के लिए <b>अपनी लोकेशन भेजें</b>:",
    "ur":     "📍 نماز کے اوقات جاننے کے لیے <b>اپنی لوکیشن بھیجیں</b>:",
}

CALCULATING_TEXT: dict[str, str] = {
    "uz":     "⏳ Namoz vaqtlari hisoblanmoqda...",
    "uz_cyr": "⏳ Намоз вақтлари ҳисобланмоқда...",
    "en":     "⏳ Calculating prayer times...",
    "ru":     "⏳ Вычисляем время намаза...",
    "tr":     "⏳ Namaz vakitleri hesaplanıyor...",
    "ar":     "⏳ جاري حساب أوقات الصلاة...",
    "kk":     "⏳ Намаз уақыттары есептелуде...",
    "tg":     "⏳ Вақти намоз ҳисоб карда мешавад...",
    "pl":     "⏳ Obliczanie czasów modlitwy...",
    "de":     "⏳ Gebetszeiten werden berechnet...",
    "fr":     "⏳ Calcul des heures de prière...",
    "id":     "⏳ Menghitung waktu sholat...",
    "hi":     "⏳ नमाज़ का वक्त गणना हो रहा है...",
    "ur":     "⏳ نماز کے اوقات حساب ہو رہے ہیں...",
}

ERROR_TEXT: dict[str, str] = {
    "uz":     "❌ Xatolik yuz berdi. Iltimos qayta urinib ko'ring.",
    "uz_cyr": "❌ Хатолик юз берди. Илтимос қайта уриниб кўринг.",
    "en":     "❌ An error occurred. Please try again.",
    "ru":     "❌ Произошла ошибка. Попробуйте ещё раз.",
    "tr":     "❌ Bir hata oluştu. Lütfen tekrar deneyin.",
    "ar":     "❌ حدث خطأ. يرجى المحاولة مرة أخرى.",
    "kk":     "❌ Қате орын алды. Қайталап көріңіз.",
    "tg":     "❌ Хато рӯй дод. Лутфан дубора кӯшиш кунед.",
    "pl":     "❌ Wystąpił błąd. Spróbuj ponownie.",
    "de":     "❌ Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.",
    "fr":     "❌ Une erreur s'est produite. Veuillez réessayer.",
    "id":     "❌ Terjadi kesalahan. Silakan coba lagi.",
    "hi":     "❌ एक त्रुटि हुई। कृपया फिर से प्रयास करें।",
    "ur":     "❌ ایک خرابی پیش آئی۔ براہ کرم دوبارہ کوشش کریں۔",
}

HEADER_TEXT: dict[str, str] = {
    "uz":     "🕌 <b>Namoz vaqtlari</b>",
    "uz_cyr": "🕌 <b>Намоз вақтлари</b>",
    "en":     "🕌 <b>Prayer Times</b>",
    "ru":     "🕌 <b>Время намаза</b>",
    "tr":     "🕌 <b>Namaz Vakitleri</b>",
    "ar":     "🕌 <b>مواقيت الصلاة</b>",
    "kk":     "🕌 <b>Намаз уақыттары</b>",
    "tg":     "🕌 <b>Вақти намоз</b>",
    "pl":     "🕌 <b>Czasy modlitwy</b>",
    "de":     "🕌 <b>Gebetszeiten</b>",
    "fr":     "🕌 <b>Heures de prière</b>",
    "id":     "🕌 <b>Waktu Sholat</b>",
    "hi":     "🕌 <b>नमाज़ का वक्त</b>",
    "ur":     "🕌 <b>نماز کے اوقات</b>",
}

COUNTDOWN_TEXT: dict[str, str] = {
    "uz":     "⏳ <b>{name}</b>ga {h} soat {m} daqiqa qoldi",
    "uz_cyr": "⏳ <b>{name}</b>га {h} соат {m} дақиқа қолди",
    "en":     "⏳ <b>{h}h {m}m</b> until {name}",
    "ru":     "⏳ До <b>{name}</b>: {h} ч {m} мин",
    "tr":     "⏳ <b>{name}</b>'a {h} saat {m} dakika kaldı",
    "ar":     "⏳ تبقى <b>{h}</b> ساعة و<b>{m}</b> دقيقة لـ<b>{name}</b>",
    "kk":     "⏳ <b>{name}</b>ға {h} сағат {m} минут қалды",
    "tg":     "⏳ То <b>{name}</b>: {h} соат {m} дақиқа монд",
    "pl":     "⏳ <b>{h}g {m}m</b> do {name}",
    "de":     "⏳ <b>{h}h {m}m</b> bis {name}",
    "fr":     "⏳ <b>{h}h {m}m</b> avant {name}",
    "id":     "⏳ <b>{h} jam {m} menit</b> lagi {name}",
    "hi":     "⏳ <b>{name}</b> में {h} घंटे {m} मिनट",
    "ur":     "⏳ <b>{name}</b> میں {h} گھنٹے {m} منٹ",
}

TOMORROW_FAJR: dict[str, str] = {
    "uz":     "⏳ Barcha namozlar o'tdi. Bomdodga tayyorlaning 🌙",
    "uz_cyr": "⏳ Барча намозлар ўтди. Бомдодга тайёрланинг 🌙",
    "en":     "⏳ All prayers done for today. Prepare for Fajr 🌙",
    "ru":     "⏳ Все намазы прошли. Готовьтесь к Фаджру 🌙",
    "tr":     "⏳ Tüm namazlar tamamlandı. Sabaha hazırlanın 🌙",
    "ar":     "⏳ انتهت جميع الصلوات. استعد للفجر 🌙",
    "kk":     "⏳ Барлық намаздар аяқталды. Таңға дайындалыңыз 🌙",
    "tg":     "⏳ Ҳамаи намозҳо гузаштанд. Барои бомдод омода шавед 🌙",
    "pl":     "⏳ Wszystkie modlitwy skończone. Przygotuj się na Fajr 🌙",
    "de":     "⏳ Alle Gebete erledigt. Bereite dich auf Fajr vor 🌙",
    "fr":     "⏳ Toutes les prières terminées. Préparez-vous pour Fajr 🌙",
    "id":     "⏳ Semua sholat selesai. Bersiap untuk Subuh 🌙",
    "hi":     "⏳ आज की सभी नमाज़ें हो गईं। फज्र की तैयारी करें 🌙",
    "ur":     "⏳ آج کی تمام نمازیں ہو گئیں۔ فجر کی تیاری کریں 🌙",
}

# Refresh / change location / main menu button texts for all languages
REFRESH_TEXTS: set[str] = {
    "🔄 Yangilash", "🔄 Yangilanish", "🔄 Refresh", "🔄 Обновить",
    "🔄 Yenile", "🔄 Odśwież", "🔄 Aktualisieren", "🔄 Actualiser",
    "🔄 تحديث", "🔄 Жаңарту", "🔄 Навсоз кардан", "🔄 Perbarui",
    "🔄 रिफ्रेश", "🔄 تازہ کریں",
}

CHANGE_LOC_TEXTS: set[str] = {
    "📍 Lokatsiyani o'zgartirish", "📍 Lokatsiyani ozgartirish",
    "📍 Change location", "📍 Изменить локацию",
    "📍 Konumu değiştir", "📍 Zmień lokalizację",
    "📍 Standort ändern", "📍 Changer d'emplacement",
    "📍 تغيير الموقع", "📍 Орынды өзгерту",
    "📍 Мавқеатро иваз кунед", "📍 Ubah lokasi",
    "📍 स्थान बदलें", "📍 مقام تبدیل کریں",
}

MAIN_MENU_TEXTS: set[str] = {
    "🏠 Asosiy menyu", "🏠 Main menu", "🏠 Главное меню",
    "🏠 Ana menü", "🏠 Menu główne", "🏠 Hauptmenü",
    "🏠 Menu principal", "🏠 القائمة الرئيسية", "🏠 Басты мәзір",
    "🏠 Менюи асосӣ", "🏠 Menu utama", "🏠 मुख्य मेनू", "🏠 مین مینو",
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _strip_tz(time_str: str) -> str:
    """'04:15 (+05)' → '04:15'"""
    return time_str.split(" ")[0] if time_str else "--:--"


def _calc_next_prayer(timings: dict, tz_str: str) -> dict:
    """Return the next salah key, local time, and countdown info."""
    try:
        tz = ZoneInfo(tz_str)
    except (ZoneInfoNotFoundError, Exception):
        tz = ZoneInfo("UTC")

    now = datetime.now(tz)

    for key in _SALAH_KEYS:
        raw = timings.get(key, "")
        if not raw:
            continue
        t = _strip_tz(raw)
        h, m = map(int, t.split(":"))
        prayer_dt = now.replace(hour=h, minute=m, second=0, microsecond=0)

        if prayer_dt > now:
            diff       = prayer_dt - now
            total_secs = int(diff.total_seconds())
            return {
                "key":               key,
                "time":              t,
                "countdown_seconds": total_secs,
                "hours":             total_secs // 3600,
                "minutes":           (total_secs % 3600) // 60,
            }

    # All prayers done → Fajr tomorrow
    raw = timings.get("Fajr", "")
    return {
        "key":               "Fajr",
        "time":              _strip_tz(raw),
        "countdown_seconds": None,
        "hours":             None,
        "minutes":           None,
    }


# ── Main service ──────────────────────────────────────────────────────────────

class PrayerService:

    async def get_prayer_data(
        self,
        lat: float,
        lon: float,
        lang: str = "uz",
        method: int = 3,
    ) -> Optional[dict]:
        """Fetch, parse, and return all prayer data for a location."""

        aladhan_data, geo_data = await asyncio.gather(
            fetch_timings(lat, lon, method),
            reverse_geocode(lat, lon),
        )

        if not aladhan_data:
            return None

        raw_timings = aladhan_data.get("timings", {})
        meta        = aladhan_data.get("meta", {})
        date_info   = aladhan_data.get("date", {})
        tz_str      = meta.get("timezone", "UTC")

        # Clean timings
        timings = {k: _strip_tz(v) for k, v in raw_timings.items() if k in PRAYER_KEYS}

        # Next prayer
        next_prayer = _calc_next_prayer(raw_timings, tz_str)

        # Prayer list with display names
        names = PRAYER_NAMES.get(lang, PRAYER_NAMES["en"])
        prayers = [
            {
                "key":     key,
                "icon":    PRAYER_ICONS[key],
                "name":    names[i],
                "time":    timings.get(key, "--:--"),
                "is_next": (key == next_prayer["key"]),
            }
            for i, key in enumerate(PRAYER_KEYS)
        ]

        # Hijri & Gregorian date
        hijri = date_info.get("hijri", {})
        greg  = date_info.get("gregorian", {})

        return {
            "city":         geo_data.get("city", ""),
            "country":      geo_data.get("country", ""),
            "country_code": geo_data.get("country_code", ""),
            "timezone":     tz_str,
            "method":       (meta.get("method") or {}).get("name", "") if isinstance(meta.get("method"), dict) else "",
            "prayers":      prayers,
            "next_prayer":  next_prayer,
            "hijri": {
                "day":      hijri.get("day", ""),
                "month_en": hijri.get("month", {}).get("en", ""),
                "month_ar": hijri.get("month", {}).get("ar", ""),
                "year":     hijri.get("year", ""),
                "full":     f"{hijri.get('day','')} {hijri.get('month',{}).get('en','')} {hijri.get('year','')}",
            },
            "gregorian": {
                "date":      greg.get("date", ""),
                "day":       greg.get("day", ""),
                "month":     greg.get("month", {}).get("en", ""),
                "month_num": str(greg.get("month", {}).get("number", "")),
                "year":      greg.get("year", ""),
            },
            "lat": lat,
            "lon": lon,
        }

    def format_bot_message(self, data: dict, lang: str) -> str:
        """Format prayer times as a Telegram HTML message."""
        city    = data["city"]
        country = data["country"]
        loc     = f"📍 {city}, {country}" if city else f"📍 {country}"

        hijri_date = data["hijri"]["full"]
        greg       = data["gregorian"]
        greg_date  = f"{greg['day']}.{greg['month_num']}.{greg['year']}"
        date_line  = f"📅 {hijri_date}  ·  {greg_date}"

        sep = "─" * 22

        prayer_lines = []
        for p in data["prayers"]:
            time_part = f"  {p['time']}"
            if p["is_next"]:
                line = f"<b>{p['icon']} {p['name']:<20} ›{time_part}</b>"
            else:
                line = f"{p['icon']} {p['name']:<20}  {time_part}"
            prayer_lines.append(line)

        next_p     = data["next_prayer"]
        lang_key   = lang if lang in COUNTDOWN_TEXT else "en"

        # Look up the prayer name from the already-built prayers list
        # (avoids index mismatch between PRAYER_KEYS and _SALAH_KEYS)
        next_name = next_p["key"]
        for p in data["prayers"]:
            if p["key"] == next_p["key"]:
                next_name = p["name"]
                break

        if next_p["hours"] is not None:
            countdown = COUNTDOWN_TEXT[lang_key].format(
                name=next_name,
                h=next_p["hours"],
                m=f"{next_p['minutes']:02d}",
            )
        else:
            countdown = TOMORROW_FAJR.get(lang_key, TOMORROW_FAJR["en"])

        header = HEADER_TEXT.get(lang_key, HEADER_TEXT["en"])

        parts = [
            header,
            "",
            loc,
            date_line,
            "",
            sep,
            "",
            *prayer_lines,
            "",
            sep,
            "",
            countdown,
        ]
        return "\n".join(parts)


prayer_service = PrayerService()
