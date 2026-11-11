import axios from 'axios';
import * as Device from 'expo-device';
import { getAuthToken, getSessionToken } from './authToken';

// API host = EXPO_PUBLIC_API_URL from the environment. Set in:
//   - .env.local for `npx expo start`  (local dev)
//   - eas.json → build.<profile>.env for EAS Cloud APK builds
// No code-level default — if missing, requests fail with a clear error.
const RUNTIME_API = (
  (typeof process !== 'undefined' && process.env && process.env.EXPO_PUBLIC_API_URL) || ''
).replace(/\/+$/, '');
const BASE_URL = `${RUNTIME_API}/api`;

// Release builds talk to the API over HTTPS only: the session token and
// personal data travel in every request. A plain http:// address is allowed
// in development (__DEV__) for a local server, never in a release build.
const API_IS_HTTPS = /^https:\/\//i.test(RUNTIME_API);
const API_INSECURE = !!RUNTIME_API && !API_IS_HTTPS && !__DEV__;

// False when the build has no EXPO_PUBLIC_API_URL, or (release builds) when
// it is not https. Without this, a build missing the variable produces
// relative '/api' requests that fail with a plain network error,
// indistinguishable from bad signal. Fail fast and say so instead.
export const API_CONFIGURED = !!RUNTIME_API && !API_INSECURE;

// Host WITHOUT the /api suffix, used by non-axios callers (city master
// fetch in constants/locations.js). Empty when the host is unusable, so
// those calls fail instead of going out over plain http.
export const API_BASE = API_CONFIGURED ? RUNTIME_API : '';

// Called when the server rejects the current session token (HTTP 401).
// AppContext registers its logout here; api.js cannot import AppContext.
let unauthorizedHandler = null;
let handlingUnauthorized = false;
export const setUnauthorizedHandler = (fn) => { unauthorizedHandler = fn; };

// verify-otp / send-otp answer with errors for a wrong or expired OTP; those
// are login failures, not a dead session, and must never trigger a logout.
const AUTH_ENTRY_PATHS = ['/auth/send-otp', '/auth/verify-otp'];

const SERVER_ERROR_MESSAGE = 'Something went wrong on our side. Please try again in a moment.';

const api = axios.create({
  baseURL: BASE_URL,
  // The worker re-runs its full schema bootstrap on every cold isolate,
  // which has been measured at ~30s on both staging and production. At the
  // old 30s timeout those requests aborted on the exact boundary and the
  // app blamed the user's connection, while un-timed fetch() calls on the
  // same screen succeeded. 60s lets a cold request through; the real fix
  // is on the worker side.
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach auth token automatically
api.interceptors.request.use(async (config) => {
  if (!API_CONFIGURED) {
    // Shaped like an axios error response so the screens that already read
    // err.response.data.error surface this verbatim.
    const e = new Error('API host not configured');
    e.response = { status: 0, data: { error: API_INSECURE
      ? 'This build is set to an insecure (http) server address. Please install an official build.'
      : 'This build has no server address configured (EXPO_PUBLIC_API_URL). Please install a build made from the preview or production profile.' } };
    throw e;
  }
  // Logged-in session token first, then the temporary sign-up token issued
  // by verify-otp. Both live in SecureStore (see services/authToken.js).
  // Guarded because a throw in here rejects the request with no response at
  // all, which every screen then reports as a connection problem.
  let token = null;
  let session = null;
  try {
    token = await getAuthToken();
    session = await getSessionToken();
  } catch { token = null; }
  if (token) config.headers.Authorization = `Bearer ${token}`;
  // Remember whether this request carried the logged-in session token, so a
  // 401 can be matched to the session it belongs to (see below).
  config.sentSessionToken = token && token === session ? token : null;
  return config;
});

// 401 on a request that carried the CURRENT session token means the server
// no longer accepts it (expired or revoked): log out once. Ignored when:
// - the request used no token or only the sign-up token,
// - the token has changed since (a late answer from a previous session),
// - it is the OTP login itself,
// - a logout for this is already running (several requests can fail at once,
//   and logout itself makes one call with the same token).
async function handleUnauthorized(err) {
  const sent = err?.config?.sentSessionToken;
  const url = err?.config?.url || '';
  if (!sent || handlingUnauthorized || !unauthorizedHandler) return;
  if (AUTH_ENTRY_PATHS.some((p) => url.startsWith(p))) return;
  // Claim the flag before the first await: several 401s usually arrive
  // together, and all of them would otherwise pass the check above.
  handlingUnauthorized = true;
  try {
    let current = null;
    try { current = await getSessionToken(); } catch { current = null; }
    if (sent === current) await unauthorizedHandler();
  } catch { /* ignore */ }
  finally { handlingUnauthorized = false; }
}

// Turn a timeout into an honest message. Screens read
// err.response.data.error for their alert text and otherwise fall back to
// "check your connection", which is misleading when the phone is online
// and the server simply took too long. Only synthesised when the request
// genuinely came back with no response.
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const timedOut = err?.code === 'ECONNABORTED' || /timeout/i.test(err?.message || '');
    if (timedOut && !err.response) {
      err.response = {
        status: 0,
        data: { error: 'The server is taking too long to respond. Please wait a moment and try again.' },
      };
    }
    const status = err?.response?.status;
    if (status === 401) {
      // Not awaited: the caller gets its error straight away while the app
      // logs out and returns to the welcome screen.
      handleUnauthorized(err);
    }
    // Screens show err.response.data.error verbatim. That is right for 4xx
    // (e.g. "Invalid OTP"), but a 5xx text can carry internal details (stack
    // traces, SQL, upstream errors), so release builds show a generic line.
    if (status >= 500 && !__DEV__) {
      const data = err.response.data;
      err.response.data = { ...(data && typeof data === 'object' ? data : {}), error: SERVER_ERROR_MESSAGE };
    }
    return Promise.reject(err);
  }
);

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

// order_id is required — the worker rejects tickets that aren't raised
// against one of the caller's own orders, and issue_type must be a value
// from GET /api/tickets/issue-types (TICKET_ISSUE_TYPES on the worker).
export const createTicket = (order_id, issue_type, message, attachments) =>
  api.post('/tickets', { order_id, issue_type, message, attachments });

export const getTicketIssueTypes = () =>
  api.get('/tickets/issue-types');

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
