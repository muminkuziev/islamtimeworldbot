# IslamTimeWorld 1.0.12 — Uzbek Latin Quran header verse rendering

Date: 2026-10-10. Base: 1.0.11 readability release.

## User-facing correction
The verified Al-Quran Cloud uz.sodik edition by Muhammad Sodik Muhammad Yusuf is served in Uzbek Cyrillic. On screens configured to Uzbek Latin (uz), the same provider text is now mechanically transliterated with the Quran reader's existing Cyrillic-to-Latin converter. This fixes section verses on Hadith (53:3) and Allah's 99 Names (20:8). Selection of Uzbek Cyrillic (uz_cyr) retains the original Cyrillic text. Other language editions, Arabic Quran text, verse numbers and source attributions are unchanged.

## Verification
- Local 153 Python tests passed.
- Local 112 Node.js tests passed, including two new transliteration tests.
- Browser with simulated Al-Quran Cloud source and exact edition metadata: Uzbek Latin headings were Latin; Uzbek Cyrillic headings stayed Cyrillic; attribution stayed Muhammad Sodik Muhammad Yusuf. Passed.
- Day/night and responsive contrast tests from 1.0.11 remain in the codebase.
- AAB and APK are signed using the pre-existing release upload key; build/lint results are in .qa-v112-android.log.

## Remaining platform blockers
The Google Play developer account is not yet created; Google Play release has not been published. Old Telegram bot token rotation, mosque API availability and FCM remote push provisioning remain separate operations.
