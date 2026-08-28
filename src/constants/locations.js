// Location data matching the Scrap Trove web app exactly
export const LOC = {
  "Tamil Nadu": {
    "Chennai":    ["Anna Nagar","Adyar","T. Nagar","Velachery","Tambaram","Porur","Ambattur","Chromepet","Mogappair"],
    "Coimbatore": ["RS Puram","Gandhipuram","Peelamedu","Ukkadam"],
    "Madurai":    ["Anna Nagar","Bypass Road","Palanganatham","K K Nagar"],
    "Salem":      ["Fairlands","Suramangalam","Omalur","Attur"],
    "Trichy":     ["Srirangam","Woraiyur","Thillai Nagar","Cantonment"],
  },
  "Kerala": {
    "Kochi":              ["Ernakulam","Fort Kochi","Edappally","Kakkanad","Aluva"],
    "Thiruvananthapuram": ["Kowdiar","Pattom","Kazhakkoottam","Nemon"],
    "Kozhikode":          ["Nadakkavu","Mavoor"],
  },
  "Karnataka": {
    "Bengaluru": ["Koramangala","Indiranagar","Whitefield","Jayanagar","HSR Layout","BTM Layout"],
    "Mysuru":    ["Saraswathipuram","Gokulam","Kuvempunagar"],
    "Mangaluru": ["Kadri","Surathkal"],
  },
  "Maharashtra": {
    "Mumbai": ["Andheri","Bandra","Dadar","Borivali","Juhu","Powai"],
    "Pune":   ["Kothrud","Wakad","Hinjawadi","Viman Nagar","Baner"],
    "Nagpur": ["Sadar","Sitabuldi"],
  },
  "Delhi": {
    "New Delhi": ["Connaught Place","Saket","Vasant Kunj","Dwarka","Hauz Khas","Karol Bagh"],
  },
  "Andhra Pradesh": {
    "Visakhapatnam": ["MVP Colony","Gajuwaka","Madhurawada"],
    "Vijayawada":    ["Benz Circle","Patamata"],
  },
};

export const STATES       = Object.keys(LOC);
export const districts    = (state)           => state ? Object.keys(LOC[state] || {}) : [];
export const cities       = (state, district) => (state && district) ? (LOC[state]?.[district] || []) : [];
// Historic aliases — some screens import these names.
export const getDistricts = districts;
export const getCities    = cities;

// ── City Master live layer ────────────────────────────────────────────
// LOC above still drives the dropdowns (works offline, no round-trip on
// first paint). At submit time getCityIdAsync() waits for the initial
// state/district/city tree fetch and returns the admin-managed city_id —
// that gets sent alongside the legacy text triple so the backend can
// save the FK. Backend still resolves via text as fallback.

import { API_BASE } from '../services/api';

const REMOTE = {};
let remotePromise = null;

async function _fetchTree() {
  const base = API_BASE || '';
  try {
    const states = await fetch(`${base}/api/states`).then(r => r.json());
    if (!Array.isArray(states)) return;
    await Promise.all(states.map(async (s) => {
      REMOTE[s.name] = { id: s.id, districts: {} };
      const ds = await fetch(`${base}/api/districts?state_id=${s.id}`).then(r => r.json()).catch(() => []);
      if (!Array.isArray(ds)) return;
      await Promise.all(ds.map(async (d) => {
        REMOTE[s.name].districts[d.name] = { id: d.id, cities: {} };
        const cs = await fetch(`${base}/api/cities?district_id=${d.id}`).then(r => r.json()).catch(() => []);
        if (!Array.isArray(cs)) return;
        for (const c of cs) REMOTE[s.name].districts[d.name].cities[c.name] = c.id;
      }));
    }));
  } catch {}
}

if (!remotePromise) remotePromise = _fetchTree();

export const getCityId = (state, district, city) => {
  if (!state || !district || !city) return null;
  return REMOTE[state]?.districts?.[district]?.cities?.[city] ?? null;
};
export const getCityIdAsync = async (state, district, city) => {
  try { if (remotePromise) await remotePromise; } catch {}
  return getCityId(state, district, city);
};
export const refreshLocations = () => {
  remotePromise = _fetchTree();
  return remotePromise;
};
