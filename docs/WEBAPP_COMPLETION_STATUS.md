# WebApp completion status — 27 September 2026

Historical QA status before deployment authorization: implementation and local verification substantially advanced; quality gates remain open. The owner subsequently explicitly requested deployment of this current version followed by an update of the installed phone app. That instruction authorizes deployment while the content/reference gaps below remain documented; it does not convert them into completed gates.

## Preserved boundaries

- Existing modified files were inspected and copied to `backups/completion-20260927/` before changes. Existing unrelated/untracked work was retained.
- No reset, clean, blanket staging, commit, push, deployment, Android build/install, or Google Play action was performed.
- Public landing files were not edited. Production user databases, real bot credentials and unrelated projects were not used for QA.
- Tests/browser work used isolated `ISLAMTIME_QA_MODE=1`, `.qa-runtime/users-test.db`, an empty bot token and disabled scheduler/bot initialization.

## Implemented

- Shared canonical 13-language normalization, RTL for Arabic/Urdu/Persian, strict unavailable states, language persistence, complete ordinary UI keys and explicit localized Gregorian/Hijri dates.
- Home/Quran/Prayer/Mosques/More navigation; retained access to secondary modules and Quran reader navigation.
- DAY/NIGHT/AUTO with persisted override, solar calculation from current/last-known coordinates, system fallback and resume/transition handling. Location status distinguishes cached coordinates from fresh GPS.
- Reference-based screen refinements, night contrast, responsive overflow corrections, real Qibla Earth canvas, and source-backed Quran header quotations.
- Quran exact-edition and verse alignment checks, all 114 surahs/6,236 verses metadata, guarded asynchronous reader updates, correct audio offsets, working search/filter/bookmark controls and preserved original religious text.
- Hadith source filters/search/pagination/detail and daily API backed by the existing verified corpus. Corpus remains 144 common IDs x 13 languages = 1,872 records. Actual grades/attribution replace universal fabricated labels.
- Calendar Quran cards now use exact provider editions for nine full verses across eight events; 97:3 and 97:4 are separate, validated passages. Religious passages are never generated or silently translated by AI.
- Prayer calculation method and madhab school now agree across Settings, Home, daily/monthly requests and cache keys. Numeric Hijri month, Windows timezone support and stale-request protection added. Daily ayahs now use the same validated edition registry without language fallback or text transformation; Bengali/Persian/Malay weather and AQI labels are included.
- Prayer daily-content buttons work, compact verses can expand, and Quran reader Back remains visible.
- Dhikr stable IDs restored, Indonesian text separated from IDs, and old counter keys migrated without deleting user progress or double-counting totals.
- Unverified Haramayn LIVE claims removed; official-source availability is distinct from confirmed live playback.
- Mosque list errors remain errors, available results render promptly, radius widening is explicit, stale requests/cache coordinates are checked, and hardcoded Friday/congregation claims are removed. Saves persist locally and directions use the selected coordinates.
- Live Overpass/Nominatim access is denied in this QA browser environment. Real result freshness remains unverified; fixture checks must not be represented as live results.
- Service worker v28 handles versioned boot assets offline from the current build cache and preserves successful precache entries when another asset fails.

## Verification evidence

- Python suite: **105 passed**, one dependency deprecation warning, in 59.51 seconds. Daily-ayah tests verify all 13 exact editions and reject mismatched sources/verses.
- JavaScript regression suites: **45 passed**, covering theme, Quran/Hadith providers, calendar quotations, prayer preferences, Dhikr migration, service worker and mosque behavior.
- I18n checks: 11 passed, including canonical language coverage, literal/local-map UI labels, RTL and shared dates.
- Responsive matrix: 76 screenshots, zero captured JavaScript page errors and zero horizontal screen/document overflows. Coverage includes 390x844, 360x800, 412x915 and 1440x900; primary screens include Arabic/Persian/Bengali/Malay. Some timed Hadith/Mosque captures show loading, so the matrix alone is not a visual pass.
- Screenshot matrix/report: `../.qa-runtime/final-screens/` and `../.qa-runtime/final-screens/report.json`.
- Interactive checks passed for theme persistence, calculation method/school, Hadith search/source/detail, Dhikr counters, Qazo steps, RTL, prayer daily tabs/expansion, offline shell and cached Quran. See `../.qa-runtime/flows/report.json`.
- The Quran follow-up passed search, filters after tab changes, exact seven-verse reader, bookmarks, actual audio playback and visible Back navigation: `../.qa-runtime/quran-final/report.json`. This supersedes the initial audio check that asserted before buffering finished.
- Final edge checks passed Qibla tabs/unknown accuracy, four exact source blocks for Qadr 97:3-4, browser location-denial/retry, and current-source daily prayer cards: `../.qa-runtime/edge-final/report.json`.
- The additional mosque pytest wrapper also passed. Mosque verification includes local-save persistence after full reload, correct directions coordinates and explicit 25 km radius requests. Its day/night fixture images and genuine blocked-network error image are labeled in `../.qa-runtime/mosques-check/verified-report.json`.
- All **34 non-vendored JavaScript files** parse. `git diff --check` passed, and approved landing files have no diff.
- Updated loaded Prayer screenshots at all requested widths and the visible Quran reader Back control are in `../.qa-runtime/final-reviewed/`.

