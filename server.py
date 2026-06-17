"""
IslamTimeWorldBot — WebApp Static File Server + REST API + Bot Webhook (FastAPI)

Local dev:   python server.py          (polling bot runs separately via start_all.ps1)
Production:  uvicorn server:app --host 0.0.0.0 --port $PORT
             Bot uses webhook auto-registered on startup when WEBAPP_URL is set.
"""

import os
import sys
import json
import time
import shutil
import logging
import asyncio
import sqlite3
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

# ── Runtime state ─────────────────────────────────────────────────────────────
_START_TIME     = time.monotonic()
_START_DT       = datetime.now(timezone.utc)
_SCHED_STATUS: dict = {"ticks": 0, "last_tick": None, "errors": 0, "running": False}
_WEBHOOK_INFO: dict = {"url": None, "set_at": None, "verified": False}

# ── File error logger ──────────────────────────────────────────────────────────
_LOG_FILE = Path(__file__).parent / "server_err.log"
_flog = logging.getLogger("islamtimebot")
_flog.setLevel(logging.ERROR)
try:
    _fh = logging.FileHandler(str(_LOG_FILE), encoding="utf-8")
    _fh.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(message)s",
                                        datefmt="%Y-%m-%d %H:%M:%S"))
    _flog.addHandler(_fh)
except Exception:
    pass

# ── In-process prayer-times cache (5 min TTL) ─────────────────────────────────
_PT_CACHE: dict = {}
_PT_TTL = 300   # seconds

def _pt_cache_get(key: str):
    item = _PT_CACHE.get(key)
    if item and time.monotonic() < item[1]:
        return item[0]
    return None

def _pt_cache_put(key: str, val: dict):
    _PT_CACHE[key] = (val, time.monotonic() + _PT_TTL)

sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Query, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

# ── Config ─────────────────────────────────────────────────────────────────
BASE_DIR   = Path(__file__).parent
WEBAPP_DIR = BASE_DIR / "webapp"
USERS_DB   = BASE_DIR / "data" / "users.db"
BOT_TOKEN  = os.getenv("BOT_TOKEN", "")
WEBAPP_URL = os.getenv("WEBAPP_URL", "")
_PRIMARY_ADMIN = 310467246
ADMIN_IDS = {_PRIMARY_ADMIN}
for _x in os.getenv("ADMIN_IDS", "").split(","):
    if _x.strip().isdigit():
        ADMIN_IDS.add(int(_x.strip()))

# ── User tracking (SQLite) ──────────────────────────────────────────────────
def _init_users_db():
    try:
        conn = sqlite3.connect(str(USERS_DB))
        conn.execute("""CREATE TABLE IF NOT EXISTS users (
            user_id     INTEGER PRIMARY KEY,
            username    TEXT    DEFAULT '',
            first_name  TEXT    DEFAULT '',
            language    TEXT    DEFAULT '',
            city        TEXT    DEFAULT '',
            country     TEXT    DEFAULT '',
            last_lat    REAL,
            last_lon    REAL,
            last_city   TEXT    DEFAULT '',
            joined_at   TEXT    NOT NULL,
            last_active TEXT    NOT NULL
        )""")
        # Migrate existing DBs that lack the location columns
        for col, typedef in [
            ("last_lat",                "REAL"),
            ("last_lon",                "REAL"),
            ("last_city",               "TEXT DEFAULT ''"),
            ("notif_enabled",           "INTEGER DEFAULT 0"),
            ("notif_timing",            "TEXT DEFAULT '{}'"),
            ("notif_tz_offset",         "INTEGER DEFAULT 0"),
            ("notif_sent",              "TEXT DEFAULT '{}'"),
            ("daily_briefing_enabled",  "INTEGER DEFAULT 1"),
            ("daily_briefing_time",     "TEXT DEFAULT '04:00'"),
            ("briefing_sent",           "TEXT DEFAULT ''"),
        ]:
            try:
                conn.execute(f"ALTER TABLE users ADD COLUMN {col} {typedef}")
            except Exception:
                pass  # column already exists
        # One-time upgrade: enable briefing for existing users who never received one
        conn.execute("""
            UPDATE users SET daily_briefing_enabled=1
            WHERE (daily_briefing_enabled=0 OR daily_briefing_enabled IS NULL)
              AND (briefing_sent IS NULL OR briefing_sent='')
        """)
        conn.commit()
        conn.close()
        print("[OK] users.db initialized", flush=True)
    except Exception as e:
        print(f"[WARN] users.db init: {e}", flush=True)


def _db_connect(retries: int = 5, delay: float = 0.4) -> sqlite3.Connection:
    """Connect to users.db with automatic retry on lock."""
    last_err: Exception = RuntimeError("no attempt")
    for i in range(retries):
        try:
            conn = sqlite3.connect(str(USERS_DB), timeout=15)
            conn.execute("PRAGMA journal_mode=WAL")
            return conn
        except sqlite3.OperationalError as e:
            last_err = e
            if i < retries - 1:
                time.sleep(delay * (i + 1))
    raise last_err


def _backup_db():
    """Daily backup of users.db — skips if today's file already exists."""
    try:
        if not USERS_DB.exists():
            return
        backup_dir = USERS_DB.parent / "backup"
        backup_dir.mkdir(exist_ok=True)
        today = datetime.utcnow().strftime("%Y-%m-%d")
        dest  = backup_dir / f"users_{today}.db"
        if not dest.exists():
            shutil.copy2(str(USERS_DB), str(dest))
            print(f"[DB] Backup created: {dest.name}", flush=True)
        # Keep only last 30 daily backups
        for old in sorted(backup_dir.glob("users_*.db"))[:-30]:
            try: old.unlink()
            except Exception: pass
    except Exception as e:
        print(f"[DB] Backup failed: {e}", flush=True)


def _track_user(user_id: int, username: str = "", first_name: str = "", language: str = ""):
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    try:
        conn = sqlite3.connect(str(USERS_DB))
        conn.execute("""
        INSERT INTO users (user_id, username, first_name, language, joined_at, last_active,
                           daily_briefing_enabled, daily_briefing_time)
        VALUES (?, ?, ?, ?, ?, ?, 1, '04:00')
        ON CONFLICT(user_id) DO UPDATE SET
            username    = excluded.username,
            first_name  = excluded.first_name,
            language    = CASE WHEN excluded.language != '' THEN excluded.language ELSE language END,
            last_active = excluded.last_active
        """, (user_id, username or "", first_name or "", language, now, now))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[WARN] _track_user: {e}", flush=True)

def _update_user_lang(user_id: int, language: str):
    try:
        conn = sqlite3.connect(str(USERS_DB))
        conn.execute("UPDATE users SET language=? WHERE user_id=?", (language, user_id))
        conn.commit()
        conn.close()
    except Exception:
        pass

def _get_stats() -> dict:
    today = datetime.utcnow().strftime("%Y-%m-%d")
    try:
        conn = sqlite3.connect(str(USERS_DB))
        conn.row_factory = sqlite3.Row
        total     = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        new_today = conn.execute("SELECT COUNT(*) FROM users WHERE joined_at LIKE ?", (today+"%",)).fetchone()[0]
        active    = conn.execute("SELECT COUNT(*) FROM users WHERE last_active LIKE ?", (today+"%",)).fetchone()[0]
        by_lang   = conn.execute("SELECT language, COUNT(*) c FROM users GROUP BY language ORDER BY c DESC LIMIT 10").fetchall()
        last_10   = conn.execute("SELECT first_name, username, language, joined_at FROM users ORDER BY joined_at DESC LIMIT 10").fetchall()
        conn.close()
        return {
            "total": total, "new_today": new_today, "active_today": active,
            "by_lang": [(r["language"] or "?", r["c"]) for r in by_lang],
            "last_10": [(r["first_name"], r["username"], r["language"], r["joined_at"][:10]) for r in last_10],
        }
    except Exception as e:
        return {"error": str(e)}

# ── Notification bot (always-on, for sending scheduled reminders) ──────────
_bot_notif = None   # separate Bot instance used only for sending notifications

# Prayer names keyed by prayer key + lang
_PRAYER_NOTIF_NAMES: dict[str, dict] = {
    "fajr":    {"uz":"Bomdod",  "uz_cyr":"Бомдод",  "ru":"Фаджр",  "en":"Fajr",    "tr":"Sabah",  "ar":"الفجر",  "kk":"Таң",     "tg":"Бомдод",  "de":"Fajr",    "fr":"Fajr",    "id":"Subuh",   "hi":"फज्र",    "ur":"فجر"},
    "dhuhr":   {"uz":"Peshin",  "uz_cyr":"Пешин",   "ru":"Зухр",   "en":"Dhuhr",   "tr":"Öğle",   "ar":"الظهر",  "kk":"Бесін",   "tg":"Пешин",   "de":"Dhuhr",   "fr":"Dhuhr",   "id":"Dzuhur",  "hi":"ज़ुहर",    "ur":"ظہر"},
    "asr":     {"uz":"Asr",     "uz_cyr":"Аср",     "ru":"Аср",    "en":"Asr",     "tr":"İkindi", "ar":"العصر",  "kk":"Аср",     "tg":"Аср",     "de":"Asr",     "fr":"Asr",     "id":"Ashar",   "hi":"अस्र",    "ur":"عصر"},
    "maghrib": {"uz":"Shom",    "uz_cyr":"Шом",     "ru":"Магриб", "en":"Maghrib", "tr":"Akşam",  "ar":"المغرب", "kk":"Ақшам",   "tg":"Шом",     "de":"Maghrib", "fr":"Maghrib", "id":"Maghrib", "hi":"मग़रिब",  "ur":"مغرب"},
    "isha":    {"uz":"Xufton",  "uz_cyr":"Хуфтон",  "ru":"Иша",    "en":"Isha",    "tr":"Yatsı",  "ar":"العشاء", "kk":"Күфтан",  "tg":"Хуфтон",  "de":"Isha",    "fr":"Isha",    "id":"Isya",    "hi":"इशा",     "ur":"عشاء"},
}

