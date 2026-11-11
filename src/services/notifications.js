/**
 * Push notification registration + session tracking.
 * Uses Expo's push service (no FCM credentials needed in the app).
 *
 * Token registration rules:
 *  - Registers with backend ONLY when the token is new or has changed.
 *  - Covers: first install, reinstall, clear app data, rare FCM rotation.
 *  - Skips backend call on every app reopen / phone restart / Play Store update
 *    because the token is stable and already registered.
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { registerPushToken, trackSession } from './api';
import { ensurePermission } from './permissions';

const TOKEN_CACHE_KEY = 'push_token_registered';

// When the in-context notification question was last shown, so a "Not now"
// is respected for a while instead of asking after every order.
const ASKED_AT_KEY = 'notifications_asked_at';
const ASK_AGAIN_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

// Bumped on every logout (clearPushTokenCache). See registerForPushNotifications.
let pushGeneration = 0;
// Set while clearDeviceNotifications() is deleting the device token.
let pendingUnregister = null;

// Configure how notifications are displayed when the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Returns a human-readable device model name e.g. "Samsung Galaxy S23" */
export function getDeviceModel() {
  const brand = Device.brand
    ? Device.brand.charAt(0).toUpperCase() + Device.brand.slice(1).toLowerCase()
    : null;
  // deviceName = user/marketing name (e.g. "Galaxy S25+", "Realme Note 15", "Vivo V15")
  // modelName  = internal code      (e.g. "SM-S926B") — fallback only
  const name = Device.deviceName || Device.modelName || null;
  if (brand && name) return `${brand} ${name}`;
  return name || brand || 'Unknown Device';
}

/**
 * If notifications are already allowed: gets the Expo push token and
 * registers it with the backend — but ONLY if the token is new or has
 * changed since last registration. Never asks for permission itself.
 *
 * Safe to call on every app open and on login; it is a no-op when the token
 * is already cached and unchanged.
 */
export async function registerForPushNotifications() {
  // Snapshot of the logout generation. If a logout happens while this call
  // is in flight, its result belongs to the previous user and must not be
  // cached (a stale cache entry would make the next user's login skip
  // registering this device).
  const generation = pushGeneration;
  try {
    // A logout may still be deleting the device token; finish that first so
    // it cannot delete the token this call is about to fetch.
    if (pendingUnregister) await pendingUnregister.catch(() => {});

    // NOTE: Device.isDevice check intentionally removed.
    // It can incorrectly return false on some real Android devices (rooted, unusual OEMs),
    // which would silently block push registration even when the user granted permission.
    // Permissions check below is the correct gate for push support.

    // Never shows the system prompt: this runs at launch, login and on every
    // return to the app, and asking there (with no context, every time) is
    // what Play and Android discourage. The prompt is shown in context by
    // askForNotificationsInContext() below; until it is granted this is a
    // no-op. (Below Android 13 notifications are allowed by default.)
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    if (existingStatus !== 'granted') {
      if (__DEV__) console.log('[Push] Permission not granted — status:', existingStatus);
      return null;
    }

    // Android needs a notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('scrapx', {
        name: 'Scrap Trove',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#16A34A',
      });
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'a7dd435f-e2e4-4ad2-809b-0ccb19ff3e3d',
    });
    const token = tokenData.data;
    const deviceModel = getDeviceModel();

    // ── Only call the backend when the token is genuinely new or changed ──────
    if (generation !== pushGeneration) return null; // logged out meanwhile
    const cached = await AsyncStorage.getItem(TOKEN_CACHE_KEY).catch(() => null);
    if (cached !== token) {
      try {
        await registerPushToken(token, deviceModel);
        if (generation !== pushGeneration) return null; // logged out meanwhile
        // Cache only after a successful backend call
        await AsyncStorage.setItem(TOKEN_CACHE_KEY, token).catch(() => {});
        if (__DEV__) console.log('[Push] Token registered successfully');
      } catch (err) {
        // Don't cache on failure so it retries on the next open
        if (__DEV__) console.error('[Push] registerPushToken failed:', err?.response?.data || err?.message);
      }
    }

    return token;
  } catch (err) {
    // Surface the REAL error — most common cause: google-services.json missing
    // or FCM credentials not configured in EAS dashboard.
    if (__DEV__) console.error('[Push] getExpoPushTokenAsync FAILED:', err?.message || String(err));
    if (__DEV__) console.error('[Push] Hint: ensure google-services.json is present and referenced in app.json');
    return null;
  }
}

/**
 * Ask for notification permission at a moment where it is obviously useful
 * (a seller just placed a pickup, a dealer just went online), with an
 * explanation first, then register the device. Asks at most once every 7
 * days, and never when notifications are blocked (no Settings nagging
 * here; the user turned them off on purpose). Never throws.
 *
 * @param {string} language
 * @param {'seller'|'dealer'} role  picks the explanation text
 * @returns {Promise<boolean>} whether notifications are now allowed
 */
export async function askForNotificationsInContext(language, role) {
  try {
    const { granted, canAskAgain } = await Notifications.getPermissionsAsync();
    if (granted) {
      registerForPushNotifications().catch(() => {});
      return true;
    }
    if (canAskAgain === false) return false;

    const last = Number(await AsyncStorage.getItem(ASKED_AT_KEY).catch(() => null)) || 0;
    if (Date.now() - last < ASK_AGAIN_AFTER_MS) return false;
    await AsyncStorage.setItem(ASKED_AT_KEY, String(Date.now())).catch(() => {});

    const ok = await ensurePermission('notifications', language, {
      reasonKey: role === 'dealer' ? 'perm_notifications_dealer_why' : 'perm_notifications_seller_why',
      offerSettingsIfBlocked: false,
    });
    if (ok) registerForPushNotifications().catch(() => {});
    return ok;
  } catch {
    return false;
  }
}

/**
 * Call this on logout to clear the cached token.
 * On the next login the token will be re-registered with the backend once,
 * ensuring the correct user is associated (handles device-sharing edge case).
 */
export function clearPushTokenCache() {
  pushGeneration += 1;
  // Also forget when we last asked, so the next person to log in on this
  // phone is asked fresh.
  return AsyncStorage.multiRemove([TOKEN_CACHE_KEY, ASKED_AT_KEY]).catch(() => {});
}

/**
 * Logout, device side. There is no backend endpoint to unregister a push
 * token, so the server still maps this device's Expo token to the old
 * account. The Expo token is tied to the app installation, not the user, so
 * the best the app can do alone is:
 *   - remove the old account's notifications from the tray and badge
 *   - delete the device's FCM token, so the Expo token cannot deliver
 *     anything until the next login calls getExpoPushTokenAsync() again
 * Best-effort: never throws.
 */
export function clearDeviceNotifications() {
  pendingUnregister = (async () => {
    await Notifications.dismissAllNotificationsAsync().catch(() => {});
    await Notifications.setBadgeCountAsync(0).catch(() => {});
    await Notifications.unregisterForNotificationsAsync().catch(() => {});
  })().finally(() => { pendingUnregister = null; });
  return pendingUnregister;
}

/**
 * Tracks an app open session — call this every time the user opens the app.
 * Records the timestamp and device model in the backend.
 */
export async function trackAppSession() {
  try {
    const deviceModel = getDeviceModel();
    await trackSession(deviceModel).catch(() => {});
  } catch { /* ignore */ }
}
