"""Uzbek script conversion for display, without changing the source corpus.

This is letter transliteration, not a translation or an editorial correction.
Published source text and source URLs must remain available separately.
"""
import re
import unicodedata


_LETTERS = dict(zip(
    "абвгджзийклмнопрстуфхэқҳ",
    "abvgdjziyklmnoprstufxeqh",
))
_LETTERS.update({
    "ё": "yo", "ж": "j", "ц": "ts", "ч": "ch", "ш": "sh",
    "щ": "sh", "ъ": "'", "ы": "i", "ь": "", "ю": "yu", "я": "ya",
    "ў": "o'", "ғ": "g'",
})
_WORDS = re.compile(r"[А-Яа-яЁёЎўҚқҒғҲҳ]+")
_YE_AFTER = frozenset("аоуэиўяюёеъь")
_APOSTROPHES = str.maketrans({char: "'" for char in "‘’ʻʼ`´ʹ′"})
_DISPLAY_FIELDS = ("title", "text", "explanation", "attribution", "narrator", "grade")


def to_latin(text: str) -> str:
    """Render Uzbek Cyrillic as Latin; keep Arabic, Latin and punctuation intact."""
    def convert(match):
        word = match.group()
        uppercase = word.isupper()
        result = []
        for index, char in enumerate(word):
            lower = char.lower()
            previous = word[index - 1].lower() if index else ""
            # Cyrillic мўъмин has one apostrophe in Latin: mo'min. The
            # apostrophe already belongs to o', so do not duplicate it.
            if lower == "ъ" and previous == "ў":
                continue
            # с + ҳ are separate sounds (Is'hoq/as'hob), not the sh digraph.
            if lower == "ҳ" and previous == "с":
                result.append("'")
            if lower == "е":
                value = "ye" if index == 0 or previous in _YE_AFTER else "e"
            else:
                value = _LETTERS.get(lower, char)
            if char.isupper():
                value = value.upper() if uppercase else value[:1].upper() + value[1:]
            result.append(value)
        return "".join(result)

    return _WORDS.sub(convert, text or "")


def search_key(text: str) -> str:
    """Compare either Uzbek script with case and apostrophe variants normalized."""
    return unicodedata.normalize("NFC", to_latin(text)).translate(_APOSTROPHES).casefold()


def with_latin_display(record: dict) -> dict:
    """Attach a Latin display projection, leaving every published field intact."""
    if record.get("language") != "uz":
        return record
    return {
        **record,
        "display": {
            "language": "uz-Latn",
            **{field: to_latin(record[field]) for field in _DISPLAY_FIELDS if field in record},
        },
    }
