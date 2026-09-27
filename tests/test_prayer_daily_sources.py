"""Prayer daily cards must preserve source text and never substitute a language."""
import asyncio
import copy
from datetime import date

import pytest

from domain.prayer import extras
from domain.quran.translation_registry import CANONICAL_LANGS, get_translation_source


def install_provider(monkeypatch, language, mutate=None):
    source = get_translation_source(language)
    number = date.today().timetuple().tm_yday % 6236 + 1
    requested = []
    base = {"number": number, "numberInSurah": 7, "surah": {
        "number": 2, "name": "provider surah name", "englishName": "provider title"}}
    rows = []
    for edition, lang, text in [
        ("quran-uthmani", "ar", "EXACT ARABIC PROVIDER FIXTURE"),
        ("en.transliteration", "en", "EXACT TRANSLITERATION FIXTURE"),
    ] + ([(source.edition, language, "EXACT TRANSLATION " + language)] if source.edition else []):
        row = copy.deepcopy(base)
        row.update(edition={"identifier": edition, "language": lang}, text=text)
        rows.append(row)
    if mutate:
        mutate(rows)
    class Response:
        status = 200
        async def __aenter__(self): return self
        async def __aexit__(self, *args): pass
        async def json(self, **kwargs): return {"code": 200, "data": list(reversed(rows))}
    class Session:
        async def __aenter__(self): return self
        async def __aexit__(self, *args): pass
        def get(self, url, **kwargs):
            requested.append(url)
            return Response()
    monkeypatch.setattr(extras.aiohttp, "ClientSession", Session)
    monkeypatch.setattr(extras, "_CACHE", {})
    return requested


@pytest.mark.parametrize("language", CANONICAL_LANGS)
def test_daily_ayah_uses_exact_selected_registry_source(monkeypatch, language):
    requested = install_provider(monkeypatch, language)
    result = asyncio.run(extras.fetch_daily_ayah(language))
    source = get_translation_source(language)
    assert result["language"] == language
    assert result["arabic"] == "EXACT ARABIC PROVIDER FIXTURE"
    assert result["translation"] == ("" if language == "ar" else "EXACT TRANSLATION " + language)
    assert result["edition"] == (source.edition or "quran-uthmani")
    assert result["translator"] == source.translator
    assert result["translation_source"]["status"] == source.status
    assert result["source_api"] == requested[0]
    assert result["reference"] == "2:7"
    assert asyncio.run(extras.fetch_daily_ayah(language)) == result
    assert len(requested) == 1


@pytest.mark.parametrize("fault", ["missing_translation", "wrong_edition", "wrong_language",
                                   "wrong_verse", "wrong_surah", "empty_arabic"])
def test_daily_ayah_rejects_mismatched_provider_response(monkeypatch, fault):
    def mutate(rows):
        if fault == "missing_translation": rows.pop()
        elif fault == "wrong_edition": rows[-1]["edition"]["identifier"] = "en.asad"
        elif fault == "wrong_language": rows[-1]["edition"]["language"] = "en"
        elif fault == "wrong_verse": rows[-1]["numberInSurah"] += 1
        elif fault == "wrong_surah": rows[-1]["surah"]["number"] += 1
        elif fault == "empty_arabic": rows[0]["text"] = ""
    install_provider(monkeypatch, "bn", mutate)
    assert asyncio.run(extras.fetch_daily_ayah("bn")) is None
    assert extras._CACHE == {}


def test_daily_ayah_unknown_language_does_not_request_english(monkeypatch):
    def forbidden_session():
        raise AssertionError("Unsupported language must not make a provider request")
    monkeypatch.setattr(extras.aiohttp, "ClientSession", forbidden_session)
    assert asyncio.run(extras.fetch_daily_ayah("unknown")) is None


def test_backend_weather_labels_cover_canonical_languages():
    for mapping in extras._WEATHER_DESCS.values():
        assert set(CANONICAL_LANGS) <= mapping.keys()
    for mapping in extras._WIND_DIR.values():
        assert set(CANONICAL_LANGS) <= mapping.keys()
    for language in CANONICAL_LANGS:
        assert len(extras._DAY_NAMES[language]) == 7

def test_daily_ayah_preserves_provider_script(monkeypatch):
    provider_text = "\u041f\u0420\u041e\u0412\u0410\u0419\u0414\u0415\u0420 \u0424\u0418\u041a\u0421\u0422\u0423\u0420\u0410"
    install_provider(monkeypatch, "uz", lambda rows: rows[-1].update(text=provider_text))
    result = asyncio.run(extras.fetch_daily_ayah("uz"))
    assert result["translation"] == provider_text


def test_backend_aqi_labels_cover_canonical_languages():
    for mapping in extras._AQI_LABELS.values():
        assert set(CANONICAL_LANGS) <= mapping.keys()
