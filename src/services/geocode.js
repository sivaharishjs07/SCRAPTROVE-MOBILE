/**
 * Reverse geocoding (GPS position -> address fields) for the bulk-seller
 * sign-up and company-address edit screens. The only place in the app that
 * calls Nominatim.
 *
 * INTERIM (S8 option C): follows the Nominatim usage policy
 * (https://operations.osmfoundation.org/policies/nominatim/): requests are
 * only made when the user taps the GPS button, the app identifies itself
 * with its own User-Agent (library defaults like okhttp are refused by the
 * policy), and screens show "© OpenStreetMap contributors" (GEOCODER_ATTRIBUTION).
 * Before launch this is replaced by the phone's own geocoder
 * (expo-location reverseGeocodeAsync), as PostStep3/AddressForm already use
 * (S8 option A, docs/MAPS_MIGRATION_PLAN.md). Callers only depend on the
 * normalised result below, so only this file has to change.
 */
import * as Application from 'expo-application';

const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';
const TIMEOUT_MS = 10000;

const USER_AGENT =
  `ScrapTrove/${Application.nativeApplicationVersion || '0'} (Android app; support@scraptrove.com)`;

export const GEOCODER_ATTRIBUTION = 'Address lookup © OpenStreetMap contributors';

/**
 * @returns {Promise<{doorNo: string, street: string, locality: string,
 *   district: string, state: string, pincode: string}>}
 * Empty string for anything not found. Rejects on network error, timeout
 * or a non-OK response.
 */
export async function reverseGeocode(lat, lng) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const url = `${NOMINATIM_REVERSE_URL}?lat=${Number(lat)}&lon=${Number(lng)}&format=json&addressdetails=1`;
    const res = await fetch(url, {
      headers: { 'Accept-Language': 'en', 'User-Agent': USER_AGENT },
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`Geocoder HTTP ${res.status}`);
    const data = await res.json();
    const a = data?.address || {};
    // Same field priority the screens used before.
    return {
      doorNo:   a.house_number || '',
      street:   a.road || a.pedestrian || a.footway || '',
      locality: a.suburb || a.neighbourhood || a.hamlet || a.village || '',
      district: a.state_district || a.city_district || a.city || '',
      state:    a.state || '',
      pincode:  a.postcode || '',
    };
  } finally {
    clearTimeout(timer);
  }
}