## Hard gates still open

| Gate | Outstanding evidence/content |
|---|---|
| Approved design contract | Only five canonical images exist in `design_refs/`. The Dhikr & Salawat reference is missing. No six-screen visual approval claim is possible. |
| Duas | Existing 22 records lack Bengali, Persian and Malay translations. |
| 99 Names | Meanings lack Turkish/Bengali/Persian/Malay; descriptions currently cover only English/Uzbek/Russian. Turkish transliterations are not presented as meanings. |
| Dhikr & Salawat | Five existing dhikr records lack Turkish/Bengali/Persian/Malay meanings; no Salawat record is present. |
| Shahada | Meanings cover English/Uzbek/Russian plus Arabic original; nine non-Arabic canonical translations remain absent. |
| Calendar secondary texts | Eleven Hadith and nine dua cards have Arabic/Uzbek content with incomplete provenance; several references are ambiguous. Quran cards have been repaired separately. |
| Six Kalimas | Verified sourced content is still pending; the existing unavailable card is honest but not a completed module. |
| Device/runtime QA | Real compass accuracy, sensor permission paths, physical Android safe areas/back behavior, signed upgrade and USB-device QA require actual device evidence. |
| Release | Full verified-content coverage and six-reference visual acceptance are not met. Production deployment, post-deploy live QA and Android work therefore remain unstarted. |

## Verified source candidates for the remaining import

These are research candidates, not already approved or imported data. Each record must be matched by Arabic text/reference, with exact edition/translator/source retained. Publication availability does not prove all existing records are covered.

- Persian Hisnul Muslim: https://islamhouse.com/fa/books/647/ (PDF/DOCX, named translator/reviewer).
- Turkish Hisnul Muslim: https://islamhouse.com/ar/books/861/ (PDF/DOC, named translator/reviewer).
- Malay Perisai Muslim: https://islamhouse.com/ar/books/1121/ (PDF, named translator/reviewer).
- Bengali selected authentic duas: https://islamhouse.com/ar/books/2838069/ (DOCX; coverage of the app's 22 records not yet aligned).
- Bengali explanation of names: https://islamhouse.com/ar/books/2830219/ (PDF/DOCX).
- Structured Names dictionary: https://terminologyenc.com/en/browse/category/758 and example https://terminologyenc.com/en/browse/term/176539 (Bengali/Persian/Turkish; 98 entries differ from this app's enumeration, and Malay was not present in the checked entry).
- Dhikr source: https://hadeethenc.com/en/browse/hadith/6211; Shahada in Adhan context: https://hadeethenc.com/en/browse/hadith/65086. Per-item API probes for the remaining target languages returned 403; availability remains unverified rather than presumed absent.
- Malay Shahada publication: https://islamhouse.com/ms/articles/503/.

Exact record matching and each publication's reuse terms need verification before a production import. No blanket redistribution license was established by this research.

## Handoff

Continue from the current WIP; do not replace it wholesale. Supply the missing approved Dhikr reference and settle the source editions/record alignment for the remaining devotional text. Re-run loaded-screen visual QA after the final content and UI changes, then satisfy the user's WebApp gate before normal main/Render deployment. Android signing, builds and safe-update work belong after successful live WebApp verification.
