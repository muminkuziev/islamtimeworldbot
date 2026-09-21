"""
Monthly prayer calendar (domain/prayer/service.py::get_monthly_prayer_data).

Uses a mocked Aladhan response so this runs offline/deterministically, and
checks the actual transformation logic: same PRAYER_KEYS/PRAYER_NAMES/
_hijri_month_name helpers as the daily view, one entry per day, no crash on
a missing/failed geocode.
"""
import asyncio
from unittest.mock import AsyncMock, patch

from domain.prayer.service import prayer_service, PRAYER_KEYS

# Plain asyncio.run() wrapping instead of @pytest.mark.asyncio: this repo has
# the `anyio` plugin installed, not pytest-asyncio, and this avoids adding a
# new test dependency just for three tests.
def _run(coro):
    return asyncio.run(coro)


FAKE_CALENDAR_DAY = {
    "timings": {
        "Fajr": "04:11 (+05)", "Sunrise": "05:49 (+05)", "Dhuhr": "12:23 (+05)",
        "Asr": "16:05 (+05)", "Maghrib": "18:56 (+05)", "Isha": "20:28 (+05)",
    },
    "date": {
        "gregorian": {"date": "01-09-2026", "weekday": {"en": "Tuesday"}},
        "hijri": {"day": "19", "year": "1448", "month": {"number": 3, "en": "Rabi al-Awwal"}},
    },
}


def test_monthly_calendar_returns_one_entry_per_day():
    fake_days = [FAKE_CALENDAR_DAY] * 30
    with patch("infrastructure.external.aladhan_api.fetch_calendar", new=AsyncMock(return_value=fake_days)), \
         patch("domain.prayer.service.reverse_geocode", new=AsyncMock(return_value={"city": "Tashkent", "country": "Uzbekistan"})):
        data = _run(prayer_service.get_monthly_prayer_data(41.3, 69.2, 9, 2026, "en"))

    assert data is not None
    assert len(data["days"]) == 30
    assert data["city"] == "Tashkent"


def test_monthly_calendar_uses_same_prayer_keys_as_daily_view():
    fake_days = [FAKE_CALENDAR_DAY]
    with patch("infrastructure.external.aladhan_api.fetch_calendar", new=AsyncMock(return_value=fake_days)), \
         patch("domain.prayer.service.reverse_geocode", new=AsyncMock(return_value={"city": "Tashkent", "country": "Uzbekistan"})):
        data = _run(prayer_service.get_monthly_prayer_data(41.3, 69.2, 9, 2026, "en"))

    day = data["days"][0]
    keys = [p["key"] for p in day["prayers"]]
    assert keys == PRAYER_KEYS
    fajr = next(p for p in day["prayers"] if p["key"] == "Fajr")
    assert fajr["time"] == "04:11"  # timezone suffix stripped, same as daily view


def test_monthly_calendar_returns_none_on_fetch_failure():
    with patch("infrastructure.external.aladhan_api.fetch_calendar", new=AsyncMock(return_value=None)), \
         patch("domain.prayer.service.reverse_geocode", new=AsyncMock(return_value={"city": "", "country": ""})):
        data = _run(prayer_service.get_monthly_prayer_data(41.3, 69.2, 9, 2026, "en"))

    assert data is None


def test_prayer_names_cover_all_13_canonical_languages():
    from domain.prayer.service import PRAYER_NAMES
    for lang in ["ar", "en", "id", "ur", "bn", "fr", "hi", "fa", "tr", "ru", "uz", "de", "ms"]:
        assert lang in PRAYER_NAMES, f"{lang} missing from PRAYER_NAMES"
        assert len(PRAYER_NAMES[lang]) == 6
