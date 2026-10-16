// City Master — pure API-driven location tree (per PDF §3).
//
// Every state / district / city dropdown in the seller / dealer flow
// renders from the admin-managed master via /api/states,
// /api/districts?state_id=X, /api/cities?district_id=Y. There is NO
// hardcoded fallback list — if the admin hasn't added a state /
// district / city, users can't pick it.
//
// ── Usage from a React Native screen ────────────────────────────────
//   import { useLocations, getCityIdAsync } from '../../constants/locations';
//   const loc = useLocations();  // subscribes for re-render
//   const stateOptions    = loc.states;
//   const districtOptions = loc.districts(state);
//   const cityOptions     = loc.cities(state, district);
//   // on submit:
//   const city_id = await getCityIdAsync(state, district, city);
//
import { useSyncExternalStore } from 'react';
import { API_BASE } from '../services/api';

const REMOTE = {};
let statesFetched  = false;
let statesPromise  = null;
const districtsFetched = new Map();
const citiesFetched    = new Map();
const listeners        = new Set();
const notify = () => listeners.forEach((l) => { try { l(); } catch {} });

async function _fetchStates() {
  if (statesFetched) return;
  if (statesPromise) return statesPromise;
  statesPromise = (async () => {
    try {
      const arr = await fetch(`${API_BASE}/api/states`).then((r) => r.json());
      if (Array.isArray(arr)) {
        for (const s of arr) {
          if (!REMOTE[s.name]) REMOTE[s.name] = { id: s.id, districts: {} };
        }
        statesFetched = true;
        notify();
      }
    } catch { /* leave statesFetched=false so a retry is possible */ }
    finally { statesPromise = null; }
  })();
  return statesPromise;
}

async function _fetchDistricts(stateName) {
  if (districtsFetched.has(stateName)) return districtsFetched.get(stateName);
  await _fetchStates();
  const state = REMOTE[stateName];
  if (!state) return;
  const p = (async () => {
    try {
      const arr = await fetch(`${API_BASE}/api/districts?state_id=${state.id}`).then((r) => r.json());
      if (Array.isArray(arr)) {
        for (const d of arr) {
          if (!state.districts[d.name]) state.districts[d.name] = { id: d.id, cities: {} };
        }
        notify();
      }
    } catch { districtsFetched.delete(stateName); }
  })();
  districtsFetched.set(stateName, p);
  return p;
}

async function _fetchCities(stateName, districtName) {
  const key = `${stateName}::${districtName}`;
  if (citiesFetched.has(key)) return citiesFetched.get(key);
  await _fetchDistricts(stateName);
  const district = REMOTE[stateName]?.districts?.[districtName];
  if (!district) return;
  const p = (async () => {
    try {
      const arr = await fetch(`${API_BASE}/api/cities?district_id=${district.id}`).then((r) => r.json());
      if (Array.isArray(arr)) {
        for (const c of arr) { district.cities[c.name] = c.id; }
        notify();
      }
    } catch { citiesFetched.delete(key); }
  })();
  citiesFetched.set(key, p);
  return p;
}

let _snapToken = 0;
listeners.add(() => { _snapToken++; });
function _subscribe(l) { listeners.add(l); return () => listeners.delete(l); }
function _getSnap() { return _snapToken; }

export function useLocations() {
  useSyncExternalStore(_subscribe, _getSnap, _getSnap);
  if (!statesFetched && !statesPromise) _fetchStates();
  return {
    isReady: statesFetched,
    states: statesList(),
    districts: districtsList,
    cities: citiesList,
  };
}

// ── Sync accessors ────────────────────────────────────────────────────
// Imperative code (submit-handler validators) uses these. Both trigger
// the lazy fetch as a side effect.
export function statesList() {
  return Object.keys(REMOTE).sort();
}
export function districtsList(stateName) {
  if (!stateName) return [];
  if (!districtsFetched.has(stateName)) _fetchDistricts(stateName);
  const r = REMOTE[stateName];
  return r ? Object.keys(r.districts).sort() : [];
}
export function citiesList(stateName, districtName) {
  if (!stateName || !districtName) return [];
  const key = `${stateName}::${districtName}`;
  if (!citiesFetched.has(key)) _fetchCities(stateName, districtName);
  const c = REMOTE[stateName]?.districts?.[districtName]?.cities;
  return c ? Object.keys(c).sort() : [];
}

// Legacy names kept for import-site compatibility. New code should use
// useLocations() so components re-render on data arrival.
export const districts    = districtsList;
export const cities       = citiesList;
export const getDistricts = districtsList;
export const getCities    = citiesList;

// ── Submit-time helpers ──────────────────────────────────────────────
export const getCityId = (state, district, city) => {
  if (!state || !district || !city) return null;
  return REMOTE[state]?.districts?.[district]?.cities?.[city] ?? null;
};

export const getCityIdAsync = async (state, district, city) => {
  if (!state) return null;
  await _fetchStates();
  if (!district) return null;
  await _fetchDistricts(state);
  if (!city) return null;
  await _fetchCities(state, district);
  return getCityId(state, district, city);
};

export const refreshLocations = () => {
  statesFetched = false;
  statesPromise = null;
  districtsFetched.clear();
  citiesFetched.clear();
  return _fetchStates();
};
