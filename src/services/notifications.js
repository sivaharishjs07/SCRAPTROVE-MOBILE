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

const TOKEN_CACHE_KEY = 'push_token_registered';

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
 * Requests permission, gets the Expo push token, and registers it with the
 * backend — but ONLY if the token is new or has changed since last registration.
 *
 * Safe to call on every app open and on login; it is a no-op when the token
 * is already cached and unchanged.
 */
export async function registerForPushNotifications() {
  try {
    // NOTE: Device.isDevice check intentionally removed.
    // It can incorrectly return false on some real Android devices (rooted, unusual OEMs),
    // which would silently block push registration even when the user granted permission.
    // Permissions check below is the correct gate for push support.

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Push] Permission not granted — status:', finalStatus);
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
    const cached = await AsyncStorage.getItem(TOKEN_CACHE_KEY).catch(() => null);
    if (cached !== token) {
      try {
        await registerPushToken(token, deviceModel);
        // Cache only after a successful backend call
        await AsyncStorage.setItem(TOKEN_CACHE_KEY, token).catch(() => {});
        console.log('[Push] Token registered successfully');
      } catch (err) {
        // Don't cache on failure so it retries on the next open
        console.error('[Push] registerPushToken failed:', err?.response?.data || err?.message);
      }
    }

    return token;
  } catch (err) {
    // Surface the REAL error — most common cause: google-services.json missing
    // or FCM credentials not configured in EAS dashboard.
    console.error('[Push] getExpoPushTokenAsync FAILED:', err?.message || String(err));
    console.error('[Push] Hint: ensure google-services.json is present and referenced in app.json');
    return null;
  }
}

/**
 * Call this on logout to clear the cached token.
 * On the next login the token will be re-registered with the backend once,
 * ensuring the correct user is associated (handles device-sharing edge case).
 */
export function clearPushTokenCache() {
  return AsyncStorage.removeItem(TOKEN_CACHE_KEY).catch(() => {});
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
