"""
Completeness gate for webapp/js/i18n.js — the live 17-language registry
(13 canonical + 4 legacy). Parses the file's data literals directly (it's a
plain JS object, not a Python module) so this test breaks if a future edit
reintroduces a missing-translation regression.
"""
import json
import re
import subprocess
import tempfile
from pathlib import Path

import pytest

I18N_PATH = Path(__file__).resolve().parent.parent / "webapp" / "js" / "i18n.js"
SCREENS_PATH = I18N_PATH.parent / "screens"
UI_RECORD_FILES = {
    "dashboard.js", "prayer.js", "quran.js", "location.js", "mazhab.js",
    "duas.js", "qazo.js", "haramayn.js", "splash.js",
}
CANONICAL_LANGS = ["ar", "en", "id", "ur", "bn", "fr", "hi", "fa", "tr", "ru", "uz", "de", "ms"]

pytestmark = pytest.mark.skipif(
    not I18N_PATH.exists(), reason="webapp/js/i18n.js not found"
)


def _load_i18n_data():
    """Evaluate the whole registry, including late additions, without a browser.

    Literal inline _T calls are collected from production screens so a newly
    added label cannot pass the gate merely because it is absent from _EXTRA_T.
    Religious copy must come from source registries, not get a test exemption.
    """
    text = I18N_PATH.read_text(encoding="utf-8")
    literal = r'''(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')'''
    calls_re = re.compile(r"\b(?:_T|T)\(\s*(" + literal + r")\s*,\s*(" + literal
                          + r")\s*,\s*(" + literal + r")\s*,\s*(" + literal + r")\s*\)")
    calls = []
    records = []
    # Only plain UI language maps. Devotional content has separate source gates.
    record_re = re.compile(r"\{(?:\s*(?:[A-Za-z_]\w*|" + literal + r")\s*:\s*"
                           + literal + r"\s*,?)+\s*\}")
    for path in sorted(SCREENS_PATH.glob("*.js")):
        source = path.read_text(encoding="utf-8")
        for match in calls_re.finditer(source):
            site = f"{path.name}:{source.count(chr(10), 0, match.start()) + 1}"
            calls.append({"site": site, "literal": ",".join(match.groups())})
        if path.name in UI_RECORD_FILES:
            for match in record_re.finditer(source):
                raw = match.group()
                if not re.search(r"\ben\s*:", raw) or not re.search(r"\buz\s*:", raw):
                    continue
                site = f"{path.name}:{source.count(chr(10), 0, match.start()) + 1}"
                records.append({"site": site, "literal": raw})
    script = (
        text
        + "\nglobalThis.window = {};\n"
        + (I18N_PATH.parent / "hijri.js").read_text(encoding="utf-8")
        + "\nconst inlineCalls = " + json.dumps(calls) + ";\n"
        + "const localRecords = " + json.dumps(records) + ";\n"
        + """
const unresolved = [];
for (const call of inlineCalls) {
  const args = Function('return [' + call.literal + ']')();
  for (const lang of CANONICAL_LANGS) {
    const value = _resolveT(...args, lang);
    if (value === I18N.translation_unavailable[lang]) {
      unresolved.push({site: call.site, english: args[3], lang});
    }
  }
}
const directions = {};
const unresolvedRecords = [];
for (const entry of localRecords) {
  const row = Function('return (' + entry.literal + ')')();
  for (const lang of CANONICAL_LANGS) {
    const value = localizeRecord(row, lang);
    if (!value || value === I18N.translation_unavailable[lang]) {
      unresolvedRecords.push({site: entry.site, english: row.en, lang});
    }
  }
}
globalThis.document = {documentElement: {setAttribute(key, value) {directions[key] = value;}}};
const languageChecks = {};
for (const lang of CANONICAL_LANGS) {
  applyLangDir(lang);
  languageChecks[lang] = {...directions, label: t('choose_language', lang)};
}
const dateChecks = {};
for (const lang of CANONICAL_LANGS) {
  dateChecks[lang] = {
    gregorian: formatLocalizedDate({day:27, month:{number:9}, year:2026}, lang),
    hijri: formatLocalizedDate(new Date(2026, 8, 27, 12), lang, {calendar:'islamic'}),
    hijriApi: formatLocalizedDate({day:14, month_num:4, year:1448}, lang, {calendar:'islamic'}),
    hijriMonth: window.HijriCalc.monthName(4, lang)
  };
}
const aliases = {};
for (const code of ['EN-us', 'ar-SA', 'ur_PK', 'fa-IR', 'bn-BD', 'in-ID', 'ms-MY', 'uz-Latn', 'uz-Cyrl-UZ', 'uz_cyr', 'kk', 'tg', 'ky', 'unknown']) {
  aliases[code] = normalizeLanguage(code);
}
const missing = {};
for (const lang of CANONICAL_LANGS) {
  missing[lang] = {
    inline: _resolveT('UZ_SENTINEL', 'CYR_SENTINEL', 'RU_SENTINEL', 'EN_SENTINEL', lang),
    keyed: t('__test_missing_label__', lang)
  };
}
console.log(JSON.stringify({LANG_META, RTL_LANGS:[...RTL_LANGS], I18N, _EXTRA_T,
  inlineCallCount:inlineCalls.length, unresolved, languageChecks, aliases, missing,
  localRecordCount:localRecords.length, unresolvedRecords, dateChecks}));
"""
    )
    # The data slice is far too large for a Windows CLI argument (`node -e`),
    # so write it to a temp script file and run that instead.
    cache_dir = I18N_PATH.parents[2] / ".pytest_cache"
    cache_dir.mkdir(exist_ok=True)
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8", dir=cache_dir) as f:
        f.write(script)
        script_path = f.name
    try:
        result = subprocess.run(
            ["node", script_path], capture_output=True, text=True, timeout=30,
            encoding="utf-8",
        )
    finally:
        Path(script_path).unlink(missing_ok=True)
    assert result.returncode == 0, f"node eval failed: {result.stderr}"
    return json.loads(result.stdout)


