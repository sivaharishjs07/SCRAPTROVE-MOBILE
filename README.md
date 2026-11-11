# Scrap Trove Mobile

React Native (Expo SDK 51) Android app for the Scrap Trove scrap-pickup platform. Talks to the same API as the [web dashboard](https://github.com/vishaldurai-IND/scraptrove-web).

App ID: `com.scraptrove.app`

---

## Prerequisites

- Node 20+
- Java 17 and the Android SDK (only for building on your own machine)
- An Android phone or emulator
- A running API: the staging server `https://api.stage.scraptrove.com` (see [scraptrove-api](https://github.com/vishaldurai-IND/scraptrove-api))

---

## First-time setup

```bash
npm ci

# The app reads EXPO_PUBLIC_API_URL from .env.local (git-ignored)
cp .env.example .env.local
```

`google-services.json` (Firebase client config for push notifications) is committed at the repo root and is needed for every build. It is not a secret; see `SECURITY_NOTES.md` section 2.

---

## Local development

```bash
npx expo start
```

The app uses native modules, so it runs in a build of this app rather than in the Expo Go app from the Play Store (which only supports the newest Expo SDK). Install a preview build (below) or build locally with `npx expo run:android`.

Note: the `development` profile in `eas.json` sets `developmentClient: true`, but `expo-dev-client` is not installed, so that profile does not produce a working development client yet.

---

## Builds

| Profile | Output | Server |
|---|---|---|
| `preview` | APK to install on phones | staging |
| `production` | AAB for Google Play (versionCode auto-incremented by EAS) | live |

- GitHub: Actions > "Build staging APK" (EAS cloud) or "Build staging APK (on GitHub, no Expo build quota)", choose the profile. Needs the `EXPO_TOKEN` repository secret.
- Locally: `npx eas build --local --platform android --profile preview`

OTA updates are enabled. Before publishing one, read `SECURITY_NOTES.md` section 9: when native code changes, `version` in `app.json` must be raised and a new build shipped.

---

## Layout

```
scraptrove-mobile/
├── App.js               root component
├── index.js             entry
├── app.json             Expo config (name, version, permissions, OTA)
├── eas.json             EAS build profiles
├── assets/              icons, splash
├── plugins/             withAndroidImmersive.js (not registered in app.json, currently unused)
├── docs/                security and launch documents (see SECURITY_NOTES.md)
└── src/
    ├── context/         AppContext (session, language, order draft, saved address)
    ├── navigation/      React Navigation tabs + stacks, role-based screen sets
    ├── services/        api (axios client), authToken (SecureStore), notifications,
    │                    photoUpload, geocode
    ├── constants/       colours, typography, translations, locations, mapConfig, appVersion
    ├── components/      shared UI
    └── screens/
        ├── auth/        Welcome, UserType, Phone, OTP, DetailsForm, BulkDetails, DealerPending
        ├── seller/      Home, PostStep1-4, BulkPostFlow, BulkProducts, History, OrderStatus,
        │                RateDealer, Suspended, EditDetails
        ├── dealer/      Home, IncomingOrder, ActiveOrder, Earnings, Profile, Subscription
        └── shared/      Settings, MyDetails, AddressForm, YardFinds, ScrapRates, Support,
                         TicketChat, FAQ, Language, About
```

---

## Security

Read `SECURITY_NOTES.md` first: how login and tokens work, what is stored on the phone, permissions, OTA rules and open issues. What the backend must enforce is in `docs/BACKEND_SECURITY_CHECKLIST.md`.
