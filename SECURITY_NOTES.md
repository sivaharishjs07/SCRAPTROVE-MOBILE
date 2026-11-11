# Security Notes: Scrap Trove Mobile

For developers and reviewers of the Android app. Every statement here was
checked against the code on 2026-11-11 (security review tasks S1 to S9).
Where something depends on the backend or the client and could not be
checked, it says so.

Related documents:

| Document | What it covers |
|---|---|
| `docs/BACKEND_SECURITY_CHECKLIST.md` | What the backend must enforce (ownership, roles, sessions, uploads) |
| `docs/LOGOUT_CHECKLIST.md` | Everything logout clears, and a manual test |
| `docs/MAPS_MIGRATION_PLAN.md` | Moving maps and geocoding from OpenStreetMap to Google before launch |
| `PLAYSTORE_READINESS_TASKS.md` | The review and Play Store task list |

---

## 1. Runtime and builds

- Expo SDK 51, React Native 0.74.5, JavaScript engine Hermes (Expo
  default; no `jsEngine` override in `app.json`). Android only; the `ios`
  block in `app.json` is not built or tested.
- **SDK 51 targets Android API 34. Google Play requires API 36 for new
  apps and updates since 31 Aug 2026**, so the app cannot be published
  until the SDK upgrade (task P2, plan: SDK 54) is done.
- Package `com.scraptrove.app`. Expo project `scrapx`, owned by the Expo
  account `vishaldurai-ind` (the signing keystore lives in that account's
  EAS credentials).

| `eas.json` profile | Output | API (`EXPO_PUBLIC_API_URL`) | OTA channel |
|---|---|---|---|
| `development` | Dev client | `https://api.stage.scraptrove.com` | `development` |
| `preview` | APK (install directly) | `https://api.stage.scraptrove.com` | `preview` |
| `production` | AAB (Play upload), versionCode auto-incremented | `https://api.scraptrove.com` | `production` |

- Version: user-facing `version` in `app.json` (raised by hand; also the
  OTA runtime, see section 9). `versionCode` is stored and incremented by
  EAS (`appVersionSource: "remote"`); the Expo account owner initialises it
  once with `eas build:version:set -p android`.
- GitHub Actions (`.github/workflows/`), both manual for production:
  - `build-staging-apk.yml`: EAS cloud build. Runs automatically on pushes
    to `main`/`durai` with the `preview` profile only.
  - `build-staging-apk-local.yml`: same build on a GitHub runner.
  - `preview` produces `scraptrove-staging.apk`, `production` produces
    `scraptrove-production.aab`. Neither uploads to Play or publishes OTA
    updates.

## 2. Secrets and configuration

The app contains no server secrets.

| Item | Where | Notes |
|---|---|---|
| `google-services.json` | Committed | Firebase client config (FCM). Its API key is meant to ship in the app; the client should restrict it in Google Cloud Console (Android app + SHA-1, FCM APIs only). It also lists the old package `com.scrapx.app`. |
| `EXPO_TOKEN` | GitHub repository secret | The only secret the workflows use. It can build **and** publish OTA updates; see section 9. |
| Android signing keystore | EAS credentials (Expo account) | Never in the repo. Becomes the Play upload key on first upload. |
| Google Play service-account key | Not created | Only needed for automatic `eas submit`. Must never be committed. |
| `.env.local` | Local only, git-ignored | Sets `EXPO_PUBLIC_API_URL` for `npx expo start`. Builds take it from `eas.json`. |

History scan (S1): no private keys, service-account files, `.env` files,
keystores or tokens were found in this repository's git history. The
history starts at a "snapshot for security review" commit (2026-08-26);
the earlier original repository was not scanned.

## 3. Login and session

- Login: mobile number, then OTP (`/auth/send-otp`, `/auth/verify-otp`),
  then a session token sent as `Authorization: Bearer <token>`.
- **The token is stored in `expo-secure-store`** (Android Keystore), key
  `session_token`. A new user's token from `verify-otp` is kept as
  `pending_auth_token` until sign-up finishes. Code: `src/services/authToken.js`.
- Builds before 1.1.0 kept the token in plain AsyncStorage (`user.token`,
  `auth_token`). On first launch it is moved to SecureStore and the plain
  copy deleted only after the move succeeds; users stay logged in.
- The token is read by the axios request interceptor (`src/services/api.js`),
  not stored in axios defaults.
