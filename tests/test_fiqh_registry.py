"""
Madhhab separation guarantees for domain/fiqh/registry.py.

These tests exist specifically to catch the failure mode the product policy
forbids: rulings leaking across madhhabs, or unverified content being
presented as if it were verified.
"""
import json

import pytest

from domain.fiqh.registry import MADHHABS, get_fiqh_content


def test_all_four_madhhabs_supported():
    assert set(MADHHABS) == {"hanafi", "shafii", "maliki", "hanbali"}


def test_unknown_madhhab_rejected():
    with pytest.raises(ValueError):
        get_fiqh_content("unknown_madhhab", "qazo")


def test_qazo_topic_never_fabricated_for_any_madhhab():
    """Current data/fiqh_content.json intentionally ships with no verified
    qazo ruling for any madhhab. Confirms the registry reports that honestly
    instead of inventing text."""
    for m in MADHHABS:
        entry = get_fiqh_content(m, "qazo")
        assert entry.madhhab == m
        if entry.verification_status == "unverified":
            assert entry.ruling_text is None


def test_result_never_contains_another_madhhabs_content(tmp_path, monkeypatch):
    """Seed two madhhabs with distinct verified text and confirm querying one
    never returns the other's — the actual regression this exists to catch."""
    import domain.fiqh.registry as registry_module

    fixture = [
        {
            "madhhab": "hanafi", "topic": "qazo_order", "language": "en",
            "source": "TEST_SOURCE_A", "scholar_or_institution": "Test Scholar A",
            "version": "1", "reviewed_at": "2026-01-01",
            "verification_status": "verified",
            "ruling_text": "HANAFI_ONLY_TEXT",
        },
        {
            "madhhab": "shafii", "topic": "qazo_order", "language": "en",
            "source": "TEST_SOURCE_B", "scholar_or_institution": "Test Scholar B",
            "version": "1", "reviewed_at": "2026-01-01",
            "verification_status": "verified",
            "ruling_text": "SHAFII_ONLY_TEXT",
        },
    ]
    fixture_path = tmp_path / "fiqh_content_fixture.json"
    fixture_path.write_text(json.dumps(fixture), encoding="utf-8")
    monkeypatch.setattr(registry_module, "DATA_PATH", fixture_path)

    hanafi_entry = get_fiqh_content("hanafi", "qazo_order")
    shafii_entry = get_fiqh_content("shafii", "qazo_order")
    maliki_entry = get_fiqh_content("maliki", "qazo_order")  # not seeded at all

    assert hanafi_entry.ruling_text == "HANAFI_ONLY_TEXT"
    assert shafii_entry.ruling_text == "SHAFII_ONLY_TEXT"
    assert hanafi_entry.ruling_text != shafii_entry.ruling_text
    assert maliki_entry.verification_status == "unverified"
    assert maliki_entry.ruling_text is None


def test_unverified_row_never_leaks_ruling_text_even_if_data_file_is_malformed(tmp_path, monkeypatch):
    """Defense-in-depth: even if someone hand-edits the JSON and sets
    verification_status='unverified' but leaves ruling_text populated by
    mistake, the registry must still refuse to surface it as content."""
    import domain.fiqh.registry as registry_module

    fixture = [{
        "madhhab": "hanbali", "topic": "qazo_order", "language": "en",
        "source": None, "scholar_or_institution": None, "version": None,
        "reviewed_at": None, "verification_status": "unverified",
        "ruling_text": "SHOULD_NEVER_BE_RETURNED",
    }]
    fixture_path = tmp_path / "fiqh_content_fixture2.json"
    fixture_path.write_text(json.dumps(fixture), encoding="utf-8")
    monkeypatch.setattr(registry_module, "DATA_PATH", fixture_path)

    entry = get_fiqh_content("hanbali", "qazo_order")
    assert entry.verification_status == "unverified"
    assert entry.ruling_text is None
