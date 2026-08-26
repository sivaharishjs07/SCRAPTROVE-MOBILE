# Scrap Trove Mobile

React Native (Expo SDK 51) Android app for the Scrap Trove scrap-pickup platform. Talks to the same API as the [web dashboard](https://github.com/vishaldurai-IND/scraptrove-web).

App ID: `com.scraptrove.app`

---

## Prerequisites

- Node 20+
- Java 17 (for local Android builds)
- Android Studio SDK / Android emulator (or a physical device)
- [Expo CLI](https://docs.expo.dev/get-started/installation/) via `npx expo`
- A running API — point at the staging worker URL (see [scraptrove-api](https://github.com/vishaldurai-IND/scraptrove-api))

---

## First-time setup

```bash
npm install

# Copy env — the app reads EXPO_PUBLIC_API_URL at runtime
cp .env.example .env
# Edit .env → set EXPO_PUBLIC_API_URL to the staging worker
```

The **`google-services.json`** Firebase config file has been intentionally kept out of this review repo. Get it from the owner (via password manager) and place at the repo root before building. Without it, FCM push notifications won't work but the app boots fine.

---

## Local development

Run against the Expo Go app on your phone (fastest):

```bash
npx expo start
# → scan QR with Expo Go, or press 'a' for Android emulator
```

---

## Build a real APK

```bash
# Local build — needs Java 17 + Android SDK
npx eas build --local --platform android --profile preview

# Or trigger via the GitHub Actions workflow (build-android.yml) in the
# original repo — kept there until this repo has its own CI.
```

---

## Layout

```
scraptrove-mobile/
├── App.js               — root component
├── index.js             — entry
├── app.json             — Expo config (name, icon, splash, permissions)
├── eas.json             — EAS build profiles
├── babel.config.js
├── assets/              — icons, splash, fonts
├── plugins/             — custom Expo config plugins (splash overrides)
└── src/
    ├── context/         — AppContext (session + language + orderDraft + savedAddress)
    ├── navigation/      — React Navigation tab + stack setup
    ├── services/        — API client
    ├── constants/       — colors + typography
    ├── components/      — shared UI
    └── screens/
        ├── auth/        — Login, OTP, DetailsForm, BulkDetails
        ├── seller/      — Home, PostStep1-4, BulkPostFlow, BulkProducts, History, Profile
        ├── dealer/      — Home, ActiveOrder, Profile
        └── shared/      — MyDetails, YardFinds, AddressForm, Settings
```

---

## What to review first

Read `SECURITY_NOTES.md` for the auth model, permissions, and known trade-offs.

Suggested review priorities are in `SECURITY_NOTES.md` §9.