_NOTIF_T = {
    "before": {
        "uz":     "🔔 {name} namoziga {min} daqiqa qoldi",
        "uz_cyr": "🔔 {name} намозига {min} дақиқа қолди",
        "ru":     "🔔 До намаза {name} осталось {min} минут",
        "en":     "🔔 {name} prayer in {min} minutes",
        "tr":     "🔔 {name} namazına {min} dakika kaldı",
        "ar":     "🔔 تبقى {min} دقيقة على صلاة {name}",
        "kk":     "🔔 {name} намазына {min} минут қалды",
        "tg":     "🔔 То намози {name} {min} дақиқа монд",
        "de":     "🔔 {min} Minuten bis zum {name}-Gebet",
        "fr":     "🔔 {min} minutes avant la prière {name}",
        "id":     "🔔 {min} menit lagi sholat {name}",
        "hi":     "🔔 {name} नमाज़ में {min} मिनट बाकी",
        "ur":     "🔔 {name} نماز میں {min} منٹ باقی",
    },
    "now": {
        "uz":     "🕌 {name} namozi vaqti keldi!",
        "uz_cyr": "🕌 {name} намози вақти келди!",
        "ru":     "🕌 Время намаза {name}!",
        "en":     "🕌 Time for {name} prayer!",
        "tr":     "🕌 {name} namaz vakti geldi!",
        "ar":     "🕌 حان وقت صلاة {name}!",
        "kk":     "🕌 {name} намаз уақыты келді!",
        "tg":     "🕌 Вақти намози {name} расид!",
        "de":     "🕌 Zeit für das {name}-Gebet!",
        "fr":     "🕌 L'heure de la prière {name}!",
        "id":     "🕌 Waktu sholat {name} tiba!",
        "hi":     "🕌 {name} नमाज़ का वक्त आ गया!",
        "ur":     "🕌 {name} نماز کا وقت آ گیا!",
    },
    "dua": {
        "uz":     "Alloh bizni namozga muvaffaq qilsin.",
        "uz_cyr": "Аллоҳ бизни намозга муваффақ қилсин.",
        "ru":     "Да поможет нам Аллах совершить намаз.",
        "en":     "May Allah help us to pray.",
        "tr":     "Allah bizi namaza muvaffak eylesin.",
        "ar":     "تقبل الله صلاتنا.",
        "kk":     "Аллаh бізге намаз оқуға мүмкіндік берсін.",
        "tg":     "Аллоҳ моро ба намоз муваффақ кунад.",
        "de":     "Möge Allah uns beim Gebet helfen.",
        "fr":     "Qu'Allah nous aide à prier.",
        "id":     "Semoga Allah memudahkan kita sholat.",
        "hi":     "अल्लाह हमें नमाज़ पढ़ने की तौफ़ीक़ दे।",
        "ur":     "اللہ ہمیں نماز کی توفیق عطا فرمائے۔",
    },
}


def _format_notification(lang: str, prayer_key: str, prayer_time: str, city: str, offset_min: int) -> str:
    """Format a professional Telegram notification message."""
    names = _PRAYER_NOTIF_NAMES.get(prayer_key.lower(), {})
    name  = names.get(lang) or names.get("en") or prayer_key.capitalize()
    l     = lang if lang in _NOTIF_T["now"] else "uz"

    if offset_min < 0:
        tmpl  = _NOTIF_T["before"].get(l, _NOTIF_T["before"]["uz"])
        title = tmpl.format(name=name, min=abs(offset_min))
    else:
        tmpl  = _NOTIF_T["now"].get(l, _NOTIF_T["now"]["uz"])
        title = tmpl.format(name=name)

    dua = _NOTIF_T["dua"].get(l, _NOTIF_T["dua"]["uz"])

    lines = [f"<b>{title}</b>", "", f"🕌 {name}: {prayer_time}"]
    if city:
        lines.append(f"📍 {city}")
    lines += ["", f"<i>{dua}</i>"]
    return "\n".join(lines)


async def _init_notif_bot():
    """Always-on Bot instance for sending scheduled notifications."""
    global _bot_notif
    if not BOT_TOKEN:
        return
    try:
        import socket, aiohttp
        from aiogram import Bot
        from aiogram.client.session.aiohttp import AiohttpSession

        _TG_HOST = "api.telegram.org"
        _TG_IP   = "149.154.167.220"

        class _NR:
            async def resolve(self, host, port=0, family=socket.AF_INET):
                if host == _TG_HOST:
                    return [{"hostname": host, "host": _TG_IP, "port": port,
                             "family": socket.AF_INET, "proto": 0, "flags": 0}]
                return await aiohttp.ThreadedResolver().resolve(host, port, family)
            async def close(self): pass

        session = AiohttpSession()
        session._connector_init["resolver"] = _NR()
        _bot_notif = Bot(token=BOT_TOKEN, session=session)
        print("[OK] Notification bot initialized", flush=True)
    except Exception as e:
        print(f"[WARN] _init_notif_bot: {e}", flush=True)


async def _process_user_notif(user: dict, utc_minutes: int, today_str: str):
    user_id   = user["user_id"]
    lang      = user["language"] or "uz"
    lat       = user["last_lat"]
    lon       = user["last_lon"]
    city      = user["last_city"] or ""
    tz_offset = user["notif_tz_offset"] or 0

    try:
        timing = json.loads(user["notif_timing"] or "{}")
    except Exception:
        timing = {}

    try:
        sent_data = json.loads(user["notif_sent"] or "{}")
    except Exception:
        sent_data = {}

    # User's local minute-of-day (0–1439)
    local_minutes = (utc_minutes + tz_offset) % 1440
    print(f"[NOTIF-CHK] uid={user_id} tz={tz_offset} local_min={local_minutes} timing={timing}", flush=True)

    # Use in-process prayer cache when possible
    cache_key = f"{round(lat, 2)},{round(lon, 2)},3,{lang}"
    data = _pt_cache_get(cache_key)
    if data is None:
        try:
            from domain.prayer.service import prayer_service
            data = await prayer_service.get_prayer_data(lat, lon, lang, 3)
            if data:
                _pt_cache_put(cache_key, data)
        except Exception:
            return
    if not data:
        return

    prayers = [p for p in (data.get("prayers") or []) if p.get("key") != "sunrise"]

    if sent_data.get("date") != today_str:
        sent_data = {"date": today_str, "keys": []}
    sent_keys: set = set(sent_data.get("keys", []))

    new_keys: list = []
    for p in prayers:
        key = p.get("key", "")
        t   = p.get("time", "")
        if ":" not in t:
            continue
        h, m          = t.split(":")
        prayer_minute = int(h) * 60 + int(m)
        offset        = int(timing.get(key, 0))   # -30, -15, -10, 0
        notif_minute  = (prayer_minute + offset) % 1440
        sent_key      = f"{key}_{offset}"

        delta = (notif_minute - local_minutes) % 1440
        if delta <= 5 or delta >= 1435:
            print(f"[NOTIF-DBG] uid={user_id} {key}={t} offset={offset} notif_min={notif_minute} local_min={local_minutes} sent={sent_key in sent_keys}", flush=True)

        if sent_key in sent_keys:
            continue
        if notif_minute != local_minutes:
            continue

        msg = _format_notification(lang, key, t, city, offset)
        try:
            await _bot_notif.send_message(user_id, msg, parse_mode="HTML")
            print(f"[NOTIF] ✓ uid={user_id} {key} offset={offset}", flush=True)
            new_keys.append(sent_key)
        except Exception as e:
            err = str(e).lower()
            if any(x in err for x in ("blocked", "deactivated", "not found", "chat not found")):
                try:
                    c = sqlite3.connect(str(USERS_DB))
                    c.execute("UPDATE users SET notif_enabled=0 WHERE user_id=?", (user_id,))
                    c.commit(); c.close()
                except Exception:
                    pass
            print(f"[NOTIF] ✗ uid={user_id} {key}: {e}", flush=True)

    if new_keys:
        sent_keys.update(new_keys)
        try:
            c = sqlite3.connect(str(USERS_DB))
            c.execute("UPDATE users SET notif_sent=? WHERE user_id=?",
                      (json.dumps({"date": today_str, "keys": list(sent_keys)}), user_id))
            c.commit(); c.close()
        except Exception:
            pass


async def _send_due_notifications():
    if not _bot_notif:
        return
    now_utc     = datetime.utcnow()
    utc_minutes = now_utc.hour * 60 + now_utc.minute
    today_str   = now_utc.strftime("%Y-%m-%d")
    try:
        conn = sqlite3.connect(str(USERS_DB))
        conn.row_factory = sqlite3.Row
        users = conn.execute("""
            SELECT user_id, language, last_lat, last_lon, last_city,
                   notif_timing, notif_tz_offset, notif_sent
            FROM users
            WHERE notif_enabled=1 AND last_lat IS NOT NULL AND last_lon IS NOT NULL
        """).fetchall()
        conn.close()
        users = [dict(u) for u in users]
    except Exception as e:
        print(f"[NOTIF] DB read error: {e}", flush=True)
        return
    print(f"[NOTIF] tick utc={utc_minutes} notif_users={len(users)}", flush=True)
    for user in users:
        try:
            await _process_user_notif(user, utc_minutes, today_str)
        except Exception as e:
            print(f"[NOTIF] Error for uid={user.get('user_id')}: {e}", flush=True)
        await asyncio.sleep(0.05)


def _get_random_hadith(lang: str) -> dict:
    """Returns dict with 'text' and 'source' for a random hadith from hadiths_muslim."""
    import random as _random
    db_path = BASE_DIR / "data" / "hadiths.db"
    if not db_path.exists():
        return {}
    _col = {"uz": "uz_text", "uz_cyr": "uz_cyr", "ru": "ru_text", "en": "en_text"}
    col = _col.get(lang, "uz_text")
    try:
        conn = sqlite3.connect(str(db_path))
        row = conn.execute(
            f"SELECT {col}, source FROM hadiths_muslim WHERE {col} IS NOT NULL AND {col} != '' ORDER BY RANDOM() LIMIT 1"
        ).fetchone()
        conn.close()
        if row:
            src_raw = row[1] or ""
            src = "Sahih Muslim" if "muslim" in src_raw.lower() else (src_raw or "Sahih Muslim")
            return {"text": row[0], "source": src}
    except Exception:
        pass
    return {}


