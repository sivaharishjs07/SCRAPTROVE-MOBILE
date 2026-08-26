import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  registerForPushNotifications,
  clearPushTokenCache,
  trackAppSession,
} from '../services/notifications';
import api from '../services/api';

const AppContext = createContext(null);

// ─── Default empty order draft ────────────────────────────────────────────────
const EMPTY_DRAFT = {
  // Step 1 — Pickup type
  type:     null,   // 'instant' | 'scheduled'
  slot:     null,   // date label (scheduled only)
  timeSlot: null,   // time slot (scheduled only)
  // Step 2 — Materials & weight
  materials: [],
  weight:    null,
  // Step 3 — Address
  addressLine1: '',
  addressLine2: '',
  landmark:     '',
  pincode:      '',
  addrType:     'Home',
  coords:       null,  // { lat, lng }
  // Step 4 — Photos & notes
  photos: [],   // ImagePicker asset objects (in-memory, valid for app session)
  notes:  '',
};

export const AppProvider = ({ children }) => {
  const [language, setLanguage] = useState('en');
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [activeOrder, setActiveOrder] = useState(null);

  // ── Order draft: persists across PostStep back-navigation ──────────────────
  const [orderDraft, setOrderDraftState] = useState(EMPTY_DRAFT);

  // ── Saved address: pre-fills PostStep3 on subsequent orders ───────────────
  const [savedAddress, setSavedAddressState] = useState(null);

  // Load persisted session + saved address on app start
  useEffect(() => {
    loadSession();
    AsyncStorage.getItem('savedAddress')
      .then(v => { if (v) setSavedAddressState(JSON.parse(v)); })
      .catch(() => {});
  }, []);

  // Re-register push token whenever app comes to foreground.
  // Also refresh /auth/me so a mid-session admin suspend / unsuspend is
  // reflected in the UI without needing the user to sign in again.
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (nextState) => {
      if (nextState === 'active') {
        const stored = await AsyncStorage.getItem('user').catch(() => null);
        if (stored) {
          registerForPushNotifications().catch(() => {});
          refreshUser().catch(() => {});
        }
      }
    });
    return () => sub.remove();
  }, [user]);

  const loadSession = async () => {
    try {
      const storedUser     = await AsyncStorage.getItem('user');
      const storedUserType = await AsyncStorage.getItem('userType');
      const storedLang     = await AsyncStorage.getItem('language');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
        // Track this app-open session
        trackAppSession().catch(() => {});
        // Attempt push token registration — no-op if token is already registered
        // and unchanged (handles reinstall / clear-data / FCM rotation silently)
        registerForPushNotifications().catch(() => {});
      }
      if (storedUserType) setUserType(storedUserType);
      if (storedLang) setLanguage(storedLang);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (userData, type) => {
    setUser(userData);
    setUserType(type);
    await AsyncStorage.setItem('user', JSON.stringify(userData));
    await AsyncStorage.setItem('userType', type);
    // Attempt push token registration — no-op if token is already cached and unchanged.
    // Registers once after reinstall / clear-data, or if FCM rotated the token.
    registerForPushNotifications().catch(() => {});
    trackAppSession().catch(() => {});
  };

  const updateUser = async (fields) => {
    const updated = { ...user, ...fields };
    setUser(updated);
    await AsyncStorage.setItem('user', JSON.stringify(updated));
  };

  // Pull fresh user + seller/dealer state from /auth/me and merge into storage.
  // Called on app foreground and after suspend-related actions so a mid-session
  // admin suspend / unsuspend is reflected without needing to sign in again.
  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me');
      const data = res?.data;
      if (!data) return null;
      // Guard: if the auth token is valid but the profile row is missing on
      // the server (deleted, wiped, or setup never completed), a stale local
      // user object would keep the app showing partial data on the tabs.
      // Force a clean logout so onboarding re-runs and a real seller/dealer
      // row is created.
      const expectSeller = userType === 'seller' || data.user?.role === 'seller';
      const expectDealer = userType === 'dealer' || data.user?.role === 'dealer';
      if ((expectSeller && !data.seller) || (expectDealer && !data.dealer)) {
        await logout();
        return null;
      }
      const profile = data.seller || data.dealer || {};
      const merged = {
        ...(user || {}),
        ...(data.user || {}),
        token: user?.token, // preserve existing session token
        reg_id:        profile.reg_id ?? user?.reg_id ?? null,
        name:          profile.name || profile.owner_name || user?.name || '',
        gmail:         profile.gmail          ?? user?.gmail          ?? '',
        city:          profile.city           ?? user?.city           ?? '',
        district:      profile.district       ?? user?.district       ?? '',
        state:         profile.state          ?? user?.state          ?? '',
        seller_type:       profile.seller_type       ?? user?.seller_type       ?? null,
        is_suspended:      profile.is_suspended      ?? 0,
        suspension_reason: profile.suspension_reason ?? null,
        suspended_at:      profile.suspended_at      ?? null,
        company_name:      profile.company_name      ?? user?.company_name      ?? null,
        designation:       profile.designation       ?? user?.designation       ?? null,
        company_sector:    profile.company_sector    ?? user?.company_sector    ?? null,
        pan_or_gst:        profile.pan_or_gst        ?? user?.pan_or_gst        ?? null,
        company_door_no:   profile.company_door_no   ?? user?.company_door_no   ?? null,
        company_street:    profile.company_street    ?? user?.company_street    ?? null,
        company_locality:  profile.company_locality  ?? user?.company_locality  ?? null,
        company_pincode:   profile.company_pincode   ?? user?.company_pincode   ?? null,
        company_lat:       profile.company_lat       ?? user?.company_lat       ?? null,
        company_lng:       profile.company_lng       ?? user?.company_lng       ?? null,
      };
      setUser(merged);
      await AsyncStorage.setItem('user', JSON.stringify(merged));
      return merged;
    } catch {
      // Silent fail — network error, expired session, etc.
      // Caller can decide to logout if needed.
      return null;
    }
  };

  const logout = async () => {
    setUser(null);
    setUserType(null);
    setActiveOrder(null);
    setIsOnline(false);
    // Clear push token cache on logout so the next login re-registers once
    // (ensures correct user is associated if the device is shared)
    await clearPushTokenCache();
    await AsyncStorage.multiRemove(['user', 'userType']);
  };

  // ── Order draft helpers ────────────────────────────────────────────────────
  // Merge partial fields into the draft (each PostStep calls this)
  const setOrderDraft = (fields) => {
    setOrderDraftState(prev => ({ ...prev, ...fields }));
  };

  // Called after a successful order submission to start fresh next time
  const clearOrderDraft = () => {
    setOrderDraftState(EMPTY_DRAFT);
  };

  // ── Saved address helpers ──────────────────────────────────────────────────
  // addrObj: { line1, line2, landmark, pincode, addrType, coords, label }
  const saveAddress = async (addrObj) => {
    setSavedAddressState(addrObj);
    await AsyncStorage.setItem('savedAddress', JSON.stringify(addrObj)).catch(() => {});
  };

  const toggleLanguage = async () => {
    const newLang = language === 'ta' ? 'en' : 'ta';
    setLanguage(newLang);
    await AsyncStorage.setItem('language', newLang);
  };

  const changeLanguage = async (lang) => {
    setLanguage(lang);
    await AsyncStorage.setItem('language', lang);
  };

  const value = {
    language,
    setLanguage,
    toggleLanguage,
    changeLanguage,
    user,
    userType,
    isLoading,
    isOnline,
    setIsOnline,
    activeOrder,
    setActiveOrder,
    login,
    logout,
    updateUser,
    refreshUser,
    // Order draft
    orderDraft,
    setOrderDraft,
    clearOrderDraft,
    // Saved address
    savedAddress,
    saveAddress,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
};
