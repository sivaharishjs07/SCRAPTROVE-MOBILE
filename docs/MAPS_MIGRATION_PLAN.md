# Maps and geocoding: migration plan (OSM interim → Google)

Decision (S8): ship with the interim OpenStreetMap setup only until this
migration is done, and complete it **before the Play Store launch**.

Why: the OSMF policies give no SLA, allow access to be withdrawn at any
time, limit Nominatim to "moderate" user numbers (1 request/second summed
over all users), and ask apps not to send personal data. A growing user
base sending home GPS positions does not fit that.

## Where things are today

| Piece | File | Used by |
|---|---|---|
| Nominatim reverse geocoding (interim) | `src/services/geocode.js` | `BulkDetailsScreen`, `EditDetailsScreen` |
| Leaflet + OSM tiles in a WebView (interim) | `src/constants/mapConfig.js` | `PostStep3Screen`, `AddressFormScreen` |
| Android's own geocoder (already in use) | `Location.reverseGeocodeAsync` inside the screens | `PostStep3Screen`, `AddressFormScreen` |

All Nominatim and OSM tile access goes through the two interim files, so
the migration touches those plus the two map screens.

## Target

| Piece | Replace with | Cost (Google pricing page, checked 2026-11-11) |
|---|---|---|
| Reverse geocoding | `expo-location` `reverseGeocodeAsync` (Android Geocoder via Google Play services). No API key. | Not billed |
| Map with draggable pin | `react-native-maps` **1.14.0** (Expo SDK 51 version), Google provider | "Maps SDK": free, unlimited |

Not used: Google's Geocoding web API (10,000 free per month, then
$5 per 1,000).

## Steps

### 1. Client: Google Cloud setup (blocking)
1. Google Cloud project for Google Maps Platform, with a billing account
   (Google requires one even for free SKUs; confirm in the console).
2. Enable **Maps SDK for Android**.
3. Create an API key restricted to:
   - API: Maps SDK for Android only;
   - Android apps: package `com.scraptrove.app` with the SHA-1 of
     (a) the Play App Signing certificate, (b) the EAS upload/production
     certificate, (c) the certificate used for preview builds.
4. Share the key through the team's secret store (not chat). It goes into
   the app config and is visible in the APK by design; the restrictions in
   step 3 are what protect it.

### 2. Geocoding (no key needed, can be done first)
Change only the inside of `reverseGeocode()` in `src/services/geocode.js`
to call `Location.reverseGeocodeAsync({ latitude, longitude })` and map:

| Normalised field | Nominatim (today) | expo-location |
|---|---|---|
| `doorNo` | `house_number` | `streetNumber` |
| `street` | `road` / `pedestrian` / `footway` | `street` |
| `locality` | `suburb` / `neighbourhood` / `hamlet` / `village` | `district` (fallback `name`) |
| `district` | `state_district` / `city_district` / `city` | `subregion` (fallback `city`) |
| `state` | `state` | `region` |
| `pincode` | `postcode` | `postalCode` |

Then remove `GEOCODER_ATTRIBUTION` and its two uses (the OSM credit no
longer applies). Test on a few real addresses in Chennai and a rural
pincode: the district/state names must match the City Master lists, or
the dropdowns will not preselect.

### 3. Map (needs the key from step 1)
1. `npx expo install react-native-maps` (gives 1.14.0 on SDK 51).
2. `app.json`: `expo.android.config.googleMaps.apiKey`. Prefer injecting
   it from an EAS environment variable via `app.config.js` instead of
   committing it.
3. Replace the WebView in `PostStep3Screen` and `AddressFormScreen` with a
   `MapView` (`provider={PROVIDER_GOOGLE}`) and a draggable `Marker`;
   `onDragEnd` / `onPress` give the same `{ latitude, longitude }` the
   WebView messages give today, so the existing pin handlers stay.
4. Delete `src/constants/mapConfig.js`. `react-native-webview` stays only
   if something else uses it (check with a search; today only the maps do).

### 4. After the switch
- New native module: needs a new build, cannot go out as an OTA update.
- Data Safety form and privacy policy (task P8): precise location is sent
  to Google for address lookup and maps; nothing goes to OpenStreetMap.
- Re-run the S7 permission check: the merged manifest should not gain
  new permissions (react-native-maps uses the location permissions the app
  already has).

## Test checklist
- Map opens centred on the current position; pin can be dragged and
  tapped; confirming fills the address.
- GPS auto-fill on bulk sign-up and company-address edit fills door,
  street, locality, district, state and pincode, and the district/state
  dropdowns match.
- Location permission denied: manual address entry still works.
- No network: clear error, manual entry still works.
- Phone without Google Play services (if available): geocoding fails
  gracefully; manual entry works.