def _format_daily_briefing_msg(
    lang: str, city: str, country: str,
    prayer_data: dict,
    weather_data,
    aqi_data,
    hadith_data: dict = None,
    send_minute: int = -1,
) -> str:
    L = lang if lang in ("uz", "uz_cyr", "ru", "en") else "uz"

    _GREET = {
        "uz":     "🕌 <b>Assalomu alaykum!</b>",
        "uz_cyr": "🕌 <b>Ассалому алайкум!</b>",
        "ru":     "🕌 <b>Ассаляму алейкум!</b>",
        "en":     "🕌 <b>Assalamu alaykum!</b>",
    }
    _PRAY_HDR = {
        "uz":     "🕌 <b>Bugungi namoz vaqtlari:</b>",
        "uz_cyr": "🕌 <b>Бугунги намоз вақтлари:</b>",
        "ru":     "🕌 <b>Намаз сегодня:</b>",
        "en":     "🕌 <b>Today's prayers:</b>",
    }
    _NEXT_LBL = {
        "uz": "Keyingi namoz", "uz_cyr": "Кейинги намоз",
        "ru": "Следующий намаз", "en": "Next prayer",
    }
    _LEFT_LBL = {
        "uz": "Qoldi", "uz_cyr": "Қолди",
        "ru": "Осталось", "en": "Remaining",
    }
    _HADITH_HDR = {
        "uz":     "📚 <b>Kun hadisi:</b>",
        "uz_cyr": "📚 <b>Кун ҳадиси:</b>",
        "ru":     "📚 <b>Хадис дня:</b>",
        "en":     "📚 <b>Hadith of the Day:</b>",
    }
    _BLESSING = {
        "uz":     "🤲 <i>Alloh bugungi kuningizni barakali qilsin!</i>",
        "uz_cyr": "🤲 <i>Аллоҳ бугунги куннингизни баракали қилсин!</i>",
        "ru":     "🤲 <i>Пусть Аллах сделает ваш день благодатным!</i>",
        "en":     "🤲 <i>May Allah bless your day!</i>",
    }
    _PRAYER_EMOJI = {
        "fajr": "🌅", "dhuhr": "☀️", "asr": "🌇", "maghrib": "🌆", "isha": "🌙",
    }

    def _time_to_min(t: str) -> int:
        try:
            h, m = t.split(":")
            return int(h) * 60 + int(m)
        except Exception:
            return -1

    def _fmt_left(minutes: int) -> str:
        h, m = divmod(minutes, 60)
        if L == "uz":
            parts = ([f"{h} soat"] if h else []) + ([f"{m} daqiqa"] if m else [])
            return " ".join(parts) or "0 daqiqa"
        if L == "uz_cyr":
            parts = ([f"{h} соат"] if h else []) + ([f"{m} дақиқа"] if m else [])
            return " ".join(parts) or "0 дақиқа"
        if L == "ru":
            parts = ([f"{h} ч"] if h else []) + ([f"{m} мин"] if m else [])
            return " ".join(parts) or "0 мин"
        parts = ([f"{h}h"] if h else []) + ([f"{m}m"] if m else [])
        return " ".join(parts) or "0m"

    lines = [_GREET.get(L, _GREET["uz"]), ""]

    # Location
    loc = city or prayer_data.get("city", "")
    ctry = country or prayer_data.get("country", "")
    if loc:
        lines.append(f"📍 {loc}{', ' + ctry if ctry else ''}")
        lines.append("")

    # Gregorian date + Hijri date on separate lines
    greg = datetime.utcnow().strftime("%d.%m.%Y")
    _hijri_raw = prayer_data.get("hijri") or {}
    hijri = _hijri_raw.get("full", "") if isinstance(_hijri_raw, dict) else str(_hijri_raw)
    if not hijri:
        hijri = prayer_data.get("hijri_date", "")
    lines.append(f"📅 {greg}")
    if hijri:
        lines.append(f"🌙 {hijri}")
    lines.append("")

    # Weather
    if weather_data:
        temp = weather_data.get("temp_c")
        icon = weather_data.get("icon", "🌤")
        if temp is not None:
            lines.append(f"{icon} Ob-havo: {temp}°C" if L in ("uz","uz_cyr") else
                         f"{icon} Погода: {temp}°C" if L == "ru" else
                         f"{icon} Weather: {temp}°C")
    # AQI
    if aqi_data:
        aqi_val  = aqi_data.get("aqi", 0)
        aqi_icon = aqi_data.get("icon", "🌬")
        lines.append(f"{aqi_icon} Havo sifati: AQI {aqi_val}" if L in ("uz","uz_cyr") else
                     f"{aqi_icon} Качество воздуха: AQI {aqi_val}" if L == "ru" else
                     f"{aqi_icon} Air quality: AQI {aqi_val}")
    if weather_data or aqi_data:
        lines.append("")

    # Prayer times — one per line, with emoji
    prayers = prayer_data.get("prayers", [])
    prayer_rows = [p for p in prayers if p.get("key", "").lower() != "sunrise"]
    if prayer_rows:
        lines.append(_PRAY_HDR.get(L, _PRAY_HDR["uz"]))
        for p in prayer_rows:
            key   = p.get("key", "").lower()
            name  = _PRAYER_NOTIF_NAMES.get(key, {}).get(L) or key.capitalize()
            emoji = _PRAYER_EMOJI.get(key, "🕌")
            lines.append(f"{emoji} {name}: {p.get('time', '')}")
        lines.append("")

        # Next prayer + countdown
        if send_minute >= 0:
            next_p = None
            left   = 0
            for p in prayer_rows:
                pm = _time_to_min(p.get("time", ""))
                if pm > send_minute:
                    next_p = p
                    left   = pm - send_minute
                    break
            if not next_p:
                next_p = prayer_rows[0]
                pm     = _time_to_min(next_p.get("time", ""))
                left   = (1440 - send_minute) + pm
            if next_p:
                key  = next_p.get("key", "").lower()
                name = _PRAYER_NOTIF_NAMES.get(key, {}).get(L) or key.capitalize()
                lines.append(f"🕐 {_NEXT_LBL.get(L,'Keyingi namoz')}: {name}")
                lines.append(f"⏳ {_LEFT_LBL.get(L,'Qoldi')}: {_fmt_left(left)}")
                lines.append("")

    # Hadith
    if hadith_data and hadith_data.get("text"):
        lines.append(_HADITH_HDR.get(L, _HADITH_HDR["uz"]))
        lines.append(hadith_data["text"])
        lines.append(f"📖 {hadith_data.get('source', 'Sahih Muslim')}")
        lines.append("")

    lines.append(_BLESSING.get(L, _BLESSING["uz"]))

    return "\n".join(lines)


async def _process_user_daily_briefing(user: dict, utc_minutes: int, today_str: str):
    user_id       = user["user_id"]
    lang          = user["language"] or "uz"
    lat           = user["last_lat"]
    lon           = user["last_lon"]
    city          = user["last_city"] or ""
    tz_offset     = user.get("notif_tz_offset") or 0
    brief_time    = user.get("daily_briefing_time") or "04:00"
    briefing_sent = user.get("briefing_sent") or ""

    if briefing_sent == today_str:
        return

    try:
        bh, bm = brief_time.split(":")
        briefing_minute = int(bh) * 60 + int(bm)
    except Exception:
        briefing_minute = 4 * 60

    local_minute = (utc_minutes + tz_offset) % 1440
    if local_minute != briefing_minute:
        return

    print(f"[DAILY BRIEFING] uid={user_id} time={brief_time} tz={tz_offset} local={local_minute}", flush=True)

    try:
        from domain.prayer.service import prayer_service
        prayer_data = await prayer_service.get_prayer_data(lat, lon, lang, 3)
    except Exception as e:
        print(f"[DAILY BRIEFING FAILED] uid={user_id}: prayer fetch error: {e}", flush=True)
        return
    if not prayer_data:
        print(f"[DAILY BRIEFING FAILED] uid={user_id}: no prayer data", flush=True)
        return

    weather_data = None
    aqi_data     = None
    try:
        from domain.prayer.extras import fetch_weather, fetch_aqi
        results = await asyncio.gather(
            fetch_weather(lat, lon, lang),
            fetch_aqi(lat, lon, lang),
            return_exceptions=True,
        )
        weather_data = results[0] if not isinstance(results[0], Exception) else None
        aqi_data     = results[1] if not isinstance(results[1], Exception) else None
    except Exception:
        pass

    country = prayer_data.get("country", "") or ""
    if not city:
        city = prayer_data.get("city", "")

    hadith_data = _get_random_hadith(lang)

    msg = _format_daily_briefing_msg(
        lang, city, country, prayer_data,
        weather_data, aqi_data,
        hadith_data=hadith_data,
        send_minute=local_minute,
    )

    try:
        await _bot_notif.send_message(user_id, msg, parse_mode="HTML")
        print(f"[DAILY BRIEFING SENT] uid={user_id}", flush=True)
        conn = sqlite3.connect(str(USERS_DB))
        conn.execute("UPDATE users SET briefing_sent=? WHERE user_id=?", (today_str, user_id))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[DAILY BRIEFING FAILED] uid={user_id}: {e}", flush=True)
        err = str(e).lower()
        if any(x in err for x in ("blocked", "deactivated", "not found", "chat not found")):
            try:
                c = sqlite3.connect(str(USERS_DB))
                c.execute("UPDATE users SET daily_briefing_enabled=0 WHERE user_id=?", (user_id,))
                c.commit(); c.close()
            except Exception:
                pass


async def _send_due_daily_briefings():
    if not _bot_notif:
        return
    now_utc     = datetime.utcnow()
    utc_minutes = now_utc.hour * 60 + now_utc.minute
    today_str   = now_utc.strftime("%Y-%m-%d")
    try:
        conn = sqlite3.connect(str(USERS_DB))
        conn.row_factory = sqlite3.Row
        users = conn.execute("""
            SELECT user_id, language, last_lat, last_lon, last_city,
                   daily_briefing_time, notif_tz_offset, briefing_sent
            FROM users
            WHERE daily_briefing_enabled=1
              AND last_lat IS NOT NULL AND last_lon IS NOT NULL
        """).fetchall()
        conn.close()
        users = [dict(u) for u in users]
    except Exception as e:
        print(f"[DAILY BRIEFING] DB read error: {e}", flush=True)
        return
    for user in users:
        try:
            await _process_user_daily_briefing(user, utc_minutes, today_str)
        except Exception as e:
            print(f"[DAILY BRIEFING] Error uid={user.get('user_id')}: {e}", flush=True)
        await asyncio.sleep(0.05)