- **HTTP 401** on a request made with the current session token logs the
  user out once and shows "Signed out". 401 from the OTP endpoints, from
  the sign-up token, or from a previous session is ignored. 403 never logs
  out. (The backend must use 401 for expired/revoked tokens; not yet
  confirmed.)
- On every return to the foreground the app calls `/auth/me`: suspension
  changes are picked up, and if the seller/dealer profile has disappeared
  the user is logged out.
- **Logout** clears every token, the cached profile, the saved pickup
  address, the in-memory order draft, the push registration cache,
  notifications in the tray, and the device's FCM token; dealers are set
  offline on the server first. Full list: `docs/LOGOUT_CHECKLIST.md`.
- **Not possible from the app:** revoking the token on the server (no
  logout endpoint exists) and unlinking the push token on the server.
  Token lifetime is unknown (an older note said 90 days; not confirmed).
- No PIN or biometric lock inside the app; the phone's lock screen is the
  only barrier.

## 4. Data stored on the phone

| Data | Where | On logout |
|---|---|---|
| Session token, sign-up token | SecureStore (encrypted) | Deleted |
| Cached profile (no token) | AsyncStorage `user` | Deleted |
| Role | AsyncStorage `userType` | Deleted |
| Last pickup address (written after each order) | AsyncStorage `savedAddress` | Deleted |
| Order draft (address, GPS, photo paths) | Memory only | Reset |
| "Push token already registered" flag | AsyncStorage `push_token_registered` | Deleted |
| When notifications were last asked for | AsyncStorage `notifications_asked_at` | Deleted |
| Language | AsyncStorage `language` | Kept |
| Picked photos | App cache folder | Deleted after a successful submit |

- AsyncStorage is not encrypted; it only holds the items above.
- `android:allowBackup="false"`: app data is not copied to Google Drive
  backups.

## 5. Network

- Release builds only talk to an `https://` API address; an `http://`
  `EXPO_PUBLIC_API_URL` is refused (allowed only in development). No
  `http://` URLs exist in `src/`, and the app does not enable cleartext
  traffic.
- Timeouts: 60 s for API calls (the backend has slow cold starts) and for
  the city-list fetches; 10 s for address lookup.
- Error text: 4xx messages from the server are shown as sent; 5xx text is
  replaced by a generic message in release builds.
- Logging: no `console` output in release builds (all calls are behind
  `__DEV__`). Tokens, phone numbers, OTPs and addresses are never logged.
- `axios` 1.21.0 (no open advisories). Remaining `npm audit` findings are
  in build tooling (Expo CLI, Metro, Babel), not in the shipped app; most
  are fixed by the SDK upgrade.

## 6. Photo uploads

- Photos (order, bulk order, dealer registration, order completion) are
  resized to at most 1600 px on the long side and re-encoded as JPEG 0.7
  before upload (`src/services/photoUpload.js`, `expo-image-manipulator`).
  Re-encoding drops EXIF metadata such as GPS.
- Sent as base64 to `POST /upload`; the backend stores them in Cloudinary.
- Uploads run one at a time and stop at the first failure; an order,
  registration or completion is never sent with photos missing.

## 7. Third-party services used by the app

| Service | Used for | Data sent |
|---|---|---|
| Scrap Trove API (Cloudflare Workers) | Everything | Account, orders, addresses, photos, device model |
| Expo push + Firebase Cloud Messaging | Notifications | Expo push token, device |
| Expo Updates (`u.expo.dev`) | OTA updates | Runtime version, channel, platform, an installation ID (`EAS-Client-ID`) |
| Android geocoder (Google Play services) | Address from GPS on the pickup and address screens | Coordinates |
| Nominatim (OpenStreetMap) | Address from GPS on bulk sign-up and company address edit (**interim**) | Coordinates |
| OpenStreetMap tiles + Leaflet from unpkg.com | Map pin picker (**interim**) | Map area viewed, IP |
| Cloudinary (via our backend) | Photo hosting | Photos (the app never calls Cloudinary directly) |
| MSG91 (via our backend) | OTP SMS | Phone number (the app never calls MSG91 directly) |
| WhatsApp (`wa.me` links), phone dialler, Google Maps links | Contacting support/dealers, navigation | Only what the user sends after the link opens |

The Nominatim and OSM tile use follows their usage policies as an interim
measure (app User-Agent, exact tile URL, attribution) and is to be
replaced by Google before launch: `docs/MAPS_MIGRATION_PLAN.md`.

## 8. Android permissions

