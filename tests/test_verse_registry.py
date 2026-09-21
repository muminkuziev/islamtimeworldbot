"""Curated verse content registry (domain/quran/verse_registry.py)."""
from domain.quran.verse_registry import get_verse


def test_baqara_2_115_uz_is_present_and_verified():
    v = get_verse(2, 115, "uz")
    assert v is not None
    assert v.verification_status == "verified"
    assert v.text.startswith("Mashriqu mag'rib")
    assert v.translation_source and "Sodik" in v.translation_source


def test_missing_verse_returns_none_not_fabricated_text():
    assert get_verse(2, 9999, "uz") is None
    assert get_verse(2, 115, "xx_not_a_real_lang") is None


def test_unverified_entries_never_surface_even_if_present(tmp_path, monkeypatch):
    import json
    import domain.quran.verse_registry as registry_module

    fixture = [{
        "surah": 3, "ayah": 5, "language": "uz", "text": "SHOULD_NOT_APPEAR",
        "translation_source": None, "source_reference": None, "corroboration": None,
        "verification_status": "unverified", "version": None,
    }]
    fixture_path = tmp_path / "verse_fixture.json"
    fixture_path.write_text(json.dumps(fixture), encoding="utf-8")
    monkeypatch.setattr(registry_module, "DATA_PATH", fixture_path)

    assert registry_module.get_verse(3, 5, "uz") is None