async def _notification_scheduler():
    """Background asyncio task — fires every 60 s. Never crashes the server."""
    global _SCHED_STATUS
    _SCHED_STATUS["running"] = True
    print("[SCHED] Scheduler started", flush=True)

    # Daily backup ticker (runs once per day)
    _last_backup_day: str = ""

    while True:
        tick_start = time.monotonic()
        now_utc    = datetime.utcnow()
        utc_min    = now_utc.hour * 60 + now_utc.minute
        today_str  = now_utc.strftime("%Y-%m-%d")

        # Daily backup (once per day at ~00:01 UTC)
        if today_str != _last_backup_day and utc_min >= 1:
            _backup_db()
            _last_backup_day = today_str

        print(f"[SCHED] tick={_SCHED_STATUS['ticks']} utc={utc_min}", flush=True)

        try:
            await _send_due_notifications()
        except Exception as e:
            _SCHED_STATUS["errors"] += 1
            _flog.error(f"Notification scheduler: {e}", exc_info=True)
            print(f"[SCHED] Notif error: {e}", flush=True)

        try:
            await _send_due_daily_briefings()
        except Exception as e:
            _SCHED_STATUS["errors"] += 1
            _flog.error(f"Briefing scheduler: {e}", exc_info=True)
            print(f"[SCHED] Brief error: {e}", flush=True)

        _SCHED_STATUS["ticks"]     += 1
        _SCHED_STATUS["last_tick"]  = now_utc.isoformat()

        # Sleep for the remainder of 60 s (drift-safe)
        elapsed = time.monotonic() - tick_start
        await asyncio.sleep(max(0, 60 - elapsed))


# ── Bot (webhook mode — only active when WEBAPP_URL is HTTPS) ──────────────
_bot = None
_dp  = None

def _is_production() -> bool:
    on_render = os.getenv("RENDER", "").lower() == "true"
    webhook   = os.getenv("WEBHOOK_MODE", "").lower() == "true"
    return bool((on_render or webhook) and BOT_TOKEN)

