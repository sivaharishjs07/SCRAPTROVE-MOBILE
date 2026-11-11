# Google Play Data safety worksheet: Scrap Trove (Android)

Prepared from the app code on 2026-11-11 (app version 1.1.0, after the
security review). Use it to fill in **Play Console > App content > Data
safety** and as the factual basis for the privacy policy.

Everything marked **Verified** was read in the app code. Anything marked
**ASK CLIENT** or **ASK BACKEND** could not be checked here (we do not
have the backend code or the business decisions) and must be answered
before the form is submitted. This is a technical worksheet, not legal
wording.

Google's definitions (help page "Provide information for Google Play's
Data safety section", checked 2026-11-11):

- **Collected**: sent off the user's device, by the app or by any SDK in
  it. Data that only stays on the phone is not declared.
- **Shared**: transferred to a third party. Not counted as sharing:
  transfers to **service providers** processing on the developer's
  behalf, for **legal** reasons, on a **specific user-initiated action**,
  or fully **anonymised** data.
- **Optional**: the user can choose not to provide it and still use the
  app. Data needed for the app's main function is **required**.

---

## 1. Top-level answers

| Question | Answer | Basis |
|---|---|---|
| Does the app collect or share any of the required user data types? | **Yes** | Section 2 |
| Is all user data encrypted in transit? | **Yes** | Verified: release builds refuse a non-`https` API address (`src/services/api.js`); every other address in the app is `https` (Expo, Firebase, Nominatim, OpenStreetMap, unpkg); cleartext traffic is not enabled. |
| Do you provide a way for users to request that their data is deleted? | **Not yet: must be Yes before launch** | No deletion exists today. Needs the backend endpoint and the public deletion page in `docs/ACCOUNT_DELETION_REQUEST.md` (task P4). The page URL goes into this form. |
| Is the app's data collection compliant with the Families policy? | **ASK CLIENT** | The app does not target children; confirm the target audience in "App content". |
| Independent security review (optional badge) | Not applicable unless the client commissions a MASA review | |

---

## 2. Data types

Purposes use Play's list: App functionality, Account management, Fraud
prevention/security/compliance, Analytics, Developer communications,
Advertising or marketing, Personalisation.

"Backend" = the Scrap Trove API (`api.scraptrove.com`, Cloudflare
Workers). Cloudinary (photos) and MSG91 (OTP SMS) receive data **from the
backend**, not from the app.

### Location

| Type | Collected | Shared | Required? | Purpose | Where in the app | Sent to |
|---|---|---|---|---|---|---|
| **Precise location** | Yes | See note L1 | **Optional** (address can be typed; GPS/map pin only on tap) | App functionality (pickup address, map pin) | Pickup address and map (`PostStep3Screen`, `AddressFormScreen`), bulk sign-up and company address GPS (`BulkDetailsScreen`, `EditDetailsScreen`) | Backend (lat/lng stored with orders, saved addresses, company address); **Google** via the Android geocoder (pickup/address screens); **Nominatim/OpenStreetMap** (bulk sign-up, company address; interim) |
| Approximate location | Covered by precise | | | | Map tiles reveal the area being viewed to OpenStreetMap (interim) | OpenStreetMap tile servers |

- Foreground only. Verified: no background location permission or code.
- **L1 ASK CLIENT/legal:** whether Google (Android geocoder) and the
  OpenStreetMap Foundation count as service providers or as sharing.
  Both are planned/used as part of the service; OSM goes away with the
  move to Google (`docs/MAPS_MIGRATION_PLAN.md`), after which Google Maps
  SDK should be added here.

### Personal info

| Type | Collected | Required? | Purpose | Where | Sent to |
|---|---|---|---|---|---|
| **Name** | Yes | Required | Account management, App functionality | Sign-up forms, profile edit | Backend |
| **Email address** | Yes | **Optional** for small sellers and dealers; **required** for bulk sellers | Account management, Developer communications **(ASK CLIENT: is email used to contact users?)** | Sign-up, My Details, profile edit | Backend |
| **Phone number** | Yes | Required (login) | Account management (OTP login), App functionality (seller and dealer can call each other about a pickup) | Phone screen; pincode waitlist | Backend, then MSG91 for the OTP SMS |
| **Address** | Yes | Required | App functionality (pickup address, home address, company and dealer address) | Sign-up, pickup step 3, address book, profile edit | Backend |
| **User IDs** | Yes | Required | Account management | Account ID and registration ID (`reg_id`) created by the backend | Backend |
| **Other info** | Yes | Required for bulk sellers and dealers | Account management, Fraud prevention/compliance **(ASK CLIENT)** | Bulk seller: PAN or GST, company name, designation, sector. Dealer: business name, GST, PAN, vehicles. | Backend |

### Financial info

| Type | Collected | Required? | Purpose | Where | Sent to |
|---|---|---|---|---|---|
| **Purchase history** or **Other financial info** (ASK CLIENT which fits) | Yes | Required for dealers completing a pickup | App functionality (records what was paid for the scrap) | Dealer enters `amount_paid` when completing an order; earnings screens | Backend |
| User payment info | **No** | | | The app takes no card, UPI or bank details | |

PAN/GST may belong under "Other financial info" rather than "Personal
info: Other info"; **ASK CLIENT** which they prefer (declare once).

### Photos and videos

| Type | Collected | Required? | Purpose | Where | Sent to |
|---|---|---|---|---|---|
| **Photos** | Yes | **Required** for posting a pickup (at least 1) and completing one; required for dealer registration | App functionality | Pickup photos, bulk pickup photos, dealer shop/vehicle photos, completion photo | Backend, which stores them in **Cloudinary** |
| Videos | No | | | Only images can be picked or taken | |

