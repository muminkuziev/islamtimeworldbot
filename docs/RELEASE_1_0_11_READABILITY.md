# IslamTimeWorld 1.0.11 — photo header readability hotfix

Date: 2026-10-10. Based on 1.0.10 commit eb6f6e4.

## User-reported problems resolved in code
- Hadith hero (Quran 53:3): verse and source were extremely small and partially transparent over a bright image. Dedicated semi-opaque dark backing, larger white text and higher-contrast source citation preserve the unchanged verse.
- 99 Names hero (Quran 20:8): photo ended before the verse and the translation could blend into the pale background. The hero photo/scrim now covers the responsive header, with a legible dark backing for the full verse and reference.
- PWA offline precache now includes hero-contrast-fixes.css. Without this, fresh offline boot could omit the new style and fail the existing boot asset regression test.
- Product version incremented to 1.0.11 (Android versionCode 12) and cache version updated.

## Verification
- Local Python tests: 153 passed.
- Local JavaScript tests: 110 passed, including 3 additional hero contrast tests.
- Browser: Day and Night, 320, 360, 390, 412, 768 px, Hadith and Names = 20 distinct layout checks passed. Both verse blocks end before controls and no horizontal overflow.
- Native debug/release and lint are separately checked before signing/deploy (local .qa-v111-* logs).

## Zikr vibration finding
On the Samsung A55, Android System setting haptic_feedback_enabled=0. Existing 1.0.10 calls native Capacitor Haptics correctly in automated tests, but a disabled system haptic preference can suppress tactile feedback. DO NOT change device-wide settings remotely without explicit user approval. For local testing, user can enable Samsung Settings > Sounds and vibration > System vibration (Touch interactions) and check intensity. Native motor validation remains pending.

## Production caveats
- Old Telegram BOT_TOKEN still requires owner-side rotation (historic exposure).
- Mosque provider occasionally returns HTTP 503.
- Google Play Console account not yet created.
- iOS release still needs Xcode signing.
- UI changes should be deployed after an authenticated backup branch is verified.