async def _init_bot():
    global _bot, _dp
    import socket
    import aiohttp
    from aiogram import Bot, Dispatcher, F, types
    from aiogram.client.session.aiohttp import AiohttpSession
    from aiogram.filters import Command, CommandStart
    from aiogram.types import (
        InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo, BotCommand
    )

    _TG_HOST = "api.telegram.org"
    _TG_IPS  = ["149.154.167.220", "149.154.166.110", "149.154.175.53"]

    class _BypassResolver:
        async def resolve(self, host, port=0, family=socket.AF_INET):
            if host == _TG_HOST:
                print(f"[DNS] {host} → {_TG_IPS[0]}", flush=True)
                return [{"hostname": host, "host": _TG_IPS[0],
                         "port": port, "family": socket.AF_INET,
                         "proto": 0, "flags": 0}]
            resolver = aiohttp.ThreadedResolver()
            return await resolver.resolve(host, port, family)
        async def close(self):
            pass

    _proxy = os.getenv("PROXY_URL", "").strip() or None
    if _proxy:
        session = AiohttpSession(proxy=_proxy)
        print(f"[OK] Bot proxy: {_proxy}", flush=True)
    else:
        session = AiohttpSession()
        session._connector_init["resolver"] = _BypassResolver()
        print(f"[OK] Bot DNS bypass: {_TG_HOST} → {_TG_IPS[0]}", flush=True)

    _bot = Bot(token=BOT_TOKEN, session=session)
    _dp  = Dispatcher()

    @_dp.message(CommandStart())
    async def cmd_start(message: types.Message):
        u = message.from_user
        lang = u.language_code or "uz"
        print(f"[START] user_id={u.id} lang={lang} @{u.username or ''}", flush=True)
        try:
            _track_user(u.id, u.username or "", u.first_name or "", lang)
        except Exception as e:
            _flog.error(f"/start _track_user uid={u.id}: {e}", exc_info=True)
        try:
            ts = int(time.time())
            app_url = f"https://islamtimeworldbot-dbup.onrender.com/?v=90&t={ts}&user_id={u.id}"
            kb = InlineKeyboardMarkup(inline_keyboard=[[
                InlineKeyboardButton(
                    text="🕌 Ilovani ochish",
                    web_app=WebAppInfo(url=app_url),
                )
            ]])
            await message.answer(
                "Assalomu alaykum! IslamTimeWorldBot ishlayapti.",
                reply_markup=kb,
            )
            print(f"[START] user_id={u.id} lang={lang} success=True", flush=True)
        except Exception as e:
            _flog.error(f"/start send uid={u.id}: {e}", exc_info=True)
            print(f"[START] user_id={u.id} lang={lang} success=False err={e}", flush=True)
            try:
                await message.answer("Assalomu alaykum! IslamTimeWorldBot ishlayapti.")
            except Exception:
                pass

    @_dp.message(Command("stats"))
    async def cmd_stats(message: types.Message):
        if message.from_user.id not in ADMIN_IDS:
            await message.answer("⛔ Sizda ushbu buyruqdan foydalanish huquqi yo'q.")
            return
        s = _get_stats()
        if "error" in s:
            await message.answer(f"❌ {s['error']}")
            return
        txt  = "📊 <b>IslamTimeWorldBot Stats</b>\n\n"
        txt += f"👥 Jami: <b>{s['total']}</b>\n"
        txt += f"🆕 Bugun yangi: <b>{s['new_today']}</b>\n"
        txt += f"📱 Bugun faol: <b>{s['active_today']}</b>\n\n"
        txt += "🌐 <b>Tillar:</b>\n"
        for lang, cnt in s['by_lang']:
            txt += f"  {lang}: {cnt}\n"
        txt += "\n👤 <b>So'nggi 10:</b>\n"
        for fn, un, lg, jt in s['last_10']:
            un_str = f" @{un}" if un else ""
            txt += f"  {fn or '?'}{un_str} ({lg or '?'}) — {jt}\n"
        await message.answer(txt, parse_mode="HTML")

    @_dp.message(Command("reset"))
    async def cmd_reset(message: types.Message):
        kb = InlineKeyboardMarkup(inline_keyboard=[[
            InlineKeyboardButton(
                text="🔄 Reset & Restart",
                web_app=WebAppInfo(url=WEBAPP_URL + "?reset=1"),
            )
        ]])
        await message.answer(
            "🔄 <b>Onboarding reset</b>\n\n"
            "Ilovani qayta boshlash uchun tugmani bosing.\n"
            "<i>Tap to clear saved settings and restart from Language screen.</i>",
            parse_mode="HTML",
            reply_markup=kb,
        )

    @_dp.message(Command("users"))
    async def cmd_users(message: types.Message):
        if message.from_user.id not in ADMIN_IDS:
            await message.answer("⛔ Sizda ushbu buyruqdan foydalanish huquqi yo'q.")
            return
        s = _get_stats()
        if "error" in s:
            await message.answer(f"❌ {s['error']}")
            return
        txt = f"👥 <b>So'nggi foydalanuvchilar:</b>\n\n"
        for fn, un, lg, jt in s["last_10"]:
            un_str = f" @{un}" if un else ""
            txt += f"  {fn or '?'}{un_str} [{lg or '?'}] — {jt}\n"
        await message.answer(txt, parse_mode="HTML")

    @_dp.message(Command("broadcast"))
    async def cmd_broadcast(message: types.Message):
        if message.from_user.id not in ADMIN_IDS:
            await message.answer("⛔ Sizda ushbu buyruqdan foydalanish huquqi yo'q.")
            return
        parts = message.text.split(maxsplit=1)
        if len(parts) < 2 or not parts[1].strip():
            await message.answer(
                "📢 <b>Broadcast:</b>\n<code>/broadcast Xabar matni</code>",
                parse_mode="HTML",
            )
            return
        text_to_send = parts[1].strip()
        try:
            conn = sqlite3.connect(str(USERS_DB))
            user_ids = [r[0] for r in conn.execute("SELECT user_id FROM users").fetchall()]
            conn.close()
        except Exception:
            user_ids = []
        if not user_ids:
            await message.answer("📭 Hali foydalanuvchi yo'q.")
            return
        status_msg = await message.answer(f"📤 {len(user_ids)} ta foydalanuvchiga yuborilmoqda...")
        sent = blocked = failed = 0
        for uid in user_ids:
            try:
                await _bot.send_message(uid, text_to_send, parse_mode="HTML")
                sent += 1
            except Exception as e:
                err = str(e).lower()
                if "blocked" in err or "deactivated" in err or "chat not found" in err:
                    blocked += 1
                else:
                    failed += 1
            await asyncio.sleep(0.05)
        await _bot.edit_message_text(
            f"✅ <b>Broadcast yakunlandi</b>\n\n"
            f"📤 Yuborildi: {sent}\n🚫 Bloklangan: {blocked}\n❌ Xatolik: {failed}",
            chat_id=message.chat.id, message_id=status_msg.message_id,
            parse_mode="HTML",
        )

    @_dp.message(Command("testbrief"))
    async def cmd_testbrief(message: types.Message):
        if message.from_user.id not in ADMIN_IDS:
            await message.answer("⛔ Sizda ushbu buyruqdan foydalanish huquqi yo'q.")
            return
        uid = message.from_user.id
        try:
            conn = sqlite3.connect(str(USERS_DB))
            conn.row_factory = sqlite3.Row
            row = conn.execute(
                "SELECT user_id, language, last_lat, last_lon, last_city, notif_tz_offset "
                "FROM users WHERE user_id=?", (uid,)
            ).fetchone()
            conn.close()
        except Exception as e:
            await message.answer(f"❌ DB error: {e}")
            return
        if not row or row["last_lat"] is None:
            await message.answer("❌ Joylashuv saqlanmagan. Avval ilovada joylashuvni kiriting.")
            return
        user = dict(row)
        user.update({
            "daily_briefing_time": "00:00",
            "briefing_sent": "",
        })
        now_utc     = datetime.utcnow()
        utc_minutes = now_utc.hour * 60 + now_utc.minute
        tz_offset   = user.get("notif_tz_offset") or 0
        # Override: force local_minute == briefing_minute by setting briefing_minute = local_minute
        local_minute = (utc_minutes + tz_offset) % 1440
        user["daily_briefing_time"] = f"{local_minute // 60:02d}:{local_minute % 60:02d}"
        await message.answer("⏳ Test briefing yuborilmoqda...")
        try:
            await _process_user_daily_briefing(user, utc_minutes, "test-" + now_utc.strftime("%H%M%S"))
            await message.answer("✅ Test briefing yuborildi!")
        except Exception as e:
            await message.answer(f"❌ Xatolik: {e}")

    @_dp.message(Command("dbcheck"))
    async def cmd_dbcheck(message: types.Message):
        print(f"[CMD] RECEIVED: /dbcheck from uid={message.from_user.id}", flush=True)
        if message.from_user.id not in ADMIN_IDS:
            await message.answer("⛔ Ruxsat yo'q.")
            return
        uid = message.from_user.id
        try:
            conn = sqlite3.connect(str(USERS_DB))
            conn.row_factory = sqlite3.Row
            row = conn.execute(
                "SELECT user_id, notif_enabled, notif_timing, notif_tz_offset, "
                "last_lat, last_lon, last_city, last_active FROM users WHERE user_id=?",
                (uid,)
            ).fetchone()
            total = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
            notif_total = conn.execute(
                "SELECT COUNT(*) FROM users WHERE notif_enabled=1 AND last_lat IS NOT NULL"
            ).fetchone()[0]
            conn.close()
        except Exception as e:
            await message.answer(f"❌ DB xatolik: {e}")
            return
        if not row:
            await message.answer(
                f"❌ <b>Sizning user_id={uid} DB da topilmadi!</b>\n\n"
                f"Ilovani oching → namoz vaqtlariga kiring → joylashuvni ruxsat bering.\n"
                f"Keyin sozlamalarda push-ni yoqing.",
                parse_mode="HTML"
            )
            return
        r = dict(row)
        lat_str  = f"{r['last_lat']:.4f}" if r['last_lat'] is not None else "NULL ❌"
        lon_str  = f"{r['last_lon']:.4f}" if r['last_lon'] is not None else "NULL ❌"
        en_str   = "✅ Yoqilgan" if r['notif_enabled'] else "❌ O'chirilgan"
        txt = (
            f"🗄 <b>DB holati</b>\n\n"
            f"👤 user_id: <code>{r['user_id']}</code>\n"
            f"🔔 notif_enabled: <b>{en_str}</b>\n"
            f"⏱ timing: <code>{r['notif_timing']}</code>\n"
            f"🌍 tz_offset: <b>{r['notif_tz_offset']} daq</b>\n"
            f"📍 lat: <code>{lat_str}</code>\n"
            f"📍 lon: <code>{lon_str}</code>\n"
            f"🏙 city: <b>{r['last_city'] or '—'}</b>\n"
            f"🕐 last_active: <b>{r['last_active']}</b>\n\n"
            f"📊 Jami foydalanuvchilar: <b>{total}</b>\n"
            f"🔔 Bildirishnoma tayyor: <b>{notif_total}</b>"
        )
        await message.answer(txt, parse_mode="HTML")

    @_dp.message(Command("testnotif"))
    async def cmd_testnotif(message: types.Message):
        print(f"[CMD] RECEIVED: /testnotif from uid={message.from_user.id}", flush=True)
        if message.from_user.id not in ADMIN_IDS:
            await message.answer("⛔ Ruxsat yo'q.")
            return
        uid = message.from_user.id
        try:
            conn = sqlite3.connect(str(USERS_DB))
            conn.row_factory = sqlite3.Row
            row = conn.execute(
                "SELECT user_id, language, last_lat, last_lon, last_city, "
                "notif_enabled, notif_timing, notif_tz_offset FROM users WHERE user_id=?",
                (uid,)
            ).fetchone()
            conn.close()
        except Exception as e:
            await message.answer(f"❌ DB xatolik: {e}")
            return
        if not row:
            await message.answer("❌ DB da topilmadingiz. Avval ilovani oching va joylashuvni ruxsat bering.")
            return
        r = dict(row)
        if not r["last_lat"]:
            await message.answer("❌ Joylashuv DB da yo'q (last_lat=NULL). Avval namoz ekraniga kiring.")
            return
        try:
            msg = _format_notification(r["language"] or "uz", "isha", "21:30", r["last_city"] or "", 0)
            await _bot_notif.send_message(uid, msg, parse_mode="HTML")
            await message.answer("✅ Test bildirishnoma yuborildi! Yuqoridagi xabarni tekshiring.")
        except Exception as e:
            await message.answer(f"❌ Yuborish xatosi: {e}")

    # ── /health ───────────────────────────────────────────────────────────────
    @_dp.message(Command("health"))
    async def cmd_health_bot(message: types.Message):
        if message.from_user.id not in ADMIN_IDS:
            await message.answer("⛔ Ruxsat yo'q.")
            return
        uptime_s = int(time.monotonic() - _START_TIME)
        h, r = divmod(uptime_s, 3600); m, s = divmod(r, 60)
        try:
            conn = _db_connect(); conn.row_factory = sqlite3.Row
            cnt   = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
            bcnt  = conn.execute("SELECT COUNT(*) FROM users WHERE daily_briefing_enabled=1").fetchone()[0]
            ncnt  = conn.execute("SELECT COUNT(*) FROM users WHERE notif_enabled=1 AND last_lat IS NOT NULL").fetchone()[0]
            conn.close()
            db_str = f"✅ OK · {cnt} users · {bcnt} briefing ON · {ncnt} notif ON"
        except Exception as e:
            db_str = f"❌ {e}"
        sched_ok  = _SCHED_STATUS["running"]
        sched_str = (f"✅ Running · ticks={_SCHED_STATUS['ticks']} · errors={_SCHED_STATUS['errors']}"
                     if sched_ok else "❌ Not running")
        bot_str   = "✅ Webhook active" if _bot else "⚠️ Not initialized"
        wh_url    = (_WEBHOOK_INFO.get("url") or "?")
        wh_ok     = "✅" if _WEBHOOK_INFO.get("verified") else "⚠️"
        await message.answer(
            f"🏥 <b>IslamTimeWorldBot Health</b>\n\n"
            f"⏱ Uptime: <b>{h}h {m}m {s}s</b>\n"
            f"🤖 Bot: {bot_str}\n"
            f"📅 Scheduler: {sched_str}\n"
            f"🗄 DB: {db_str}\n"
            f"🔗 Webhook: {wh_ok} <code>{wh_url[-50:]}</code>",
            parse_mode="HTML",
        )

    # ── /restartinfo ──────────────────────────────────────────────────────────
    @_dp.message(Command("restartinfo"))
    async def cmd_restartinfo(message: types.Message):
        if message.from_user.id not in ADMIN_IDS:
            await message.answer("⛔ Ruxsat yo'q.")
            return
        uptime_s = int(time.monotonic() - _START_TIME)
        h, r = divmod(uptime_s, 3600); m, s = divmod(r, 60)
        started = _START_DT.strftime("%Y-%m-%d %H:%M:%S UTC")
        lt      = _SCHED_STATUS.get("last_tick") or "—"
        await message.answer(
            f"🔄 <b>Restart Info</b>\n\n"
            f"🚀 Started: <b>{started}</b>\n"
            f"⏱ Uptime: <b>{h}h {m}m {s}s</b>\n"
            f"📊 Ticks: <b>{_SCHED_STATUS['ticks']}</b>\n"
            f"⚠️ Sched errors: <b>{_SCHED_STATUS['errors']}</b>\n"
            f"🕐 Last tick: <code>{lt[:19]}</code>\n"
            f"✅ Webhook verified: <b>{'Yes' if _WEBHOOK_INFO.get('verified') else 'No'}</b>",
            parse_mode="HTML",
        )

    # ── /logs ─────────────────────────────────────────────────────────────────
    @_dp.message(Command("logs"))
    async def cmd_logs(message: types.Message):
        if message.from_user.id not in ADMIN_IDS:
            await message.answer("⛔ Ruxsat yo'q.")
            return
        try:
            if _LOG_FILE.exists():
                lines = _LOG_FILE.read_text(encoding="utf-8", errors="replace").splitlines()
                last  = "\n".join(lines[-30:]) if lines else "(empty)"
            else:
                last = "(no error log yet — all good! 🎉)"
        except Exception as e:
            last = f"Read error: {e}"
        await message.answer(
            f"📋 <b>Last errors (server_err.log):</b>\n<pre>{last[-3500:]}</pre>",
            parse_mode="HTML",
        )

    @_dp.message(F.web_app_data)
    async def on_webapp_data(message: types.Message):
        try:
            data = json.loads(message.web_app_data.data)
            action = data.get("action")
            uid = message.from_user.id
            if action == "set_language":
                lang = data.get("lang", "uz")
                try:
                    c = sqlite3.connect(str(USERS_DB))
                    c.execute("UPDATE users SET language=? WHERE user_id=?", (lang, uid))
                    c.commit(); c.close()
                    print(f"[LANG] uid={uid} language={lang}", flush=True)
                except Exception:
                    pass
                await message.answer(f"✅ Til saqlandi: <b>{lang}</b>", parse_mode="HTML")
            elif action == "sync_settings":
                lang = data.get("lang", "")
                if lang:
                    try:
                        c = sqlite3.connect(str(USERS_DB))
                        c.execute("UPDATE users SET language=? WHERE user_id=?", (lang, uid))
                        c.commit(); c.close()
                        print(f"[LANG] sync uid={uid} language={lang}", flush=True)
                    except Exception:
                        pass
        except Exception:
            pass

    print("[OK] ADMIN HANDLERS LOADED: health restartinfo logs dbcheck testnotif testbrief", flush=True)

    try:
        await _bot.set_my_commands([
            BotCommand(command="start", description="🕌 IslamTimeWorldBot ni ochish"),
            BotCommand(command="reset", description="🔄 Sozlamalarni qayta boshlash"),
        ])
        admin_cmds = [
            BotCommand(command="start",       description="🕌 IslamTimeWorldBot ni ochish"),
            BotCommand(command="health",      description="🏥 Bot va server holati"),
            BotCommand(command="restartinfo", description="🔄 Uptime va restart ma'lumotlari"),
            BotCommand(command="users",       description="👥 Foydalanuvchilar ro'yxati"),
            BotCommand(command="dbcheck",     description="🗄 DB holati"),
            BotCommand(command="testbrief",   description="🌤 Test daily briefing"),
            BotCommand(command="testnotif",   description="🔔 Test bildirishnoma"),
            BotCommand(command="logs",        description="📋 So'nggi xatolar"),
            BotCommand(command="broadcast",   description="📢 Barcha userlarga xabar"),
            BotCommand(command="reset",       description="🔄 Sozlamalarni qayta boshlash"),
        ]
        from aiogram.types import BotCommandScopeChat
        for admin_id in ADMIN_IDS:
            try:
                await _bot.set_my_commands(admin_cmds, scope=BotCommandScopeChat(chat_id=admin_id))
            except Exception:
                pass
        print("[OK] set_my_commands done", flush=True)
    except Exception as e:
        print(f"[WARN] set_my_commands failed: {e}", flush=True)

    base_url = WEBAPP_URL.rstrip("/") if WEBAPP_URL.startswith("https://") else "https://islamtimeworldbot-dbup.onrender.com"
    webhook_url = f"{base_url}/webhook/{BOT_TOKEN}"
    print(f"[BOT] webhook_url={webhook_url[:80]}", flush=True)
    try:
        await _bot.set_webhook(webhook_url, drop_pending_updates=False)
        print(f"[OK] Bot webhook set", flush=True)
    except Exception as e:
        _flog.error(f"set_webhook failed: {e}", exc_info=True)
        print(f"[WARN] set_webhook failed (handlers still active): {e}", flush=True)

    # Verify webhook via getWebhookInfo
    try:
        wh_info = await _bot.get_webhook_info()
        _WEBHOOK_INFO["url"]      = wh_info.url
        _WEBHOOK_INFO["set_at"]   = datetime.utcnow().isoformat()
        _WEBHOOK_INFO["verified"] = (wh_info.url == webhook_url)
        pending = wh_info.pending_update_count or 0
        print(f"[OK] Webhook verified: match={_WEBHOOK_INFO['verified']} url={wh_info.url[-40:]} pending={pending}", flush=True)
    except Exception as e:
        print(f"[WARN] Webhook verify failed: {e}", flush=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    _init_users_db()
    _backup_db()                                      # daily backup on every (re)start
    await _init_notif_bot()                           # always — needed for notifications
    if _is_production():
        await _init_bot()                             # webhook + commands (prod only)
    notif_task = asyncio.create_task(_notification_scheduler())
    print(f"[OK] Server ready — uptime tracking started", flush=True)
    yield
    notif_task.cancel()
    try:
        await notif_task
    except asyncio.CancelledError:
        pass
    if _bot:
        await _bot.delete_webhook()
        await _bot.session.close()
    if _bot_notif and _bot_notif is not _bot:
        try:
            await _bot_notif.session.close()
        except Exception:
            pass


# ── App ────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="IslamTimeWorldBot WebApp",
    docs_url="/docs",
    redoc_url=None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ── Static assets ──────────────────────────────────────────────────────────
app.mount("/css",    StaticFiles(directory=str(WEBAPP_DIR / "css")),    name="css")
app.mount("/js",     StaticFiles(directory=str(WEBAPP_DIR / "js")),     name="js")
app.mount("/data",   StaticFiles(directory=str(WEBAPP_DIR / "data")),   name="webapp_data")
app.mount("/assets", StaticFiles(directory=str(WEBAPP_DIR / "assets")), name="assets")

# ── WebApp entry point ─────────────────────────────────────────────────────
@app.get("/")
async def index():
    return FileResponse(
        str(WEBAPP_DIR / "index.html"),
        headers={
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            "Pragma":        "no-cache",
            "Expires":       "0",
        },
    )

# ── Dev test page ──────────────────────────────────────────────────────────
@app.get("/test")
async def test_page():
    return FileResponse(str(WEBAPP_DIR / "test_integration.html"))

@app.get("/prayer-test")
async def prayer_test_page():
    return FileResponse(str(WEBAPP_DIR / "prayer_test.html"))

# ── Health check ───────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    uptime_s = int(time.monotonic() - _START_TIME)
    h, r = divmod(uptime_s, 3600); m, s = divmod(r, 60)
    # DB check
    db_status = "ok"
    db_users  = 0
    try:
        conn = sqlite3.connect(str(USERS_DB), timeout=3)
        db_users = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        conn.close()
    except Exception as e:
        db_status = f"error: {e}"
    return JSONResponse({
        "status":       "ok",
        "service":      "IslamTimeWorldBot",
        "uptime":       f"{h}h {m}m {s}s",
        "started_at":   _START_DT.isoformat(),
        "db_status":    db_status,
        "db_users":     db_users,
        "bot_status":   "webhook_active" if _bot else "not_initialized",
        "scheduler":    {
            "running":   _SCHED_STATUS["running"],
            "ticks":     _SCHED_STATUS["ticks"],
            "last_tick": _SCHED_STATUS["last_tick"],
            "errors":    _SCHED_STATUS["errors"],
        },
        "webhook": {
            "url":      (_WEBHOOK_INFO.get("url") or "")[-60:],
            "verified": _WEBHOOK_INFO.get("verified", False),
            "set_at":   _WEBHOOK_INFO.get("set_at"),
        },
    })

# ── Telegram Bot Webhook ──────────────────────────────────────────────────
@app.post("/webhook/{token}")
async def telegram_webhook(token: str, request: Request):
    if token != BOT_TOKEN:
        return JSONResponse({"error": "forbidden"}, status_code=403)

    try:
        data = await request.json()
    except Exception as e:
        print(f"[WH] JSON parse error: {e}", flush=True)
        return {"ok": True}

    # ── Direct /start handler (uses _bot_notif, bypasses dispatcher) ──────
    msg = data.get("message") or {}
    txt = msg.get("text", "") or ""
    if txt == "/start" or txt.startswith("/start "):
        chat_id = msg.get("chat", {}).get("id")
        from_u  = msg.get("from", {})
        user_id = from_u.get("id")
        lang    = from_u.get("language_code") or "uz"
        print(f"[START] user_id={user_id} lang={lang}", flush=True)
        # track user safely
        try:
            if user_id:
                _track_user(
                    user_id,
                    from_u.get("username") or "",
                    from_u.get("first_name") or "",
                    lang,
                )
        except Exception as te:
            _flog.error(f"[START] track user_id={user_id}: {te}", exc_info=True)
        # send reply via _bot_notif (always initialized)
        sent = False
        if chat_id and _bot_notif:
            try:
                from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
                ts      = int(time.time())
                app_url = f"https://islamtimeworldbot-dbup.onrender.com/?v=90&t={ts}&user_id={user_id}"
                kb = InlineKeyboardMarkup(inline_keyboard=[[
                    InlineKeyboardButton(text="🕌 Ilovani ochish", web_app=WebAppInfo(url=app_url))
                ]])
                await _bot_notif.send_message(
                    chat_id,
                    "Assalomu alaykum! IslamTimeWorldBot ishlayapti.",
                    reply_markup=kb,
                )
                sent = True
                print(f"[START] user_id={user_id} success=True", flush=True)
            except Exception as e:
                _flog.error(f"[START] send user_id={user_id}: {e}", exc_info=True)
                print(f"[START] user_id={user_id} btn_failed={e}", flush=True)
                # ultimate fallback — plain text, no keyboard
                try:
                    await _bot_notif.send_message(chat_id, "Assalomu alaykum! IslamTimeWorldBot ishlayapti.")
                    sent = True
                    print(f"[START] user_id={user_id} fallback=True", flush=True)
                except Exception as e2:
                    _flog.error(f"[START] fallback user_id={user_id}: {e2}", exc_info=True)
                    print(f"[START] user_id={user_id} success=False err={e2}", flush=True)
        if not sent:
            print(f"[START] user_id={user_id} NOT SENT (bot_notif={_bot_notif is not None} chat_id={chat_id})", flush=True)
        return {"ok": True}

    # ── All other updates → aiogram dispatcher ─────────────────────────────
    if _bot and _dp:
        from aiogram.types import Update
        try:
            update   = Update.model_validate(data)
            uid      = upd_type = "?"
            if update.message:
                uid      = update.message.from_user.id if update.message.from_user else "?"
                upd_type = f"msg:{(update.message.text or '')[:30]}"
            elif update.callback_query:
                upd_type = "callback"
            elif update.web_app_data:
                upd_type = "web_app_data"
            print(f"[WH] id={update.update_id} uid={uid} type={upd_type}", flush=True)
            await _dp.feed_update(_bot, update)
        except Exception as e:
            _flog.error(f"[WH] feed_update: {e}", exc_info=True)
            print(f"[WH] Error: {e}", flush=True)
    else:
        upd_id = data.get("update_id", "?")
        print(f"[WH] update_id={upd_id} dp=None — skipped", flush=True)
    return {"ok": True}


# ── User Location API ─────────────────────────────────────────────────────
@app.get("/api/user/location")
async def api_get_user_location(user_id: int = Query(...)):
    try:
        conn = sqlite3.connect(str(USERS_DB))
        row = conn.execute(
            "SELECT last_lat, last_lon, last_city FROM users WHERE user_id=?",
            (user_id,)
        ).fetchone()
        conn.close()
        if row and row[0] is not None and row[1] is not None:
            return {"lat": row[0], "lon": row[1], "city": row[2] or ""}
        return {"lat": None, "lon": None, "city": ""}
    except Exception as e:
        print(f"[WARN] api_get_user_location: {e}", flush=True)
        return {"lat": None, "lon": None, "city": ""}


@app.post("/api/user/location")
async def api_save_user_location(request: Request):
    try:
        data    = await request.json()
        user_id = int(data.get("user_id", 0))
        lat     = float(data.get("lat", 0))
        lon     = float(data.get("lon", 0))
        city    = str(data.get("city", ""))
        if not user_id:
            return {"ok": False, "error": "missing user_id"}
        print(f"[LOC] user_id={user_id} lat={lat:.4f} lon={lon:.4f} city={city}", flush=True)
        conn = sqlite3.connect(str(USERS_DB))
        conn.execute("""
            INSERT INTO users (user_id, joined_at, last_active, last_lat, last_lon, last_city)
            VALUES (?, datetime('now'), datetime('now'), ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                last_lat=excluded.last_lat,
                last_lon=excluded.last_lon,
                last_city=excluded.last_city,
                last_active=excluded.last_active
        """, (user_id, lat, lon, city))
        conn.commit()
        conn.close()
        return {"ok": True}
    except Exception as e:
        print(f"[WARN] api_save_user_location: {e}", flush=True)
        return {"ok": False, "error": str(e)}


# ── User Notification Prefs API ───────────────────────────────────────────
@app.post("/api/user/notifications")
async def api_save_notif_prefs(request: Request):
    try:
        data      = await request.json()
        user_id   = int(data.get("user_id", 0))
        enabled   = int(data.get("enabled", 0))
        timing    = json.dumps(data.get("timing", {}))
        tz_offset = int(data.get("tz_offset", 0))
        if not user_id:
            return {"ok": False, "error": "missing user_id"}
        conn = sqlite3.connect(str(USERS_DB))
        conn.execute("""
            INSERT INTO users (user_id, joined_at, last_active, notif_enabled, notif_timing, notif_tz_offset)
            VALUES (?, datetime('now'), datetime('now'), ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                notif_enabled=excluded.notif_enabled,
                notif_timing=excluded.notif_timing,
                notif_tz_offset=excluded.notif_tz_offset,
                last_active=excluded.last_active
        """, (user_id, enabled, timing, tz_offset))
        conn.commit()
        conn.close()
        print(f"[NOTIF] Prefs upserted: uid={user_id} enabled={enabled} timing={timing} tz={tz_offset}", flush=True)
        return {"ok": True}
    except Exception as e:
        print(f"[WARN] api_save_notif_prefs: {e}", flush=True)
        return {"ok": False, "error": str(e)}


# ── Daily Briefing Prefs API ─────────────────────────────────────────────
@app.post("/api/user/daily-briefing")
async def api_save_daily_briefing(request: Request):
    try:
        data      = await request.json()
        user_id   = int(data.get("user_id", 0))
        enabled   = int(bool(data.get("enabled", True)))
        time_str  = str(data.get("time", "04:00"))[:5]
        tz_offset = int(data.get("tz_offset", 0))
        if not user_id:
            return {"ok": False, "error": "missing user_id"}
        conn = sqlite3.connect(str(USERS_DB))
        conn.execute("""
            INSERT INTO users (user_id, joined_at, last_active,
                daily_briefing_enabled, daily_briefing_time, notif_tz_offset)
            VALUES (?, datetime('now'), datetime('now'), ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                daily_briefing_enabled=excluded.daily_briefing_enabled,
                daily_briefing_time=excluded.daily_briefing_time,
                notif_tz_offset=excluded.notif_tz_offset,
                last_active=datetime('now')
        """, (user_id, enabled, time_str, tz_offset))
        conn.commit()
        conn.close()
        print(f"[DAILY BRIEFING] Prefs saved: uid={user_id} enabled={enabled} time={time_str}", flush=True)
        return {"ok": True}
    except Exception as e:
        print(f"[WARN] api_save_daily_briefing: {e}", flush=True)
        return {"ok": False, "error": str(e)}


# ── Admin REST API (called by local bot.py → proxies to Render DB) ────────
@app.get("/api/admin/dbcheck")
async def api_admin_dbcheck(admin_id: int = Query(0)):
    if admin_id not in ADMIN_IDS:
        return JSONResponse({"error": "forbidden"}, status_code=403)
    try:
        conn = sqlite3.connect(str(USERS_DB))
        conn.row_factory = sqlite3.Row
        row = conn.execute(
            "SELECT user_id, notif_enabled, notif_timing, notif_tz_offset, "
            "last_lat, last_lon, last_city, last_active FROM users WHERE user_id=?",
            (admin_id,)
        ).fetchone()
        total       = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        notif_ready = conn.execute(
            "SELECT COUNT(*) FROM users WHERE notif_enabled=1 AND last_lat IS NOT NULL"
        ).fetchone()[0]
        conn.close()
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)
    return JSONResponse({
        "my_row":     dict(row) if row else None,
        "total":      total,
        "notif_ready": notif_ready,
    })


