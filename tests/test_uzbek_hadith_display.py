"""Uzbek Latin presentation must preserve the verified published source."""
import re
import sqlite3
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from domain.content.uzbek import search_key, to_latin, with_latin_display
from domain.prayer.extras import get_daily_hadith


@pytest.mark.parametrize(("source", "expected"), [
    ("Ҳалок қилувчи етти гуноҳ", "Halok qiluvchi yetti gunoh"),
    ("Етти неъмат еб етарли", "Yetti ne'mat yeb yetarli"),
    ("поезд эълон келди", "poyezd e'lon keldi"),
    ("Ўзбекистон Ғафур Қуръон Шарҳ Чирой", "O'zbekiston G'afur Qur'on Sharh Chiroy"),
    ("ЎЗБЕКИСТОН ШАРҲ ЧИРОЙ ЕТТИ", "O'ZBEKISTON SHARH CHIROY YETTI"),
    ("Саҳиҳ. Муттафақун алайҳ", "Sahih. Muttafaqun alayh"),
    ("Ёлғончи Юсуф Яхши", "Yolg'onchi Yusuf Yaxshi"),
    ("Мўъмин мўъминнинг мўъминларга", "Mo'min mo'minning mo'minlarga"),
    ("Исҳоқ асҳобларининг СҲ", "Is'hoq as'hoblarining S'H"),
    ("O'zbek Latin — اللَّهُ ﷺ 123", "O'zbek Latin — اللَّهُ ﷺ 123"),
])
def test_uzbek_letter_conversion(source, expected):
    assert to_latin(source) == expected


@pytest.mark.parametrize("value", ["ПАЙҒАМБАР", "Payg'ambar", "payg‘ambar", "PAYG’AMBAR", "Paygʻambar", "Paygʼambar"])
def test_search_is_script_case_and_apostrophe_tolerant(value):
    assert search_key(value) == "payg'ambar"


def test_projection_does_not_mutate_raw_content_or_other_languages():
    raw = {"language": "uz", "text": "Саҳиҳ", "source": "hadeethenc.com"}
    projected = with_latin_display(raw)
    assert raw == {"language": "uz", "text": "Саҳиҳ", "source": "hadeethenc.com"}
    assert projected["text"] == raw["text"]
    assert projected["display"] == {"language": "uz-Latn", "text": "Sahih"}
    assert with_latin_display({"language": "ru", "text": "Слова"}) == {"language": "ru", "text": "Слова"}


@pytest.fixture(scope="module")
def client():
    from server import app
    return TestClient(app)


@pytest.fixture(scope="module")
def corpus():
    database = Path(__file__).resolve().parents[1] / "data" / "hadeethenc_verified.db"
    connection = sqlite3.connect(database.as_uri() + "?mode=ro", uri=True)
    connection.row_factory = sqlite3.Row
    yield connection
    connection.close()


def test_every_uzbek_hadith_has_latin_display_and_unchanged_source(client, corpus):
    records = []
    for page in range(1, 4):
        response = client.get("/api/hadeethenc", params={"lang": "uz", "limit": 50, "page": page})
        assert response.status_code == 200
        records.extend(response.json()["hadiths"])
    assert len(records) == 144
    fields = {"title": "title", "text": "hadeeth_text", "attribution": "attribution",
              "grade": "grade", "explanation": "explanation", "source": "source", "source_api": "source_api"}
    for record in records:
        source = corpus.execute("SELECT * FROM hadeeth_verified WHERE id=? AND language='uz'", (record["id"],)).fetchone()
        arabic = corpus.execute("SELECT hadeeth_text FROM hadeeth_verified WHERE id=? AND language='ar'", (record["id"],)).fetchone()[0]
        assert all(record[field] == source[column] for field, column in fields.items())
        assert record["arabic"] == arabic
        assert record["display"]["language"] == "uz-Latn"
        assert record["display"]["text"]
        assert not re.search(r"[\u0400-\u04ff]", " ".join(record["display"].values())), record["id"]


def test_detail_and_daily_use_the_same_latin_projection(client):
    daily = get_daily_hadith("uz")
    detail = client.get("/api/hadeethenc", params={"lang": "uz", "hadith_id": daily["id"]}).json()["hadiths"][0]
    response = client.get("/api/hadeethenc/daily", params={"lang": "uz"})
    assert response.status_code == 200
    assert response.json()["hadith"] == daily
    for field in ("title", "text", "attribution", "grade"):
        assert daily["display"][field] == detail["display"][field]
    assert daily["display"]["narrator"] == daily["display"]["attribution"]


def test_actual_corpus_letter_sequences_keep_correct_latin_spelling(client):
    believer = client.get("/api/hadeethenc", params={"lang": "uz", "hadith_id": "65010"}).json()["hadiths"][0]
    assert "мўъмин" in believer["text"]
    assert "mo'min" in believer["display"]["text"]
    assert "mo''min" not in believer["display"]["text"]
    ishaq = client.get("/api/hadeethenc", params={"lang": "uz", "hadith_id": "65046"}).json()["hadiths"][0]
    assert "Исҳоқ" in ishaq["explanation"]
    assert "Is'hoq" in ishaq["display"]["explanation"]


@pytest.mark.parametrize("query", ["yetti", "YETTI", "етти", "ЕТТИ"])
def test_search_finds_contextual_ye_in_either_script(client, query):
    response = client.get("/api/hadeethenc", params={"lang": "uz", "q": query, "limit": 50})
    assert response.status_code == 200
    assert "3331" in {row["id"] for row in response.json()["hadiths"]}


def test_search_apostrophe_variants_return_identical_results(client):
    results = []
    for query in ("Пайғамбар", "Payg'ambar", "PAYG‘AMBAR", "Payg’ambar", "paygʻambar", "paygʼambar"):
        response = client.get("/api/hadeethenc", params={"lang": "uz", "q": query, "limit": 50})
        assert response.status_code == 200
        page = response.json()
        results.append((page["total"], [record["id"] for record in page["hadiths"]]))
    assert results[0][0] > 0
    assert all(result == results[0] for result in results)


def test_books_display_latin_but_keep_exact_filter_keys(client):
    response = client.get("/api/hadeethenc/books", params={"lang": "uz"})
    assert response.status_code == 200
    books = response.json()["books"]
    assert sum(book["count"] for book in books) == 144
    for book in books:
        assert re.search(r"[\u0400-\u04ff]", book["name"])
        assert not re.search(r"[\u0400-\u04ff]", book["display_name"])
        page = client.get("/api/hadeethenc", params={"lang": "uz", "book": book["name"], "limit": 50}).json()
        assert page["total"] == book["count"]
        assert all(row["attribution"] == book["name"] and row["display"]["attribution"] == book["display_name"]
                   for row in page["hadiths"])


@pytest.mark.parametrize("language", ["ar", "en", "ru", "tr"])
def test_other_language_responses_have_no_uzbek_projection(client, language):
    page = client.get("/api/hadeethenc", params={"lang": language, "limit": 1}).json()
    assert "display" not in page["hadiths"][0]
    assert "display" not in get_daily_hadith(language)
    books = client.get("/api/hadeethenc/books", params={"lang": language}).json()["books"]
    assert all("display_name" not in book for book in books)
