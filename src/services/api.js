import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';

// API host = EXPO_PUBLIC_API_URL from the environment. Set in:
//   - .env.local for `npx expo start`  (local dev)
//   - eas.json → build.<profile>.env for EAS Cloud APK builds
// No code-level default — if missing, requests fail with a clear error.
const RUNTIME_API = (
  (typeof process !== 'undefined' && process.env && process.env.EXPO_PUBLIC_API_URL) || ''
).replace(/\/+$/, '');
const BASE_URL = `${RUNTIME_API}/api`;

// Host WITHOUT the /api suffix — used by non-axios callers (city master
// fetch in constants/locations.js).
export const API_BASE = RUNTIME_API;

const api = axios.create({
  baseURL: BASE_URL,
  // 30s covers spotty 4G — the previous 15s was firing false "network error"
  // alerts on the OTP verify step for real users on marginal signal.
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach auth token automatically
api.interceptors.request.use(async (config) => {
  // Primary: logged-in user token
  const user = await AsyncStorage.getItem('user');
  if (user) {
    const parsed = JSON.parse(user);
    if (parsed.token && parsed.token !== 'demo-token') {
      config.headers.Authorization = `Bearer ${parsed.token}`;
      return config;
    }
  }
  // Fallback: temp token stored after OTP verify (used before full login during registration)
  const tempToken = await AsyncStorage.getItem('auth_token');
  if (tempToken) config.headers.Authorization = `Bearer ${tempToken}`;
  return config;
});

// ─── Auth ─────────────────────────────────────────────────────────────────────
// Backend expects { mobile, role } — NOT { phone }
// sellerType ('small' | 'bulk') lets the worker reject cross-tier conflicts:
// e.g. a bulk-registered number trying to log in as a small seller now
// fails at send-OTP with a 409 role_conflict instead of silently
// succeeding and leaving the seller with the wrong seller_type record.
export const sendOTP = (mobile, role, sellerType) =>
  api.post('/auth/send-otp', { mobile, role, seller_type: sellerType || null });

// Backend expects { mobile, otp, role } — NOT { phone, otp, userType }
// Also sends device_name so the session record has real hardware info from the start
export const verifyOTP = (mobile, otp, role) => {
  const device_name = Device.modelName || Device.deviceName || Device.brand || null;
  return api.post('/auth/verify-otp', { mobile, otp, role, device_name });
};

// ─── Registration ──────────────────────────────────────────────────────────────
export const sellerSetup = (data) =>
  api.post('/seller/setup', data);

// JSON body — photos uploaded separately via uploadPhoto() then passed as URLs
export const dealerRegister = (data) =>
  api.post('/dealer/register', data);

// ─── Market Rates ─────────────────────────────────────────────────────────────
export const getScrapRates = () =>
  api.get('/market-prices');

// ─── Photo Upload (Cloudinary via worker) ─────────────────────────────────────
export const uploadPhoto = (base64data, type = 'image/jpeg') =>
  api.post('/upload', { data: base64data, type });

// ─── Seller ───────────────────────────────────────────────────────────────────
// JSON body with photo_urls array + items array
export const postScrapRequest = (data) =>
  api.post('/orders', data);

export const getSellerOrders = () =>
  api.get('/orders/seller');

export const getOrderStatus = (orderId) =>
  api.get(`/orders/${orderId}`);

export const cancelOrder = (orderId, reason) =>
  api.patch(`/orders/${orderId}/status`, { status: 'cancelled', cancellation_reason: reason || null });

export const rateDealer = (orderId, rating, review) =>
  api.post('/ratings', { stars: rating, feedback: review });

// ─── Dealer ───────────────────────────────────────────────────────────────────
export const getDealerOrders = () =>
  api.get('/orders/dealer');

export const acceptOrder = (orderId) =>
  api.patch(`/orders/${orderId}/status`, { status: 'assigned' });

export const updateOrderStatus = (orderId, status) =>
  api.patch(`/orders/${orderId}/status`, { status });

export const completeOrder = (orderId, completionPhotoUrl, amountPaid) =>
  api.patch(`/orders/${orderId}/status`, {
    status: 'completed',
    completion_photo: completionPhotoUrl || null,
    amount_paid: amountPaid ? Number(amountPaid) : null,
  });

export const rateSeller = (orderId, rating, review) =>
  api.post('/ratings', { stars: rating, feedback: review });

export const getDealerProfile = () =>
  api.get('/auth/me');

// Backend uses POST /dealer/status with { is_online }
export const updateDealerStatus = (isOnline) =>
  api.post('/dealer/status', { is_online: isOnline ? 1 : 0 });

export const getDealerAnalytics = () =>
  api.get('/stats/dealer');

// ─── Support Tickets ──────────────────────────────────────────────────────────
export const getTickets = () =>
  api.get('/tickets');

export const createTicket = (issue_type, message) =>
  api.post('/tickets', { issue_type, message });

export const getTicket = (id) =>
  api.get(`/tickets/${id}`);

export const addTicketMessage = (id, message) =>
  api.post(`/tickets/${id}/message`, { message });

// Worker does not expose a user-facing reopen endpoint. Ticket reopen is an
// admin-only action (PATCH /admin/tickets/:id/status). If the user needs to
// continue a closed conversation, we open a new ticket instead. Keeping this
// function so callers don't break — it now no-ops with a clear rejection.
export const reopenTicket = () =>
  Promise.reject(new Error('Please open a new support ticket to continue.'));

// ─── Address Book (multi-address, added post-May 2026) ────────────────────────
// ─── Service pincodes (public — check + notify waitlist) ─────────────────────
export const checkPincode         = (pincode) => api.post('/service-pincodes/check',    { pincode });
export const joinPincodeWaitlist  = (pincode, mobile) => api.post('/service-pincodes/waitlist', { pincode, mobile });

export const listAddresses    = () => api.get('/addresses');
export const addAddress       = (payload) => api.post('/addresses', payload);
export const setDefaultAddress = (id) => api.patch(`/addresses/${id}/default`);
export const deleteAddress    = (id) => api.delete(`/addresses/${id}`);

// ─── Seller Edit Requests (for suspended-account edit flow) ───────────────────
export const submitEditRequest = (payload) =>
  api.post('/seller/edit-request', payload);
export const getLatestEditRequest = () =>
  api.get('/seller/edit-request/latest');

// ─── Seller / Dealer profile updates ──────────────────────────────────────────
export const updateSellerGmail          = (gmail) => api.patch('/seller/gmail', { gmail });
export const updateSellerCompanyAddress = (payload) => api.patch('/seller/company-address', payload);
export const updateDealerGmail          = (gmail) => api.patch('/dealer/gmail', { gmail });
export const updateDealerScrapTypes     = (scrap_types) => api.patch('/dealer/scrap-types', { scrap_types });

// ─── Yard Finds (public — no auth needed for list / detail / enquire) ─────────
export const getYardProducts = (params = {}) =>
  api.get('/yard/products', { params });
export const getYardProduct  = (slug) =>
  api.get(`/yard/products/${slug}`);
export const submitYardEnquiry = (item_code) =>
  api.post('/yard/enquiries', { item_code });

// ─── Dealer broadcast + decline (newer flow) ──────────────────────────────────
export const getBroadcastOrders = () => api.get('/orders/broadcast');
export const declineOrder       = (id, reason) =>
  api.post(`/orders/${id}/decline`, { reason: reason || null });

// ─── Newer per-order rating routes (preferred over generic /ratings) ──────────
export const rateDealerForOrder = (orderId, stars, feedback) =>
  api.post(`/orders/${orderId}/rate-dealer`, { stars, feedback: feedback || null });
export const rateSellerForOrder = (orderId, stars, feedback) =>
  api.post(`/orders/${orderId}/rate-seller`, { stars, feedback: feedback || null });

// ─── Seller stats (dashboard) ────────────────────────────────────────────────
export const getSellerStats = () => api.get('/stats/seller');

// ─── Custom scrap products the seller adds manually ──────────────────────────
export const addCustomProduct = (name, unit) =>
  api.post('/products/custom', { name, unit: unit || 'kg' });

// ─── Push Token + Session Tracking ───────────────────────────────────────────
export const registerPushToken = (token, deviceModel) =>
  api.post('/notifications/register', { token, deviceModel });

export const trackSession = (deviceModel) =>
  api.post('/sessions/track', { deviceModel });

export default api;