@app.post("/api/admin/testnotif")
async def api_admin_testnotif(request: Request):
    try:
        data     = await request.json()
        admin_id = int(data.get("admin_id", 0))
        if admin_id not in ADMIN_IDS:
            return JSONResponse({"error": "forbidden"}, status_code=403)
        if not _bot_notif:
            return JSONResponse({"error": "bot_notif not initialized"}, status_code=503)
        conn = sqlite3.connect(str(USERS_DB))
        conn.row_factory = sqlite3.Row
        row = conn.execute(
            "SELECT user_id, language, last_lat, last_lon, last_city FROM users WHERE user_id=?",
            (admin_id,)
        ).fetchone()
        conn.close()
        if not row:
            return JSONResponse({"error": "user_not_in_db",
                                 "hint": "Open the webapp and go to prayer times first"})
        r = dict(row)
        if not r["last_lat"]:
            return JSONResponse({"error": "no_location",
                                 "hint": "last_lat is NULL — go to prayer screen first"})
        msg = _format_notification(r["language"] or "uz", "isha", "21:30", r["last_city"] or "", 0)
        await _bot_notif.send_message(admin_id, msg, parse_mode="HTML")
        print(f"[NOTIF] test sent to uid={admin_id}", flush=True)
        return JSONResponse({"ok": True})
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.post("/api/admin/testbrief")
async def api_admin_testbrief(request: Request):
    try:
        data     = await request.json()
        admin_id = int(data.get("admin_id", 0))
        if admin_id not in ADMIN_IDS:
            return JSONResponse({"error": "forbidden"}, status_code=403)
        conn = sqlite3.connect(str(USERS_DB))
        conn.row_factory = sqlite3.Row
        row = conn.execute(
            "SELECT user_id, language, last_lat, last_lon, last_city, notif_tz_offset "
            "FROM users WHERE user_id=?", (admin_id,)
        ).fetchone()
        conn.close()
        if not row:
            return JSONResponse({"error": "user_not_in_db",
                                 "hint": "Open the webapp and go to prayer times first"})
        r = dict(row)
        if not r["last_lat"]:
            return JSONResponse({"error": "no_location",
                                 "hint": "last_lat is NULL — go to prayer screen first"})
        user = dict(r)
        user.update({"daily_briefing_time": "00:00", "briefing_sent": ""})
        now_utc      = datetime.utcnow()
        utc_minutes  = now_utc.hour * 60 + now_utc.minute
        tz_offset    = user.get("notif_tz_offset") or 0
        local_minute = (utc_minutes + tz_offset) % 1440
        user["daily_briefing_time"] = f"{local_minute // 60:02d}:{local_minute % 60:02d}"
        await _process_user_daily_briefing(user, utc_minutes, "test-" + now_utc.strftime("%H%M%S"))
        print(f"[BRIEF] test sent to uid={admin_id}", flush=True)
        return JSONResponse({"ok": True})
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