Final merged list (checked from the generated manifest and every library
manifest; confirm on a built APK with `aapt dump permissions`):

| Permission | Why |
|---|---|
| `CAMERA` | Photos of scrap and of completed pickups |
| `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION` | Pickup address from GPS, map pin (foreground only) |
| `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE` | Required by the photo picker on Android 12 and below; no effect on 13+ |
| `POST_NOTIFICATIONS` | Order notifications (Android 13+) |
| `INTERNET`, `ACCESS_NETWORK_STATE`, `VIBRATE` | Normal permissions |

Explicitly blocked: `RECORD_AUDIO`, `RECEIVE_BOOT_COMPLETED`,
`SYSTEM_ALERT_WINDOW`. No background location, no `READ_MEDIA_*`.
All requests go through `src/services/permissions.js`: a short explanation
first ("Not now" / "Continue"), then Android's prompt; if a permission is
blocked, the app explains and offers "Open Settings". Denial never crashes;
address entry falls back to typing. Notification permission is never
requested at launch or login: it is asked in context (after a seller places
a pickup, when a dealer goes online), at most once every 7 days after
"Not now", and never again once blocked.

## 9. Over-the-air (OTA) updates

**Enabled.** `expo-updates` checks for an update on every launch
(`checkAutomatically: ON_LOAD`), downloads it in the background
(`fallbackToCacheTimeout: 0`) and applies it on the next launch. Updates
are published with `eas update` to the `preview` or `production` channel;
no workflow publishes them automatically.

Rules for publishing:

1. **Runtime version = app version** (`runtimeVersion.policy:
   "appVersion"`). An update only reaches builds with the same `version`.
   **Whenever native code changes (adding, removing or upgrading a native
   package, permissions, `app.json` native settings), raise `version` and
   ship a new build.** Otherwise the update reaches builds without that
   native code and can crash them.
   Version 1.1.0 is the first runtime with the security changes (new
   native modules `expo-image-manipulator` and `expo-application`, removed
   camera/audio packages, permission changes). Builds on 1.0.x cannot
   receive updates made from this code, by design.
2. OTA updates may fix bugs and change JavaScript behaviour, but must not
   change the app's core purpose (Google Play policy).
3. Publish to `preview` first and test on the staging build before
   `production`.

Open points:

- **No update code signing.** Anyone who can publish to this Expo project
  (account members, or anyone holding `EXPO_TOKEN`) can push JavaScript
  to every installed app. Expo's end-to-end update code signing requires
  the Expo **Production or Enterprise plan**. If the client takes one: the
  private key is kept outside the repository (password manager / KMS);
  only the certificate is committed.
- Replace the GitHub `EXPO_TOKEN` with a robot-user token that has only
  the rights the workflows need, and limit who can run `eas update`.
- After the SDK upgrade (P2), consider the `fingerprint` runtime policy,
  which changes the runtime automatically when native code changes.

## 10. Trust boundaries

- The app only hides screens by role (seller, dealer, pending dealer,
  suspended seller). Anyone with a token can call any endpoint, so every
  permission check must be on the backend: `docs/BACKEND_SECURITY_CHECKLIST.md`.
- Push notification taps open the order ID carried in the notification;
  the backend must check ownership, and the client should enable Expo push
  security.
- Deep links: Android registers a `com.scraptrove.app://` scheme (Expo
  default), but the app has no linking configuration and reads no incoming
  URLs, so links cannot open specific screens.
- WebViews only show the built-in map page; links open in the browser and
  messages from the page are validated.

## 11. Known open issues

| Issue | Status / owner |
|---|---|
| Target API 34; Play needs 36 | SDK upgrade, task P2 |
| No in-app account deletion | Task P4; needs a backend endpoint and a public deletion page: `docs/ACCOUNT_DELETION_REQUEST.md` |
| No dealer login path (`UserTypeScreen` offers sellers only); existing dealers who log out cannot log back in | Client decision |
| Returning dealers are shown the full dealer screens whatever their approval status (only reachable once dealer login exists) | App fix pending; backend must enforce |
| Rating screen uses `POST /ratings` without the order ID and hides errors | App fix pending; backend question |
| Server-side logout, push token ownership, 401 semantics, OTP rate limits | Backend checklist |
| Maps/geocoding on OpenStreetMap (no SLA) | Move to Google before launch |
| Some new messages are English-only (marked `TODO(client)`) | Client to supply Tamil text |
