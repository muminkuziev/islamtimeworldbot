"""Exercise the verified read APIs under tests/conftest.py's isolated QA mode."""
from fastapi.testclient import TestClient
import pytest

from domain.prayer.extras import get_daily_hadith
from domain.quran.translation_registry import CANONICAL_LANGS


@pytest.fixture(scope="module")
def client():
    # No lifespan is entered: these read-only endpoints need no bot or scheduler.
    from server import app
    return TestClient(app)


@pytest.mark.parametrize("language", CANONICAL_LANGS)
def test_verified_list_detail_and_daily_use_the_requested_language(client, language):
    response = client.get("/api/hadeethenc", params={"lang": language, "limit": 12})
    assert response.status_code == 200
    page = response.json()
    assert page["total"] == 144
    assert page["pages"] == 12
    assert page["language"] == language
    assert page["verified"] is True
    assert len(page["hadiths"]) == 12
    assert all(h["language"] == language and h["source"] == "hadeethenc.com" for h in page["hadiths"])

    first = page["hadiths"][0]
    detail = client.get("/api/hadeethenc", params={"lang": language, "hadith_id": first["id"]}).json()
    assert detail["total"] == 1
    assert detail["hadiths"] == [first]
    assert first["arabic"]

    daily = client.get("/api/hadeethenc/daily", params={"lang": language})
    assert daily.status_code == 200
    assert daily.json()["language"] == language
    assert daily.json()["hadith"] == get_daily_hadith(language)


def test_search_empty_state_and_real_source_facets(client):
    result = client.get("/api/hadeethenc", params={"lang": "en", "q": "missing-fixture-938752"}).json()
    assert result["hadiths"] == []
    assert result["total"] == result["pages"] == 0
    facets = client.get("/api/hadeethenc/books", params={"lang": "en"}).json()
    assert facets["books"]
    for source in facets["books"]:
        response = client.get("/api/hadeethenc", params={"lang": "en", "book": source["name"]})
        assert response.status_code == 200, source["name"]
        page = response.json()
        assert page["total"] == source["count"]
        assert all(h["attribution"] == source["name"] for h in page["hadiths"])


def test_daily_canonical_id_is_identical_in_all_languages(client):
    ids = {client.get("/api/hadeethenc/daily", params={"lang": lang}).json()["hadith"]["id"]
           for lang in CANONICAL_LANGS}
    assert len(ids) == 1