# ── Prayer Times API (full card data) ─────────────────────────────────────
@app.get("/api/prayer-times")
async def api_prayer_times(
    lat:    float = Query(..., ge=-90,  le=90),
    lon:    float = Query(..., ge=-180, le=180),
    lang:   str   = Query("uz"),
    method: int   = Query(3, ge=0, le=23),
):
    """
    Full prayer times card data:
    timings · next-prayer countdown · Hijri/Gregorian dates
    city/country · madhhab · weather · AQI · daily ayah · daily hadith
    """
    from domain.prayer.service import prayer_service
    from domain.prayer.extras  import fetch_all_extras

    cache_key = f"{round(lat, 2)},{round(lon, 2)},{method},{lang}"
    cached = _pt_cache_get(cache_key)
    if cached is not None:
        return JSONResponse(cached)

    prayer_task = prayer_service.get_prayer_data(lat, lon, lang, method)
    extras_task = fetch_all_extras(lat, lon, lang)

    prayer_data, extras = await asyncio.gather(prayer_task, extras_task)

    if not prayer_data:
        return JSONResponse(
            {"error": "Could not fetch prayer times. Check coordinates or try again."},
            status_code=503,
        )

    prayer_data.update(extras)
    # Only cache when weather + aqi loaded; skip cache on partial failures so next
    # request retries the failing external APIs instead of serving stale nulls.
    if extras.get('weather') is not None and extras.get('aqi') is not None:
        _pt_cache_put(cache_key, prayer_data)
    return JSONResponse(prayer_data)


@app.get("/api/weather")
async def api_weather(
    lat:  float = Query(..., ge=-90,  le=90),
    lon:  float = Query(..., ge=-180, le=180),
    lang: str   = Query("uz"),
):
    """Return only weather data for given coordinates (no prayer data)."""
    from domain.prayer.extras import fetch_weather
    w = await fetch_weather(lat, lon, lang)
    if w is None:
        return JSONResponse({"error": "weather_unavailable"}, status_code=503)
    return JSONResponse(w)


