# Logout checklist

What `logout()` in `src/context/AppContext.js` must leave behind: no token, no
profile, no personal data from the previous user. Run this on a preview
(staging) build before each release, on a real Android phone.

Logout is reached from: Profile (seller), Profile (dealer), the "dealer
pending" screen, the suspended screen, and automatically when `/auth/me`
returns no seller/dealer profile.

## What logout clears

| Item | Where it lived | How it is cleared |
|---|---|---|
| Session token | SecureStore `session_token` | `clearAllTokens()` |
| Sign-up token | SecureStore `pending_auth_token` (old: AsyncStorage `auth_token`) | `clearAllTokens()` |
| Cached profile and role | AsyncStorage `user`, `userType` | `multiRemove` |
| Saved pickup address | AsyncStorage `savedAddress` + memory | `multiRemove` + state reset |
| Order draft (address, GPS, photos) | Memory only | Reset to empty |
| Active order, dealer online toggle | Memory only | Reset |
| "Push token already registered" cache | AsyncStorage `push_token_registered` | `clearPushTokenCache()` |
| Notifications in the tray, badge | Device | `clearDeviceNotifications()` (best-effort) |
| Device FCM token | Device | `unregisterForNotificationsAsync()` (best-effort) |
| Dealer "online" on the server | Backend | `POST /dealer/status {is_online:0}` (dealers only, best-effort, 4s cap) |

The token is not stored in axios defaults: the request interceptor reads it
from `services/authToken.js` on every request, so clearing it there is enough.

Kept on purpose: the language choice (`language`).

## Not cleared, needs the backend (see "Backend requests" below)

- The session token stays valid on the server until it expires.
- The server still links this phone's push token to the old account.

## Manual test

Use two staging accounts, A and B (and an approved dealer account for step 6).

1. Log in as A. Start a pickup and fill in the address step, then go back
   without submitting.
2. Log out from Profile. Expected: the Welcome screen.
3. Without closing the app, log in as B and open the pickup flow.
   Expected: no address, weight or photos from A.
4. Close the app fully and reopen it. Expected: B is still logged in.
   Log out, close, reopen. Expected: the Welcome screen, not B's tabs.
5. Optional, with adb on a debuggable build:
   `adb shell run-as com.scraptrove.app sqlite3 databases/RKStorage "select key from catalystLocalStorage"`
   (if `sqlite3` is missing on the phone, copy the file off with `run-as ... cat`).
   After logout the only key left is `language`: no `user`, `userType`,
   `savedAddress`, `auth_token` or `push_token_registered`. SecureStore
   values are encrypted in `shared_prefs/SecureStore.xml`, under names
   ending in `-session_token` / `-pending_auth_token`; after logout neither
   name is present.
6. Dealer: log in, switch Online, log out. Expected: the admin panel shows
   the dealer offline. Repeat in airplane mode: logout still completes
   within about 4 seconds.
7. Push: log in as A, log out, then have the backend or admin send A a
   notification. Expected (best-effort, to confirm): nothing arrives on the
   phone. Log in as B. Expected: B's notifications arrive, A's do not.
8. A notification of A's sitting in the tray disappears on logout.

## Backend requests (not available in api.js today)

1. **`POST /api/auth/logout`** that revokes the bearer token it is called
   with. The app would call it at the start of `logout()`.
2. **Push token ownership:** the Expo push token is tied to the app
   installation, not the user. When `POST /api/notifications/register` is
   called with a token already linked to another account, move it to the
   caller instead of adding a second link. A logout endpoint (item 1)
   should also unlink the token.
3. Confirm how long a session token stays valid and whether a new login on
   another phone revokes older tokens.
