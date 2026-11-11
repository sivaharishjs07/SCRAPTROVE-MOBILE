/**
 * Session-token storage.
 *
 * The session token is the only thing the app holds that grants access to
 * an account, so it lives in expo-secure-store (Android Keystore-backed
 * encrypted storage), never in AsyncStorage. Everything else (the cached
 * user profile, saved address, language) stays in AsyncStorage.
 *
 * Two tokens exist:
 *   session  – the logged-in user's token (was AsyncStorage 'user'.token)
 *   pending  – the token returned by verify-otp for a NEW user, used only
 *              while they finish the sign-up form (was AsyncStorage
 *              'auth_token')
 *
 * Values are cached in memory after the first read so the axios interceptor
 * does not hit the Keystore on every request.
 *
 * If a SecureStore write fails (rare: broken Keystore on some devices), the
 * token is kept in memory only. The session then works until the app is
 * closed, and the user signs in again on next launch. It is deliberately
 * NOT written back to AsyncStorage in plain text.
 */
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_KEY = 'session_token';
const PENDING_KEY = 'pending_auth_token';

// Pre-SecureStore locations, read once by migrateLegacyTokens().
const LEGACY_USER_KEY    = 'user';        // JSON object with a .token field
const LEGACY_PENDING_KEY = 'auth_token';  // bare token string

// Left over from an old demo mode; never send it as a credential.
const DEMO_TOKEN = 'demo-token';

const cache = { session: null, pending: null };
let loadPromise = null;

async function secureGet(key) {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    // Unreadable value (e.g. restored from a backup onto a new device, where
    // the Keystore key that encrypted it no longer exists). Drop it.
    await SecureStore.deleteItemAsync(key).catch(() => {});
    return null;
  }
}

// Returns true when the value was persisted, false when kept in memory only.
async function securePut(key, value) {
  try {
    await SecureStore.setItemAsync(key, value);
    return true;
  } catch {
    if (__DEV__) console.warn('[authToken] SecureStore write failed; token kept in memory only');
    return false;
  }
}

async function secureDelete(key) {
  await SecureStore.deleteItemAsync(key).catch(() => {});
}

function ensureLoaded() {
  if (!loadPromise) {
    loadPromise = (async () => {
      const [session, pending] = await Promise.all([secureGet(SESSION_KEY), secureGet(PENDING_KEY)]);
      // Only fill slots nothing has written yet in this app run.
      if (cache.session === null) cache.session = session;
      if (cache.pending === null) cache.pending = pending;
    })();
  }
  return loadPromise;
}

/**
 * One-time move of tokens from AsyncStorage into SecureStore, so users who
 * were logged in before this change stay logged in. Safe to call on every
 * launch: once the old values are gone it only costs two AsyncStorage reads.
 *
 * Order per token: write to SecureStore -> only if that succeeded, delete the
 * old plain-text copy. If the write fails, the old copy is left in place and
 * the token is used from memory, so the user is not logged out and the move
 * is retried on the next launch.
 */
export async function migrateLegacyTokens() {
  await ensureLoaded();

  // 1. Session token embedded in the cached user object.
  try {
    const raw = await AsyncStorage.getItem(LEGACY_USER_KEY);
    if (raw) {
      let parsed = null;
      try { parsed = JSON.parse(raw); } catch { parsed = null; }
      if (parsed && typeof parsed === 'object' && parsed.token) {
        const legacy = parsed.token;
        cache.session = legacy;
        if (await securePut(SESSION_KEY, legacy)) {
          const { token, ...rest } = parsed;
          await AsyncStorage.setItem(LEGACY_USER_KEY, JSON.stringify(rest));
        }
      }
    }
  } catch { /* storage unavailable; retry next launch */ }

  // 2. Temporary sign-up token.
  try {
    const legacyPending = await AsyncStorage.getItem(LEGACY_PENDING_KEY);
    if (legacyPending) {
      cache.pending = legacyPending;
      if (await securePut(PENDING_KEY, legacyPending)) {
        await AsyncStorage.removeItem(LEGACY_PENDING_KEY);
      }
    }
  } catch { /* retry next launch */ }
}

/** Token to send as "Authorization: Bearer". Session first, then pending. */
export async function getAuthToken() {
  await ensureLoaded();
  if (cache.session && cache.session !== DEMO_TOKEN) return cache.session;
  return cache.pending || null;
}

export async function getSessionToken() {
  await ensureLoaded();
  return cache.session;
}

export async function getPendingToken() {
  await ensureLoaded();
  return cache.pending;
}

export async function setSessionToken(token) {
  await ensureLoaded();
  cache.session = token;
  return securePut(SESSION_KEY, token);
}

export async function setPendingToken(token) {
  await ensureLoaded();
  cache.pending = token;
  return securePut(PENDING_KEY, token);
}

export async function clearPendingToken() {
  await ensureLoaded();
  cache.pending = null;
  await secureDelete(PENDING_KEY);
  await AsyncStorage.removeItem(LEGACY_PENDING_KEY).catch(() => {});
}

/** Removes every stored token, including any un-migrated plain-text copy. */
export async function clearAllTokens() {
  await ensureLoaded();
  cache.session = null;
  cache.pending = null;
  await Promise.all([secureDelete(SESSION_KEY), secureDelete(PENDING_KEY)]);
  await AsyncStorage.removeItem(LEGACY_PENDING_KEY).catch(() => {});
}

/** Copy of a user object without its token, for writing to AsyncStorage. */
export function withoutToken(userObj) {
  if (!userObj || typeof userObj !== 'object') return userObj;
  const { token, ...rest } = userObj;
  return rest;
}
