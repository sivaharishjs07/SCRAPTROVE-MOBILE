# Scrap Trove Mobile: Security Review and Play Store Readiness

Task sheet for the team. Each person works through it with Claude Code in VS Code.

## How to use this file

1. Open the repo in VS Code and start Claude Code.
2. Paste the **Master Prompt** below as your first message.
3. Then paste ONE task at a time (for example "Task S1"). Review the diff before moving on.
4. Use one git branch per task, for example `sec/s1-secure-token`. Do not commit to `main` directly.

---

## MASTER PROMPT (paste first)

```
You are helping me harden and prepare an existing React Native app for Google
Play release. Read this fully before touching anything.

PROJECT CONTEXT
- App: "Scrap Trove", a marketplace where sellers post scrap/e-waste pickups
  and dealers accept them. It also has "Yard Finds" and a bulk-pickup flow.
- It was built by a client using AI tools. Assume code quality is uneven and
  the existing docs may be wrong. Verify every claim against the code.
- Stack: Expo SDK 51 (managed workflow), React Native 0.74.5, Hermes, JS (no
  TypeScript). Android only for now. Package: com.scraptrove.app.
- Backend is a separate project that we do NOT have. The app talks to
  https://api.scraptrove.com (prod) and https://api.stage.scraptrove.com
  (staging) via axios in src/services/api.js. Use EXPO_PUBLIC_API_URL.
- Auth: mobile number -> OTP -> 64-hex session token, sent as
  "Authorization: Bearer <token>". State lives in src/context/AppContext.js.
- Key files: app.json, eas.json, package.json, SECURITY_NOTES.md,
  src/services/api.js, src/context/AppContext.js, src/navigation/index.js,
  src/screens/**, .github/workflows/*.
- Third parties: Firebase Cloud Messaging / Expo push, Nominatim (reverse
  geocode), OpenStreetMap tiles, Cloudinary (via backend), MSG91 (via backend),
  WhatsApp wa.me deep links.

GOAL
Security-review the app, fix what is wrong, and make it compliant so it can be
published on Google Play. The client owns the app. We are doing a review plus
launch for them.

KNOWN ISSUES ALREADY FOUND (verify each, do not assume)
1. eas.json "production" builds an APK. Play needs an AAB.
2. Expo SDK 51 targets Android API 34. Play's required target API is higher,
   so an SDK upgrade is probably needed.
3. SECURITY_NOTES.md says OTA updates are disabled, but app.json enables
   expo-updates. The doc and the code disagree.
4. SECURITY_NOTES.md says logout clears auth_token and pushToken, but
   AppContext.js logout only removes ['user','userType'].
5. The session token is stored in plain AsyncStorage. expo-secure-store is
   already a dependency.
6. app.json declares permissions that may be unused: RECORD_AUDIO,
   READ_EXTERNAL_STORAGE, WRITE_EXTERNAL_STORAGE, RECEIVE_BOOT_COMPLETED.
7. Nominatim and public OSM tiles are used. Their usage policies restrict
   production/heavy use.
8. google-services.json is committed (fine for the client config only).
   Confirm no real secret is in the repo or git history.
9. No in-app account deletion (Play requires it for apps with accounts).

RULES
- Do not change backend contracts, endpoints or response shapes.
- Never commit secrets, keystores (*.jks), .env files or service-account JSON.
- Do not upgrade major dependencies without telling me why and what breaks.
- Make small, reviewable changes. After each change, summarize: what changed,
  why, and how I can verify it.
- If something needs information we do not have (client account, backend
  behavior, legal text), STOP and list exactly what is missing. Do not invent
  it, and do not make up privacy-policy or legal wording as final.
- Before running any command that installs, deletes or rewrites many files,
  tell me what it will do.
- If you are unsure, say so plainly. Distinguish "verified in code" from
  "assumed".

Acknowledge you understand, then wait for my first task.
```

---

## TRACK A: Security review (do now, no client input needed)

