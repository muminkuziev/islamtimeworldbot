"""
Integrity gate for the verified HadeethEnc corpus (data/hadeethenc_verified.db).

Built by scripts/build_hadeethenc_verified_db.py from the official HadeethEnc
API. These tests assert the exact contract the app depends on: 144 hadith IDs,
13 canonical languages, 1872 records, no gaps, no duplicates, no empty text,
no Unicode corruption.
"""
import sqlite3
from pathlib import Path

import pytest

DB_PATH = Path(__file__).resolve().parent.parent / "data" / "hadeethenc_verified.db"
CANONICAL_LANGS = ["ar", "en", "id", "ur", "bn", "fr", "hi", "fa", "tr", "ru", "uz", "de", "ms"]

pytestmark = pytest.mark.skipif(
    not DB_PATH.exists(),
    reason="data/hadeethenc_verified.db not built yet — run scripts/build_hadeethenc_verified_db.py",
)


@pytest.fixture(scope="module")
def con():
    c = sqlite3.connect(str(DB_PATH))
    c.row_factory = sqlite3.Row
    yield c
    c.close()


def test_record_count_is_1872(con):
    n = con.execute("SELECT COUNT(*) FROM hadeeth_verified").fetchone()[0]
    assert n == 144 * 13


def test_exactly_144_distinct_ids(con):
    n = con.execute("SELECT COUNT(DISTINCT id) FROM hadeeth_verified").fetchone()[0]
    assert n == 144


def test_exactly_13_canonical_languages_present(con):
    langs = {r[0] for r in con.execute("SELECT DISTINCT language FROM hadeeth_verified")}
    assert langs == set(CANONICAL_LANGS)


def test_no_duplicate_id_language_pairs(con):
    rows = con.execute(
        "SELECT id, language, COUNT(*) c FROM hadeeth_verified GROUP BY id, language HAVING c > 1"
    ).fetchall()
    assert rows == []


def test_full_matrix_no_missing_cells(con):
    ids = [r[0] for r in con.execute("SELECT DISTINCT id FROM hadeeth_verified")]
    have = {(r[0], r[1]) for r in con.execute("SELECT id, language FROM hadeeth_verified")}
    missing = [(i, l) for i in ids for l in CANONICAL_LANGS if (i, l) not in have]
    assert missing == []


def test_no_empty_hadeeth_text(con):
    rows = con.execute(
        "SELECT id, language FROM hadeeth_verified WHERE hadeeth_text IS NULL OR TRIM(hadeeth_text) = ''"
    ).fetchall()
    assert rows == []


def test_no_unicode_replacement_character(con):
    rows = con.execute(
        "SELECT id, language FROM hadeeth_verified "
        "WHERE hadeeth_text LIKE '%' || CHAR(65533) || '%' OR title LIKE '%' || CHAR(65533) || '%'"
    ).fetchall()
    assert rows == []


def test_build_meta_records_gate_pass(con):
    meta = dict(con.execute("SELECT key, value FROM build_meta").fetchall())
    assert meta.get("gate_pass") == "1"
    assert meta.get("record_count") == "1872"
    assert meta.get("hadith_id_count") == "144"


def test_get_daily_hadith_returns_real_verified_content():
    from domain.prayer.extras import get_daily_hadith

    for lang in ["en", "ar", "bn", "fa", "ms", "uz", "hi"]:
        h = get_daily_hadith(lang)
        assert h, f"no daily hadith returned for lang={lang}"
        assert h["text"].strip(), f"empty hadith text for lang={lang}"
        assert h["source"] == "hadeethenc.com"


def test_get_daily_hadith_same_id_across_languages():
    """Same calendar day must show the same underlying hadith to every language."""
    from domain.prayer.extras import get_daily_hadith

    ids = {get_daily_hadith(lang)["id"] for lang in ["en", "ar", "bn", "fa", "ms"]}
    assert len(ids) == 1


def test_get_daily_hadith_legacy_lang_fallback():
    """uz_cyr/kk/tg/ky are not in the corpus directly — must fall back, not error."""
    from domain.prayer.extras import get_daily_hadith

    for lang in ["uz_cyr", "kk", "tg", "ky", "totally_unknown_code"]:
        h = get_daily_hadith(lang)
        assert h and h["text"].strip()
