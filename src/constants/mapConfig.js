/**
 * Map picker (Leaflet in a WebView, OpenStreetMap tiles), shared by
 * PostStep3Screen and AddressFormScreen.
 *
 * INTERIM (S8 option C): brings the map in line with the OSMF tile usage
 * policy (https://operations.osmfoundation.org/policies/tiles/):
 *   - exact tile URL https://tile.openstreetmap.org/{z}/{x}/{y}.png
 *     (the old a/b/c subdomains "may be slower or withdrawn")
 *   - visible attribution on the map
 *   - the app identifies itself in the WebView User-Agent
 * OSM tiles have no SLA and access can be withdrawn at any time. Before
 * launch this is replaced by react-native-maps with the Google Maps SDK
 * (S8 option A, docs/MAPS_MIGRATION_PLAN.md); this file is the single place
 * to remove.
 */
import { Linking } from 'react-native';
import * as Application from 'expo-application';

export const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// Appended by react-native-webview to the WebView's User-Agent, so tile
// requests name the app and a contact instead of looking like a browser.
export const MAP_APP_NAME_FOR_USER_AGENT =
  `ScrapTrove/${Application.nativeApplicationVersion || '0'} (+support@scraptrove.com)`;

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// Leaflet page centred on lat/lng with a draggable pin. Coordinates are
// forced to numbers before they are written into the page.
export const leafletHtml = (lat, lng) => {
  const la = num(lat);
  const ln = num(lng);
  return `
<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>*{margin:0;padding:0;box-sizing:border-box}html,body,#map{height:100%;width:100%}</style>
</head><body><div id="map"></div><script>
var map=L.map('map').setView([${la},${ln}],16);
L.tileLayer('${OSM_TILE_URL}',{maxZoom:19,attribution:'${OSM_ATTRIBUTION}'}).addTo(map);
var pin=L.marker([${la},${ln}],{draggable:true}).addTo(map);
function send(ll){window.ReactNativeWebView.postMessage(JSON.stringify({lat:ll.lat,lng:ll.lng}));}
pin.on('dragend',function(e){send(e.target.getLatLng());});
map.on('click',function(e){pin.setLatLng(e.latlng);send(e.latlng);});
</script></body></html>`;
};

// The WebView may only show the map page itself. Any link (for example the
// OpenStreetMap attribution link) opens in the phone's browser instead of
// replacing the map inside the app.
export const onMapShouldStartLoad = (request) => {
  const url = request?.url || '';
  if (/^https?:\/\//i.test(url)) {
    Linking.openURL(url).catch(() => {});
    return false;
  }
  return true;
};

// Pin position from a WebView message, or null if it is not a valid
// latitude/longitude pair.
export const parseMapMessage = (event) => {
  try {
    const { lat, lng } = JSON.parse(event?.nativeEvent?.data);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return { lat, lng };
  } catch {
    return null;
  }
};