# ── Category → Chapter mapping (Uzbek Bukhari) ─────────────────────────────
CATEGORY_CHAPTERS: dict = {
    "Iymon":   [2],
    "Tahorat": [4, 5, 6, 7],
    "Namoz":   [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
    "Ro'za":   [25, 26],
    "Haj":     [21, 22, 23],
    "Zakot":   [42, 44, 50],
    "Savdo":   [27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41],
    "Nikoh":   [144, 145, 146],
    "Ilm":     [3, 143],
    "Adab":    [154, 155, 156, 158],
    "Zikr":    [157, 176],
    "Qiyomat": [159, 169, 170, 172, 174],
}

def _muslim_row(r, lang: str) -> dict:
    """Convert a hadiths_muslim SQLite row to the API response dict."""
    if lang in ("uz", "uz_cyr"):
        text = (r["uz_cyr"] if lang == "uz_cyr" else r["uz_text"]) or ""
    elif lang == "ru":
        text = r["ru_text"] or ""
    else:
        text = r["en_text"] or ""
    return {
        "id":            r["id"],
        "collection":    "muslim",
        "hadith_number": r["hadith_number"],
        "narrator":      "",
        "text":          text,
        "arabic":        r["arabic"] or "",
        "chapter":       r["chapter_name"] or "",
        "chapter_id":    r["book_id"],
        "jild":          "",
        "apk_id":        0,
    }


# ── Hadith API ─────────────────────────────────────────────────────────────
@app.get("/api/hadith")
async def api_hadith(
    collection: str      = Query("bukhari"),
    page:       int      = Query(1, ge=1),
    limit:      int      = Query(20, ge=1, le=50),
    lang:       str      = Query("en"),
    chapter_id: int|None = Query(None),
):
    """Paginated hadith list. chapter_id filters by specific Bukhari chapter (uz only)."""
    import math
    db_path = BASE_DIR / "data" / "hadiths.db"
    if not db_path.exists():
        return JSONResponse({"hadiths": [], "total": 0, "page": page, "pages": 0})

    col    = "bukhari" if collection != "muslim" else "muslim"
    offset = (page - 1) * limit
    use_uz = False  # hadiths_uz_bukhari disabled — source under license verification

    def _query():
        import sqlite3
        con = sqlite3.connect(str(db_path))
        con.row_factory = sqlite3.Row
        cur = con.cursor()

        if use_uz:
            tbl_ok = cur.execute(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='hadiths_uz_bukhari'"
            ).fetchone()[0]
            if tbl_ok:
                if chapter_id is not None:
                    total = cur.execute(
                        "SELECT COUNT(*) FROM hadiths_uz_bukhari WHERE chapter_id=?",
                        (chapter_id,)
                    ).fetchone()[0]
                    rows = cur.execute(
                        "SELECT sort_order, apk_id, jild_id, chapter_id, chapter_name, uz_text "
                        "FROM hadiths_uz_bukhari WHERE chapter_id=? ORDER BY sort_order LIMIT ? OFFSET ?",
                        (chapter_id, limit, offset)
                    ).fetchall()
                else:
                    total = cur.execute("SELECT COUNT(*) FROM hadiths_uz_bukhari").fetchone()[0]
                    rows  = cur.execute(
                        "SELECT sort_order, apk_id, jild_id, chapter_id, chapter_name, uz_text "
                        "FROM hadiths_uz_bukhari ORDER BY sort_order LIMIT ? OFFSET ?",
                        (limit, offset)
                    ).fetchall()
                result = [{
                    "id":            r["sort_order"],
                    "collection":    "bukhari",
                    "hadith_number": r["sort_order"],
                    "narrator":      "",
                    "text":          r["uz_text"],
                    "arabic":        "",
                    "chapter":       r["chapter_name"],
                    "chapter_id":    r["chapter_id"],
                    "jild":          r["jild_id"],
                    "apk_id":        r["apk_id"],
                } for r in rows]
                con.close()
                return result, total

        if col == "muslim":
            if chapter_id is not None:
                total = cur.execute(
                    "SELECT COUNT(*) FROM hadiths_muslim WHERE book_id=?", (chapter_id,)
                ).fetchone()[0]
                rows = cur.execute(
                    "SELECT * FROM hadiths_muslim WHERE book_id=? ORDER BY hadith_number LIMIT ? OFFSET ?",
                    (chapter_id, limit, offset)
                ).fetchall()
            else:
                total = cur.execute("SELECT COUNT(*) FROM hadiths_muslim").fetchone()[0]
                rows  = cur.execute(
                    "SELECT * FROM hadiths_muslim ORDER BY hadith_number LIMIT ? OFFSET ?",
                    (limit, offset)
                ).fetchall()
            result = [_muslim_row(r, lang) for r in rows]
            con.close()
            return result, total

        total = cur.execute("SELECT COUNT(*) FROM hadiths WHERE collection=?", (col,)).fetchone()[0]
        rows  = cur.execute(
            "SELECT * FROM hadiths WHERE collection=? ORDER BY hadith_number LIMIT ? OFFSET ?",
            (col, limit, offset)
        ).fetchall()
        result = [dict(r) for r in rows]
        con.close()
        return result, total

    try:
        rows, total = await asyncio.to_thread(_query)
        return JSONResponse({"hadiths": rows, "total": total,
                             "page": page, "pages": math.ceil(total / limit)})
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.get("/api/hadith/categories")
async def api_hadith_categories(lang: str = Query("en")):
    """Returns all categories with hadith counts (uz/bukhari only)."""
    if lang not in ("uz", "uz_cyr"):
        return JSONResponse({"categories": []})
    db_path = BASE_DIR / "data" / "hadiths.db"
    if not db_path.exists():
        return JSONResponse({"categories": []})

    def _query():
        import sqlite3
        con = sqlite3.connect(str(db_path))
        cur = con.cursor()
        out = []
        for name, ids in CATEGORY_CHAPTERS.items():
            if not ids:
                continue
            ph  = ",".join("?" * len(ids))
            row = cur.execute(
                f"SELECT COUNT(*) FROM hadiths_uz_bukhari WHERE chapter_id IN ({ph})", ids
            ).fetchone()
            out.append({"name": name, "count": row[0] if row else 0, "chapter_count": len(ids)})
        con.close()
        return out

    try:
        cats = await asyncio.to_thread(_query)
        return JSONResponse({"categories": cats})
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.get("/api/hadith/muslim/books")
async def api_hadith_muslim_books():
    """Returns the 57 Sahih Muslim books with hadith counts."""
    db_path = BASE_DIR / "data" / "hadiths.db"
    if not db_path.exists():
        return JSONResponse({"books": []})

    def _query():
        import sqlite3
        con = sqlite3.connect(str(db_path))
        cur = con.cursor()
        rows = cur.execute(
            "SELECT book_id, chapter_name, COUNT(*) "
            "FROM hadiths_muslim GROUP BY book_id, chapter_name ORDER BY book_id"
        ).fetchall()
        con.close()
        return [{"book_id": r[0], "name": r[1], "count": r[2]} for r in rows]

    try:
        books = await asyncio.to_thread(_query)
        return JSONResponse({"books": books})
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.get("/api/hadith/category")
async def api_hadith_category(name: str = Query(...), lang: str = Query("en")):
    """Returns chapters for a named category (uz/bukhari only)."""
    ids = CATEGORY_CHAPTERS.get(name, [])
    if lang not in ("uz", "uz_cyr") or not ids:
        return JSONResponse({"category": name, "chapters": [], "total": 0})
    db_path = BASE_DIR / "data" / "hadiths.db"
    if not db_path.exists():
        return JSONResponse({"category": name, "chapters": [], "total": 0})

    def _query():
        import sqlite3
        con = sqlite3.connect(str(db_path))
        cur = con.cursor()
        ph  = ",".join("?" * len(ids))
        rows = cur.execute(
            f"SELECT chapter_id, chapter_name, jild_id, COUNT(*) "
            f"FROM hadiths_uz_bukhari WHERE chapter_id IN ({ph}) "
            f"GROUP BY chapter_id, chapter_name, jild_id ORDER BY chapter_id",
            ids
        ).fetchall()
        total = cur.execute(
            f"SELECT COUNT(*) FROM hadiths_uz_bukhari WHERE chapter_id IN ({ph})", ids
        ).fetchone()[0]
        chapters = [{"chapter_id": r[0], "chapter_name": r[1], "jild": r[2], "count": r[3]}
                    for r in rows]
        con.close()
        return chapters, total

    try:
        chapters, total = await asyncio.to_thread(_query)
        return JSONResponse({"category": name, "chapters": chapters, "total": total})
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


def _strip_harakat(s: str) -> str:
    """Remove Arabic diacritical marks (harakat/tashkeel) for flexible search."""
    import re
    return re.sub(r'[ً-ْٰۖ-ۜ۟-ۭ]', '', s or '')


@app.get("/api/hadith/search")
async def api_hadith_search(
    q:          str = Query(...),
    collection: str = Query("bukhari"),
    lang:       str = Query("en"),
):
    """Full-text search. For lang=uz/uz_cyr + bukhari: searches Uzbek translation table."""
    db_path = BASE_DIR / "data" / "hadiths.db"
    if not db_path.exists():
        return JSONResponse({"hadiths": [], "total": 0})

    col    = "bukhari" if collection != "muslim" else "muslim"
    use_uz = False  # hadiths_uz_bukhari disabled — source under license verification

    def _search():
        import sqlite3
        con = sqlite3.connect(str(db_path))
        con.row_factory = sqlite3.Row
        cur  = con.cursor()
        like = f"%{q}%"

        if use_uz:
            tbl_ok = cur.execute(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='hadiths_uz_bukhari'"
            ).fetchone()[0]
            if tbl_ok:
                # Try numeric search by sort_order
                try:
                    num = int(q.strip())
                    rows = cur.execute(
                        "SELECT sort_order, apk_id, jild_id, chapter_name, uz_text "
                        "FROM hadiths_uz_bukhari WHERE sort_order=? LIMIT 1",
                        (num,)
                    ).fetchall()
                except ValueError:
                    rows = []
                if not rows:
                    rows = cur.execute(
                        "SELECT sort_order, apk_id, jild_id, chapter_name, uz_text "
                        "FROM hadiths_uz_bukhari "
                        "WHERE uz_text LIKE ? OR chapter_name LIKE ? LIMIT 50",
                        (like, like)
                    ).fetchall()
                results = [{
                    "id":            r["sort_order"],
                    "collection":    "bukhari",
                    "hadith_number": r["sort_order"],
                    "narrator":      "",
                    "text":          r["uz_text"],
                    "arabic":        "",
                    "chapter":       r["chapter_name"],
                    "jild":          r["jild_id"],
                    "apk_id":        r["apk_id"],
                } for r in rows]
                con.close()
                return results

        if col == "muslim":
            try:
                num = int(q.strip())
                rows = cur.execute(
                    "SELECT * FROM hadiths_muslim WHERE hadith_number=? LIMIT 1", (num,)
                ).fetchall()
            except ValueError:
                rows = []
            if not rows:
                rows = cur.execute(
                    "SELECT * FROM hadiths_muslim WHERE "
                    "en_text LIKE ? OR chapter_name LIKE ? LIMIT 50",
                    (like, like)
                ).fetchall()
            q_norm = _strip_harakat(q)
            if len(rows) < 50 and q_norm and any(0x0600 <= ord(c) <= 0x06FF for c in q_norm):
                ar_rows = cur.execute(
                    "SELECT * FROM hadiths_muslim WHERE arabic IS NOT NULL LIMIT 3000"
                ).fetchall()
                seen = {r["id"] for r in rows}
                for row in ar_rows:
                    if len(rows) >= 50:
                        break
                    if row["id"] not in seen and q_norm in _strip_harakat(row["arabic"] or ""):
                        rows.append(row)
                        seen.add(row["id"])
            con.close()
            return [_muslim_row(r, lang) for r in rows]

        sql_rows = cur.execute(
            "SELECT * FROM hadiths WHERE collection=? AND "
            "(narrator LIKE ? OR text LIKE ? OR chapter LIKE ?) LIMIT 50",
            (col, like, like, like)
        ).fetchall()
        results  = [dict(r) for r in sql_rows]
        seen_ids = {r["id"] for r in results}

        if len(results) < 50:
            q_norm = _strip_harakat(q)
            if q_norm and any(0x0600 <= ord(c) <= 0x06FF for c in q_norm):
                ar_rows = cur.execute(
                    "SELECT * FROM hadiths WHERE collection=? AND arabic != '' LIMIT 3000",
                    (col,)
                ).fetchall()
                for row in ar_rows:
                    if len(results) >= 50:
                        break
                    d = dict(row)
                    if d["id"] not in seen_ids and q_norm in _strip_harakat(d.get("arabic", "")):
                        results.append(d)
                        seen_ids.add(d["id"])

        con.close()
        return results

    try:
        results = await asyncio.to_thread(_search)
        return JSONResponse({"hadiths": results, "total": len(results)})
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


# ── Entry point ────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8080))
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    print(f"[OK] WebApp server  -> http://localhost:{port}")
    print(f"[OK] Prayer API     -> http://localhost:{port}/api/prayer-times?lat=41.3&lon=69.2&lang=uz")
    uvicorn.run(app, host="0.0.0.0", port=port)
