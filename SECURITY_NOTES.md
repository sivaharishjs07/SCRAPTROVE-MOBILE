# Security Notes — Scrap Trove Mobile

For the reviewing developer. React Native (Expo SDK 51) Android app for the same Scrap Trove platform. Talks to the same API as the web dashboard.

---

## 1. Runtime

- **Expo SDK 51** (React Native 0.74)
- **JavaScript engine**: Hermes
- **Distribution**: sideloaded APK today; not on the Play Store yet
- Build via `eas build --local` on GitHub Actions runners

---

## 2. Environment / secrets

The app itself is fully client-side and holds no secrets. Two config files carry non-secret identifiers:

| File | Purpose | Sensitive? |
|---|---|---|
| `app.json` | Expo project id, package name (`com.scraptrove.app`), version | Not secret — public identifiers |
| `google-services.json` | Firebase project config for FCM push (public) | Not sensitive — this is intended to ship inside the APK. Not included in this review repo; get from the owner if you need to test push locally. |

The **Firebase Admin SDK service-account JSON** (which IS secret) lives only on the backend. The mobile app never sees it.

---

## 3. Auth model

Identical to the web dashboard's seller/dealer flow:

- Login: mobile → OTP → session token (64 hex chars)
- **Storage**: `AsyncStorage` keys `user`, `userType`, `auth_token`, `savedAddress`, `orderDraft`, `language`
- **Send**: `Authorization: Bearer <token>` via axios default header
- **Logout**: `AppContext.logout()` clears the AsyncStorage keys

### Session guard (post-issue-9344934606 fix)
On every app foreground, `AppContext.refreshUser()` calls `/api/auth/me`. If the auth token is valid but the profile row is missing on the server (deleted, wiped, or setup never completed), the client force-logs-out so the user re-onboards cleanly. Prevents the "ghost user in local storage" case.

---

## 4. Sensitive data the app handles

| Data | Where stored | Cleared on logout? |
|---|---|---|
| Session token | AsyncStorage `user.token` | ✅ |
| Cached user + seller/dealer profile | AsyncStorage `user` | ✅ |
| Saved pickup address | AsyncStorage `savedAddress` | ❌ (intentional — survives logout for convenience) |
| Order draft (in-progress booking) | AsyncStorage `orderDraft` | ❌ (intentional — survives foregrounding, can be resumed) |
| FCM push token | Registered with backend; local cached in `pushToken` key | ✅ |
| Order photos | React state only; upload to Cloudinary in the same request | Not persisted |
| Language preference | AsyncStorage `language` | ❌ (intentional) |

---

## 5. Third-party integrations shipped in the app

| Service | What is used |
|---|---|
| **Firebase Cloud Messaging** | Push notifications to dealers |
| **Expo Push** | Same, via Expo's abstraction |
| **Nominatim (OSM)** | Reverse geocode GPS on address entry |
| **OpenStreetMap tiles** | Map picker |
| **MSG91** (via backend) | OTP delivery — the app never talks to MSG91 directly |
| **Cloudinary** (via backend) | Image uploads — the app posts base64 to the backend which forwards |
| **WhatsApp** (`wa.me` deep-link) | Yard Finds enquiries, bulk pickup CTA |

---

## 6. Permissions requested

Declared in `app.json`:

- **Camera** — order photo capture
- **Photo library** — order photo picker
- **Location** — pickup address GPS auto-fill
- **Notifications** (Android 13+) — dealer alerts

All permission-gated features handle denial gracefully (address entry falls back to manual typing; photo upload falls back to gallery pick).

---

## 7. Trust boundaries

- **Everything is client-rendered.** The backend is the source of truth for what a user is allowed to see.
- **Session token = full seller privileges.** If the AsyncStorage is compromised (rooted device, extracted backup), the attacker has the seller's account until either the session expires (90 days) or the user re-logs-in on another device (invalidates on our end via new session issuance — but old tokens remain valid until they expire).
- **No biometric / PIN lock inside the app** — mobile OS lock is the only barrier.

---

## 8. Known trade-offs

- **No end-to-end encryption of stored data** — AsyncStorage is unencrypted plaintext on the device's app-sandbox filesystem. Standard for React Native; consider `expo-secure-store` for the session token in a future hardening pass if PIL data becomes a compliance concern.
- **APK sideload** — not on Play Store, so no Play Protect scanning. Users install a raw APK. Explain the "Unknown sources" prompt clearly in onboarding messaging.
- **Auto-update** — no OTA update mechanism (Expo Updates disabled to keep the free-tier build simple). Users manually install new APKs pushed via WhatsApp or the website.

---

## 9. What to focus a review on

Suggested priority order for the reviewer:

1. **AppContext auth lifecycle** — `src/context/AppContext.js`. `loadSession`, `login`, `logout`, `refreshUser`.
2. **API client** — `src/services/api.js`. Axios instance, interceptors, timeout, error handling.
3. **Screen guards** — `src/navigation/index.js`. Route access based on user role and seller_type.
4. **Deep-link / URL handling** — check if any incoming URL params flow into WebViews or eval'd expressions.
5. **Permission handling** — camera / photos / location. Should never crash the app on denial.
6. **Photo upload path** — `src/screens/seller/PostStep4Screen.js`. Base64 payload size, timeout, sequential vs parallel upload.
7. **Push token registration** — check that FCM token registration handles reinstall / clear-data / token rotation cleanly.
8. **Server-driven state (suspension, edit-request flow)** — verify the app respects backend-set flags and shows the right blocking screens.