### Task S1: Dependency and secrets audit
```
Run `npm audit`, `npx expo-doctor` and `npx expo install --check`. List
vulnerable and mismatched packages, and say which are real risks for a mobile
app versus dev-only noise. Then scan the repo AND git history for secrets (API
keys, tokens, passwords, private keys, service-account JSON) using gitleaks or
trufflehog if available, otherwise grep for common patterns across
`git log -p`. Report findings in a table: file, what, severity, action. Do not
fix anything yet.
```

### Task S2: Move the session token to SecureStore
```
Read src/context/AppContext.js and src/services/api.js. Move the session token
(and anything that grants access) from AsyncStorage to expo-secure-store. Keep
non-sensitive data (language, drafts) in AsyncStorage. Add a one-time migration
so existing logged-in users are not logged out: read the old key, write to
SecureStore, delete the old key. Keep the axios Authorization header behavior
the same. List every place the token is read or written.
```

### Task S3: Fix logout so it clears everything it should
```
Audit AppContext.logout(). It must clear: user, userType, auth_token, the push
token cache, and the token in axios defaults. It should also try to
unregister the push token on the backend if an endpoint exists in api.js (do
not invent one). Decide with me whether savedAddress and orderDraft should
survive logout. They are personal data and should probably be cleared. Add a
short test or manual checklist to prove logout leaves no token behind.
```

### Task S4: API client review
```
Review src/services/api.js. Check: HTTPS only, no hardcoded prod/staging URL
fallbacks that would ship the wrong environment, request timeouts, handling of
401 (should force logout), error messages that leak server details, and
sensitive values logged with console.log. Remove or guard all console.log of
tokens, phone numbers, OTPs and addresses (production builds should not log
them). Report any other cleartext http:// URLs in src/.
```

### Task S5: Authorization and flow review (client side)
```
Review src/navigation/index.js and the screens for role guards. Check whether
a seller can reach dealer screens (and the reverse) by navigation or by deep
link, and whether suspended users or users with incomplete profiles are
blocked. Also check deep-link/URL handling for params flowing into WebViews
or being evaluated. Report findings only. Note that real authorization must
be enforced on the backend. List what we should ask the backend owner to
verify.
```

### Task S6: Input, uploads and permissions
```
Review the photo upload path (PostStep4Screen.js, BulkPostFlow.js), image size
limits, base64 payload size and timeout handling. Review every permission
request (camera, photos, location, notifications): the app must not crash on
denial and must explain why before asking. Check all forms for input
validation (phone, pincode, address).
```

### Task S7: Remove unneeded Android permissions
```
Find out whether the app really uses RECORD_AUDIO, READ_EXTERNAL_STORAGE,
WRITE_EXTERNAL_STORAGE and RECEIVE_BOOT_COMPLETED (grep for expo-av, Camera
video mode, file writes, etc.). Remove the unused ones from app.json. Note
that expo-camera may add RECORD_AUDIO unless configured with
recordAudioAndroid:false in its plugin options. Show the final merged
permission list from a prebuild or the generated manifest.
```

### Task S8: Third-party usage review
```
Review how the app uses Nominatim and OpenStreetMap tiles. State the usage
policy limits (check the current official policy online, do not rely on
memory). Propose a compliant production approach (a paid/hosted geocoder and
tile provider, or proxying via the backend with caching and a proper
User-Agent). Do not switch providers until I approve. List needed API keys and
the cost implications.
```

### Task S9: Update/doc consistency
```
Decide with me whether expo-updates (OTA) should stay on. Play allows OTA JS
updates, but they must not change the app's core purpose. Make app.json,
eas.json, the GitHub workflows and SECURITY_NOTES.md all say the same true
thing. Rewrite SECURITY_NOTES.md so every statement matches the code.
```

---

## TRACK B: Play Store technical readiness (do now)

### Task P1: Build an AAB instead of an APK
```
Update eas.json so the production profile builds an Android App Bundle
("buildType": "app-bundle"). Keep the preview profile as an APK for testing.
Do not touch the staging env values. Also review .github/workflows/*.yml and
tell me which workflow would produce the AAB and what secrets it needs.
List the secrets by name only, without values.
```

