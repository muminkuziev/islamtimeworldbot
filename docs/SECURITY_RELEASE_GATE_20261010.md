# IslamTimeWorld 1.0.9 Security and Release Gate

Date: 2026-10-10. Worktree branch: hardening/webapp-20261010.

## Applied changes
- Public /health returns liveness only, not webhook URL, database user counts, internal scheduler state or secret-bearing endpoint suffixes.
- Telegram webhook supports X-Telegram-Bot-Api-Secret-Token through independent TELEGRAM_WEBHOOK_SECRET. With this configured, the old token-in-URL route is rejected. Legacy routing remains compatible only if the new secret is not configured.
- GET/POST Telegram user location, notification preferences and daily briefing verify signed Telegram WebApp initData and bind it to the requested user.
- Admin REST routes require signed Telegram initData from an authorized admin or ADMIN_API_SECRET in X-Admin-API-Key. A bare admin_id is not authentication.
- Logs avoid webhook token and precise location data.
- Qibla and mosque map messages translated into canonical locales; Arabic daily ayah metadata agrees with provider registry.
- PWA cache bumped; privacy text corrected; Android release 1.0.9 versionCode 10; iOS project build 10.

## Critical rollout prerequisites
1. Identify the Render service actually serving islamtimeworld.com. On 10 October its public health start time matched islamtimeworldbot-dbup.onrender.com, NOT the separately connected islamtimeworld-webapp-live.onrender.com. Deploying the latter is NOT confirmed to update the public domain.
2. Rotate the previously exposed BOT_TOKEN in BotFather. Treat it as compromised. A new webhook secret is NOT a substitute for BotFather rotation.
3. Generate a random independent TELEGRAM_WEBHOOK_SECRET (8-256 allowed A-Z a-z 0-9 _ -) in the actual live service's secret environment; never put it in GitHub or frontend code.
4. For standalone admin REST bot calls, configure the same random ADMIN_API_SECRET in the trusted client and server. If missing, the REST admin routes intentionally reject calls.
5. Verify webhook delivery and ensure only one active scheduler, avoiding duplicate reminders.
6. Check public /health liveness response has no secret/internal fields; unauthenticated location and preference requests get 401; spoofed admin IDs get 403.
7. Live-test mosque Overpass fallback, GPS and map in multiple cities, Qibla sensor calibration, RTL and notification permissions.
8. Review privacy policy and confirm actual data retention/deletion operations.
9. Android: sign and verify a v1.0.9 AAB before Play Console internal testing; iOS: macOS/Xcode build, signing and TestFlight remain pending.

## Verification scope
- Local Python and Node regressions, Chrome viewport checks and Android Gradle build results appear in local .qa-hardening-* logs.
- Production remains unchanged until new code reaches the service actually backing the domain.
- Remote FCM push still requires Firebase configuration and production verification.
- Passing tests does not prove 100% security or app-store approval.
