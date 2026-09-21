"""
Madhhab-aware fiqh content registry.

Hard rules (non-negotiable, per product policy):
  - Never infer a user's madhhab from language, country, or nationality —
    the user selects it explicitly (webapp/js/screens/mazhab.js).
  - Never mix rulings between madhhabs: a query for one madhhab can only
    ever return content tagged for that exact madhhab.
  - Never fabricate fiqh. If a topic has no independently verified ruling
    text on file, the API returns a clear "not verified yet" result —
    it never falls back to another madhhab's text or invented text.

Data lives in data/fiqh_content.json, one entry per (madhhab, topic, lang).
Each entry's `verification_status` is either:
  - "verified"   — reviewed against a named source/scholar, ruling_text set
  - "unverified" — placeholder only; ruling_text is null and MUST NOT be
                    synthesized by this module or any caller
"""
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

DATA_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "fiqh_content.json"

MADHHABS = ["hanafi", "shafii", "maliki", "hanbali"]


@dataclass
class FiqhEntry:
    madhhab: str
    topic: str
    language: str
    source: Optional[str]
    scholar_or_institution: Optional[str]
    version: Optional[str]
    reviewed_at: Optional[str]
    verification_status: str  # "verified" | "unverified"
    ruling_text: Optional[str]


def _load_all() -> list[dict]:
    if not DATA_PATH.exists():
        return []
    try:
        return json.loads(DATA_PATH.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return []


def get_fiqh_content(madhhab: str, topic: str, language: str = "en") -> FiqhEntry:
    """Return the fiqh entry for exactly this (madhhab, topic, language).

    Never returns another madhhab's content. If nothing verified exists,
    returns an "unverified" entry with ruling_text=None rather than
    inventing text or silently substituting a different madhhab.
    """
    if madhhab not in MADHHABS:
        raise ValueError(f"Unknown madhhab: {madhhab!r}. Must be one of {MADHHABS}")

    rows = _load_all()
    # Exact language match first, then fall back to English for the same madhhab+topic
    # (never falls back across madhhabs).
    same_madhhab_topic = [
        r for r in rows if r.get("madhhab") == madhhab and r.get("topic") == topic
    ]
    for r in same_madhhab_topic:
        if r.get("language") == language:
            return _to_entry(r)
    for r in same_madhhab_topic:
        if r.get("language") == "en":
            return _to_entry(r)

    return FiqhEntry(
        madhhab=madhhab, topic=topic, language=language,
        source=None, scholar_or_institution=None, version=None, reviewed_at=None,
        verification_status="unverified", ruling_text=None,
    )


def _to_entry(r: dict) -> FiqhEntry:
    # Defense in depth: never let an "unverified" row leak ruling_text, even
    # if the data file is edited incorrectly by hand later.
    status = r.get("verification_status", "unverified")
    ruling_text = r.get("ruling_text") if status == "verified" else None
    return FiqhEntry(
        madhhab=r["madhhab"],
        topic=r["topic"],
        language=r.get("language", "en"),
        source=r.get("source"),
        scholar_or_institution=r.get("scholar_or_institution"),
        version=r.get("version"),
        reviewed_at=r.get("reviewed_at"),
        verification_status=status,
        ruling_text=ruling_text,
    )