Verified: photos are resized and re-encoded before upload, which removes
EXIF metadata such as GPS. **ASK BACKEND:** Cloudinary URLs are public to
anyone who has them (see `docs/BACKEND_SECURITY_CHECKLIST.md` F3).

### Messages

| Type | Collected | Required? | Purpose | Where | Sent to |
|---|---|---|---|---|---|
| **Other in-app messages** | Yes | Optional | App functionality (customer support) | Support tickets and ticket chat | Backend |
| SMS or MMS | **No** | | | The app does not read SMS (the OTP is typed in) | |

### App activity

| Type | Collected | Required? | Purpose | Where | Sent to |
|---|---|---|---|---|---|
| **App interactions** | Yes | Required (automatic) | **ASK CLIENT** (Analytics? Account management?) | Every app open and login sends `/sessions/track` with the device model | Backend |
| **Other user-generated content** | Yes | Optional | App functionality | Order notes, ratings and reviews, custom product names, Yard Finds enquiries | Backend |
| **Other actions** | Yes | Optional | App functionality | Pickup orders themselves (materials, weight, time slot); pincode availability checks | Backend |
| In-app search history | **No** | | | Yard Finds search is filtered on the phone; only the category is sent | |

### App info and performance

| Type | Collected | Notes |
|---|---|---|
| Crash logs | **No** | No crash-reporting SDK. The crash screen logs nothing in release builds. If the client adds Sentry/Crashlytics, add this. |
| Diagnostics | **No** (see note) | Expo Updates sends runtime version, channel and platform when checking for updates; **ASK CLIENT** whether to declare it as Diagnostics. |
| Other app performance data | **ASK CLIENT** | The device model (e.g. "Samsung Galaxy S23") is sent at login, with push registration and session tracking. |

### Device or other IDs

| Type | Collected | Required? | Purpose | Where | Sent to |
|---|---|---|---|---|---|
| **Device or other IDs** | Yes | Optional for push (only after notification permission); automatic for update checks | App functionality (notifications, OTA updates) | Expo push token, sent to the backend; Firebase Cloud Messaging token / installation ID (Firebase Messaging SDK 24.0.1, via `expo-notifications`); `EAS-Client-ID` installation ID sent by `expo-updates` | Backend; Expo; Google (Firebase) |

Check Google's published Data safety information for Firebase Cloud
Messaging and Expo's guidance for `expo-notifications` / `expo-updates`
before submitting (Play requires SDK data to be declared).

### Not collected (verified)

Contacts, calendar, files and docs, audio (microphone permission is
blocked), videos, web browsing history, installed apps, health and
fitness, race/ethnicity, political or religious beliefs, sexual
orientation, credit score, user payment info. No advertising or analytics
SDK is included.

---

## 3. Who receives data

| Recipient | Receives | Role (ASK CLIENT to confirm) |
|---|---|---|
| Scrap Trove backend | Everything above | The developer itself |
| Cloudinary | Photos (from the backend) | Service provider |
| MSG91 | Phone number, OTP SMS (from the backend) | Service provider |
| Expo (push service, update service) | Push token, installation ID, device platform | Service provider |
| Google: Firebase Cloud Messaging | FCM token / installation ID, notification content | Service provider |
| Google: Android geocoder (Play services) | Coordinates when the user taps GPS / moves the pin | L1: service provider or sharing |
| OpenStreetMap Foundation (Nominatim, map tiles) | Coordinates, map area viewed, IP address (interim) | L1: service provider or sharing |
| unpkg.com | IP address when the map loads the Leaflet library (interim) | Not user data beyond the IP; goes away with the map migration |
| Other app users | Verified in the dealer screens: a dealer sees the order photos and the seller's location text, and for an accepted order the seller's name, phone number (call button) and GPS position (open in Maps). A seller sees the assigned dealer's name, city and phone number | **ASK CLIENT/legal:** likely "user-initiated" (not sharing) because the seller posts the pickup to get it collected; must be explained in the privacy policy either way |
| WhatsApp, phone dialler, Google Maps (links) | Nothing from the app; the user chooses to open them | Not collection |

If every third party above is confirmed as a service provider or a
user-initiated transfer, the "Data shared" section of the form is
**empty**; otherwise list those data types as shared.

---

## 4. Open questions to close before submitting

| # | Question | Who |
|---|---|---|
| 1 | Account deletion: endpoint, public deletion URL, timing (P4) | Backend, client |
| 2 | Retention: what is kept after deletion, and for how long (GST/payment records, fraud prevention) | Client, legal |
| 3 | Purpose of `/sessions/track` (app opens + device model): analytics, security, or account management? | Client, backend |
| 4 | Is email used to contact users (Developer communications)? | Client |
| 5 | PAN/GST and amount paid: which Play categories to use | Client |
| 6 | Google geocoder and OpenStreetMap: service provider or sharing (L1) | Client, legal |
| 7 | Seller/dealer contact details shown to the other party: confirm "user-initiated" | Client, legal |
| 8 | Declare Expo Updates checks as Diagnostics? | Client |
| 9 | Are Cloudinary photo URLs public, and is EXIF stripped on the server too? | Backend |
| 10 | Target audience (not children) | Client |
| 11 | Privacy policy URL that matches this worksheet | Client |

## 5. Keep this up to date

Update this worksheet (and the Play form) when:

- maps/geocoding move to Google (`docs/MAPS_MIGRATION_PLAN.md`): remove
  OpenStreetMap and unpkg, add the Google Maps SDK;
- a crash-reporting or analytics SDK is added;
- account deletion goes live (answer "Yes" to the deletion question);
- any new screen sends new personal data to the backend.
