/**
 * One way to ask for runtime permissions, used by every screen.
 *
 *   granted already          -> true, nothing shown
 *   never asked / can ask    -> short explanation first ("Not now" /
 *                               "Continue"), then Android's own prompt
 *   blocked ("Don't ask again", or turned off in Settings)
 *                            -> explains it is off and offers "Open Settings"
 *
 * Android only shows its prompt a limited number of times, so explaining
 * first (and letting people say "Not now" without using up a prompt) is
 * what Google recommends. Denial never throws; callers just get false and
 * keep their manual fallback (typing the address, skipping the photo).
 */
import { Alert, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { t } from '../constants/translations';

const KINDS = {
  camera: {
    get: () => ImagePicker.getCameraPermissionsAsync(),
    request: () => ImagePicker.requestCameraPermissionsAsync(),
  },
  // Android 13+ uses the system photo picker and needs no permission, so
  // this resolves as granted there without showing anything.
  photos: {
    get: () => ImagePicker.getMediaLibraryPermissionsAsync(),
    request: () => ImagePicker.requestMediaLibraryPermissionsAsync(),
  },
  // Foreground ("while using the app") only. The app never asks for
  // background location.
  location: {
    get: () => Location.getForegroundPermissionsAsync(),
    request: () => Location.requestForegroundPermissionsAsync(),
  },
  notifications: {
    get: () => Notifications.getPermissionsAsync(),
    request: () => Notifications.requestPermissionsAsync(),
  },
};

// Resolves true for the confirm button, false for cancel or back.
function ask(title, message, cancelText, confirmText) {
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: cancelText, style: 'cancel', onPress: () => resolve(false) },
        { text: confirmText, onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

async function offerSettings(kind, language) {
  const open = await ask(
    t(`perm_${kind}_title`, language),
    t(`perm_${kind}_blocked`, language),
    t('perm_cancel', language),
    t('perm_open_settings', language),
  );
  if (open) Linking.openSettings().catch(() => {});
}

/**
 * @param {'camera'|'photos'|'location'|'notifications'} kind
 * @param {string} language  'en' | 'ta'
 * @param {object} [options]
 * @param {string} [options.reasonKey]  translation key for the explanation
 *        (defaults to `perm_<kind>_why`)
 * @param {boolean} [options.offerSettingsIfBlocked=true]
 * @returns {Promise<boolean>} whether the permission is granted
 */
export async function ensurePermission(kind, language, options = {}) {
  const { reasonKey = `perm_${kind}_why`, offerSettingsIfBlocked = true } = options;
  const api = KINDS[kind];
  if (!api) return false;

  let current = null;
  try { current = await api.get(); } catch { current = null; }
  if (current?.granted) return true;

  if (current && current.canAskAgain === false) {
    if (offerSettingsIfBlocked) await offerSettings(kind, language);
    return false;
  }

  const go = await ask(
    t(`perm_${kind}_title`, language),
    t(reasonKey, language),
    t('perm_not_now', language),
    t('perm_continue', language),
  );
  if (!go) return false;

  try {
    const res = await api.request();
    return !!res?.granted;
  } catch {
    return false;
  }
}
