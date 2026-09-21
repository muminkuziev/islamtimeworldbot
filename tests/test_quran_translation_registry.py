"""
Quran translation source registry (domain/quran/translation_registry.py).

Asserts the specific safety property this exists for: no translation is
marked usable without a human having actually confirmed its license, and
Arabic (not a translation) is the only VERIFIED_USABLE entry.
"""
from domain.quran.translation_registry import (
    CANONICAL_LANGS, LICENSE_REVIEW_REQUIRED, UNAVAILABLE, VERIFIED_USABLE,
    all_sources, get_translation_source,
)


def test_all_13_canonical_languages_have_an_entry():
    langs = {s["language"] for s in all_sources()}
    assert langs == set(CANONICAL_LANGS)


def test_arabic_is_verified_since_it_is_not_a_translation():
    ar = get_translation_source("ar")
    assert ar.status == VERIFIED_USABLE


def test_no_translation_is_marked_verified_usable_without_human_confirmation():
    """This is the actual safety property: an automated/AI web-page check is
    not sufficient confirmation for religious content, so every real
    translation must sit at LICENSE_REVIEW_REQUIRED until a human confirms it."""
    for lang in CANONICAL_LANGS:
        if lang == "ar":
            continue
        s = get_translation_source(lang)
        assert s.status == LICENSE_REVIEW_REQUIRED, (
            f"{lang} is marked {s.status} without documented human confirmation"
        )
        assert s.translator, f"{lang} entry is missing its translator attribution"
        assert s.edition, f"{lang} entry is missing its source edition identifier"


def test_unknown_language_reports_unavailable_not_a_crash():
    s = get_translation_source("xx_not_real")
    assert s.status == UNAVAILABLE
