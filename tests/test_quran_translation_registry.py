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
import re
from pathlib import Path


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
        if lang == "id":
            assert s.translator is None  # The official catalog reports Unknown.
            assert s.translator_verification == "unconfirmed_project_attribution"
            assert s.project_attribution == "Kementerian Agama Republik Indonesia"
        else:
            assert s.translator, f"{lang} entry is missing its translator attribution"
        assert s.edition, f"{lang} entry is missing its source edition identifier"


def test_unknown_language_reports_unavailable_not_a_crash():
    s = get_translation_source("xx_not_real")
    assert s.status == UNAVAILABLE
    assert s.availability == "unavailable"


def test_provider_and_backend_share_exact_canonical_editions():
    expected = {
        "ar": None, "en": "en.asad", "id": "id.indonesian", "ur": "ur.jalandhry",
        "bn": "bn.bengali", "fr": "fr.hamidullah", "hi": "hi.hindi", "fa": "fa.makarem",
        "tr": "tr.diyanet", "ru": "ru.kuliev", "uz": "uz.sodik", "de": "de.bubenheim", "ms": "ms.basmeih",
    }
    js = (Path(__file__).resolve().parents[1] / "webapp/js/native/quran-provider.js").read_text(encoding="utf-8-sig")
    for language, edition in expected.items():
        source = get_translation_source(language)
        assert source.edition == edition
        assert source.availability == "provider_published"
        assert source.legal_clearance is False
        literal = "null" if edition is None else f"'{edition}'"
        assert re.search(rf"\b{language}:\s*\{{\s*edition:\s*{re.escape(literal)}", js)
