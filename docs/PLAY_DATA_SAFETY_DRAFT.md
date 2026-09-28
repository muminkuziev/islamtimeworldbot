# Google Play Data Safety Draft — IslamTimeWorld

This is a **submission worksheet**, not a declaration already filed in Play Console.
Before submitting, verify the production backend and every third-party SDK because
Google Play requires the declaration to match actual behavior across distributed versions.

## Confirmed app capabilities

The Android manifest requests:
- precise and approximate location;
- notification permission;
- vibration;
- network access;
- boot-completed handling for notification restoration.

The app integrates Firebase Cloud Messaging and location-aware features.
The public privacy policy currently discloses:
- GPS coordinates for prayer times / nearby mosques;
- Telegram user ID, first name and language code when used through Telegram WebApp;
- Android FCM device token stored for push delivery;
- request logs containing IP address, timestamp and endpoint, retained for 30 days;
- OpenWeatherMap, OpenStreetMap/Overpass, Firebase and Render infrastructure.

Public privacy URL:
`https://islamtimeworld.com/privacy`
## Likely Data Safety answers — verify before filing

### Location
**Precise location:** likely YES, collected/processed for app functionality.
Purpose: prayer times, Qibla/location-aware experience, nearby mosques.
Verify whether exact coordinates leave the device for APIs/backend. If they are only
processed ephemerally, apply Google's ephemeral-processing rules accurately.

**Approximate location:** likely YES where city/region is derived or cached.
Purpose: app functionality.

### Personal info
**Name:** conditional. Telegram first name is received only when the Telegram WebApp
context is used. Confirm whether the Play-distributed Android app transmits/stores it.

**User IDs:** conditional. Telegram user ID is disclosed by the current privacy policy.
Confirm whether the standalone Android Play build uses it.

### Device or other IDs
**FCM registration token:** YES for push notification delivery.
Treat it as a device/app identifier for the Data Safety questionnaire as applicable.
### App activity / diagnostics
The privacy policy states anonymous request logs include IP, timestamp and endpoint.
Map this carefully to Play's data categories based on what the production server
actually records. Do not declare "no collection" if request telemetry is retained.

## Sharing / third parties to verify

- Google Firebase: push messaging infrastructure.
- OpenWeatherMap: weather requests.
- OpenStreetMap / Overpass: nearby mosque lookup.
- Render: backend hosting/storage.

For each provider, determine whether the transfer qualifies as "sharing" under
Google Play's Data Safety definitions or one of the stated exceptions.

## Security practices

Current technical evidence:
- app cleartext networking disabled;
- mixed content disabled;
- production WebView debugging disabled;
- signing configured;
- production dependency audit reports 0 known vulnerabilities;
- privacy policy and terms are publicly reachable over HTTPS.

Only select "data encrypted in transit" after confirming every production data path
uses HTTPS/TLS, including backend-to-third-party calls.
## Deletion / account questions

No account/password creation flow was found in the current project scan.
The privacy policy provides a contact email for deletion requests and local reset controls.

If account creation is added later, Google Play's account-deletion requirements become
applicable and both in-app and web deletion paths must be implemented and declared.

## Play Console checklist

Before clicking Save/Submit:
- [ ] Re-check backend database schema for stored FCM tokens and any location fields.
- [ ] Re-check production logs and retention.
- [ ] Confirm whether Telegram identity data is used by the Android Play build.
- [ ] Confirm all third-party SDK data flows.
- [ ] Confirm encryption in transit for all collected/shared data.
- [ ] Match every Data Safety answer to the public privacy policy.
- [ ] Update privacy policy first if behavior differs.
- [ ] Do not infer "not collected" merely because a permission is optional.

Google Play requires Data Safety information to describe the actual app behavior;
source-code permissions alone are not sufficient evidence.