### Task P2: Upgrade Expo SDK to meet Play's target API requirement
```
First, check online what Google Play's current minimum target API level is for
new apps and updates, and which Expo SDK satisfies it. Then plan the upgrade
from SDK 51 step by step (Expo's upgrade guide), listing breaking changes for
each dependency we use (expo-camera, expo-notifications, expo-av, expo-image,
expo-location, expo-updates, react-native). Make the plan first and show it to
me. Only execute after I approve. After the upgrade, verify the app still
starts and that login, posting a pickup and push registration still work.
```

### Task P3: Versioning and app identity
```
Check app.json and package.json for consistency: version, android.versionCode
(add it if missing, as an integer that increases on every Play upload), name,
package com.scraptrove.app. package.json says 1.0.0 and app.json says 1.0.3, so
align them. Explain how appVersionSource "local" interacts with versionCode.
Make sure the package name is final. It cannot change after the first upload.
```

### Task P4: In-app account deletion
```
Play requires apps that allow account creation to offer account deletion in
the app, plus a public web URL for it. Check api.js for an existing delete
endpoint. If none exists, do NOT invent one: report that the backend needs
`DELETE /api/auth/me` or similar and draft the exact request for the backend
owner. If it exists, add a "Delete my account" option in the profile/settings
screen with a clear confirmation, call the endpoint, and run the full logout
cleanup afterwards.
```

### Task P5: Permission disclosures and first-run UX
```
Add clear pre-permission explanations for location, camera and notifications
(Android 13+ POST_NOTIFICATIONS needs a runtime request). Make sure the
wording in app.json permission strings is accurate. Location must only be used
for what the user sees (pickup address and nearby dealers). Check that the app
never requests location in the background.
```

### Task P6: Crash and release hardening
```
Check that production builds have no dev-only code: debug menus, test OTP
bypasses, hardcoded test phone numbers, staging URLs and verbose logs. Add an
ErrorBoundary at the app root if missing so a crash shows a friendly screen.
Confirm Hermes is on and that minification is enabled for release. Test the
release build on a real device and a low-RAM device if possible.
```

### Task P7: Store assets and listing draft (no legal text)
```
Check that assets/icon.png is 1024x1024 with no transparency issues, and that
assets/adaptive-icon.png is correctly padded. Create a checklist of needed
store assets: 512x512 icon, 1024x500 feature graphic, at least 4 phone
screenshots. Draft the short (80 chars) and full descriptions from what the
app actually does, for the client to review. Do not claim features that
do not exist.
```

### Task P8: Data Safety form worksheet
```
Read the code and produce a table of every piece of user data the app
collects or sends (phone number, name, address, precise location, photos,
push token, device info, etc.), where it goes (our backend, Cloudinary, Firebase,
Nominatim), why, whether it is optional, and whether it is encrypted in
transit. This will be used to fill Google Play's Data Safety form and the
privacy policy. Mark anything you could not verify as "ask client/backend".
```

---

## TRACK C: Final check (after A and B)

### Task F1: Release candidate checklist
```
Build a preview APK and then an AAB. Walk through this manual test and report
pass/fail: install, first launch, OTP login (staging), seller flow (post a
pickup with photos), dealer flow (receive and accept), push notification,
permission denial for each permission, logout then confirm no token remains,
account deletion, app kill and restore, airplane mode errors. Also run
`npx expo-doctor` and `npm audit` again and report the final status.
```

### Task F2: Security review report
```
Write SECURITY_REVIEW_REPORT.md: summary, each finding with severity
(High/Medium/Low), status (Fixed/Open/Needs backend/Needs client), evidence
(file:line), and remaining risks. Include a list of backend items we could
not verify, so the client can pass it to their backend developer.
```

---

## Things that wait for the client (do NOT guess these)

- Play Console account type and owner, and Expo/Firebase access
- Privacy Policy and Terms URLs, and the account-deletion web URL
- Backend repo or API docs, staging test accounts, backend rate-limit behavior
- Business and legal details, store text approval, final screenshots
- Whether payments are involved

## Suggested order
S1 → S2 → S3 → S4 → S7 → P1 → P3 → S5 → S6 → S8 → S9 → P4 → P5 → P6 → P8 → P2 (the SDK upgrade comes last
because it can break things; finish the fixes first so they are tested together) → P7 → F1 → F2
