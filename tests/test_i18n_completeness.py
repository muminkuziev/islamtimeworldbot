"""
Completeness gate for webapp/js/i18n.js — the live 17-language registry
(13 canonical + 4 legacy). Parses the file's data literals directly (it's a
plain JS object, not a Python module) so this test breaks if a future edit
reintroduces a missing-translation regression.
"""
import json
import subprocess
import tempfile
from pathlib import Path

import pytest

I18N_PATH = Path(__file__).resolve().parent.parent / "webapp" / "js" / "i18n.js"
CANONICAL_LANGS = ["ar", "en", "id", "ur", "bn", "fr", "hi", "fa", "tr", "ru", "uz", "de", "ms"]

pytestmark = pytest.mark.skipif(
    not I18N_PATH.exists(), reason="webapp/js/i18n.js not found"
)


def _load_i18n_data():
    """Evaluate the data literals (LANG_META/RTL_LANGS/I18N/_EXTRA_T) via Node,
    stopping before the DOM-dependent helper functions, and dump them as JSON."""
    text = I18N_PATH.read_text(encoding="utf-8")
    end = text.index("const _I18N_EN_IDX")
    slice_ = text[:end]
    script = (
        slice_
        + "\nconsole.log(JSON.stringify({LANG_META, RTL_LANGS:[...RTL_LANGS], I18N, _EXTRA_T}));"
    )
    # The data slice is far too large for a Windows CLI argument (`node -e`),
    # so write it to a temp script file and run that instead.
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as f:
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


def test_top_level_i18n_keys_have_all_canonical_languages(data):
    missing = {}
    for key, val in data["I18N"].items():
        if key == "calendar_islamic_events" or isinstance(val, list):
            continue
        if key == "modules_list":
            for subkey, subval in val.items():
                gaps = [l for l in CANONICAL_LANGS if l not in subval]
                if gaps:
                    missing[f"modules_list.{subkey}"] = gaps
            continue
        gaps = [l for l in CANONICAL_LANGS if l not in val]
        if gaps:
            missing[key] = gaps
    assert missing == {}


def test_extra_t_keys_have_all_canonical_languages(data):
    # _EXTRA_T backs _resolveT(lat, cyr, ru, en, lang), which resolves uz/uz_cyr/ru/en
    # directly from the caller's inline arguments and only falls through to _EXTRA_T
    # for every other language — so en/ru/uz are correctly absent from this table.
    extra_t_langs = [l for l in CANONICAL_LANGS if l not in ("en", "ru", "uz")]
    missing = {
        key: [l for l in extra_t_langs if l not in val]
        for key, val in data["_EXTRA_T"].items()
    }
    missing = {k: v for k, v in missing.items() if v}
    assert missing == {}, f"{len(missing)} _EXTRA_T keys missing languages"


def test_no_unicode_replacement_character_anywhere(data):
    blob = json.dumps(data, ensure_ascii=False)
    assert "�" not in blob