@pytest.fixture(scope="module")
def data():
    return _load_i18n_data()


def test_lang_meta_has_all_13_canonical_languages(data):
    codes = {l["code"] for l in data["LANG_META"] if l.get("canonical")}
    assert codes == set(CANONICAL_LANGS)


def test_rtl_langs_are_exactly_ar_ur_fa(data):
    assert set(data["RTL_LANGS"]) == {"ar", "ur", "fa"}


def test_all_i18n_keys_have_all_canonical_languages(data):
    missing = {}

    def check(node, path):
        if not isinstance(node, dict):
            return
        if "en" in node:
            gaps = [lang for lang in CANONICAL_LANGS if not node.get(lang)]
            if gaps:
                missing[path] = gaps
        else:
            for key, value in node.items():
                check(value, f"{path}.{key}")

    check(data["I18N"], "I18N")
    assert missing == {}


def test_extra_t_keys_have_all_canonical_languages(data):
    # _EXTRA_T backs _resolveT(lat, cyr, ru, en, lang), which resolves uz/uz_cyr/ru/en
    # directly from the caller's inline arguments and only falls through to _EXTRA_T
    # for every other language — so en/ru/uz are correctly absent from this table.
    extra_t_langs = [l for l in CANONICAL_LANGS if l not in ("en", "ru", "uz")]
    missing = {
        key: [l for l in extra_t_langs if not val.get(l)]
        for key, val in data["_EXTRA_T"].items()
    }
    missing = {k: v for k, v in missing.items() if v}
    assert missing == {}, f"{len(missing)} _EXTRA_T keys missing languages"


def test_no_unicode_replacement_character_anywhere(data):
    blob = json.dumps(data, ensure_ascii=False)
    assert "�" not in blob


def test_every_literal_inline_label_resolves_for_all_canonical_languages(data):
    assert data["inlineCallCount"] > 400, "Production inline UI calls were not scanned"
    assert data["unresolved"] == [], json.dumps(data["unresolved"], ensure_ascii=False, indent=2)


def test_document_language_direction_and_labels_follow_canonical_state(data):
    for lang, value in data["languageChecks"].items():
        assert value["lang"] == lang
        assert value["dir"] == ("rtl" if lang in {"ar", "ur", "fa"} else "ltr")
        assert value["label"] == data["I18N"]["choose_language"][lang]


def test_screen_local_ui_maps_resolve_without_mixed_language_fallback(data):
    assert data["localRecordCount"] > 80, "Screen-local UI language maps were not scanned"
    assert data["unresolvedRecords"] == [], json.dumps(data["unresolvedRecords"], ensure_ascii=False, indent=2)


def test_locale_normalization_preserves_saved_legacy_and_accepts_browser_tags(data):
    assert data["aliases"] == {
        "EN-us": "en", "ar-SA": "ar", "ur_PK": "ur", "fa-IR": "fa",
        "bn-BD": "bn", "in-ID": "id", "ms-MY": "ms", "uz-Latn": "uz",
        "uz-Cyrl-UZ": "uz_cyr", "uz_cyr": "uz_cyr", "kk": "kk", "tg": "tg",
        "ky": "ky", "unknown": "uz",
    }


def test_missing_ui_copy_never_silently_falls_back_to_uzbek_or_english(data):
    for lang in CANONICAL_LANGS:
        unavailable = data["I18N"]["translation_unavailable"][lang]
        assert data["missing"][lang]["keyed"] == unavailable
        if lang not in {"uz", "ru", "en"}:
            assert data["missing"][lang]["inline"] == unavailable


def test_date_labels_share_the_canonical_calendar_and_all_locale_month_names(data):
    for lang in CANONICAL_LANGS:
        assert len(data["I18N"]["calendar_gregorian_months"][lang]) == 12
        assert len(data["I18N"]["calendar_hijri_months"][lang]) == 12
        assert len(data["I18N"]["calendar_week_days"][lang]) == 7
        result = data["dateChecks"][lang]
        month = data["I18N"]["calendar_hijri_months"][lang][3]
        assert result["hijri"] == f"14 {month} 1448"
        assert result["hijriApi"] == result["hijri"]
        assert result["hijriMonth"] == month
        assert "M09" not in result["gregorian"]
        if lang != "ru":
            assert data["I18N"]["calendar_gregorian_months"][lang][8] in result["gregorian"]
    assert data["dateChecks"]["uz"]["gregorian"] == "27 sentabr 2026"
