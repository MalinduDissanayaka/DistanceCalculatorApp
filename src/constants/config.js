import { Platform } from 'react-native';

// ─── App settings ────────────────────────────────────────────────────────────

/** Fare charged per kilometre, in LKR. */
export const RATE_PER_KM = 120;

/** Initial map centre (Colombo, Sri Lanka). */
export const DEFAULT_CENTER = { lat: 6.9271, lon: 79.8612 };

/** ISO country code to limit geocoding results. Set to '' to search worldwide. */
export const COUNTRY_CODE = 'lk';

/** Network requests are aborted after this many milliseconds. */
export const REQUEST_TIMEOUT_MS = 15000;

// ─── API endpoints ───────────────────────────────────────────────────────────

/** Nominatim geocoding endpoint (place name → coordinates). */
export const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

/** OSRM driving-route endpoint. */
export const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';

// ─── Search-as-you-type suggestions ──────────────────────────────────────────

/** Photon autocomplete endpoint (OpenStreetMap data, built for type-ahead search). */
export const PHOTON_URL = 'https://photon.komoot.io/api/';

/** Photon reverse-geocoding endpoint (coordinates → place name), used for "current location". */
export const PHOTON_REVERSE_URL = 'https://photon.komoot.io/reverse';

/** Suggestion area as "minLon,minLat,maxLon,maxLat" (Sri Lanka). Set to null to search worldwide. */
export const SEARCH_BBOX = '79.5,5.8,82.0,9.9';

/** Minimum characters typed before suggestions are requested. */
export const SUGGESTION_MIN_CHARS = 3;

/** Wait this long after the last keystroke before requesting suggestions. */
export const SUGGESTION_DEBOUNCE_MS = 400;

/** Maximum number of suggestions shown. */
export const SUGGESTION_LIMIT = 5;

// ─── Theme ───────────────────────────────────────────────────────────────────

/** App colour palette. */
export const COLORS = {
  bg: '#F3F5F9',
  card: '#FFFFFF',
  text: '#111827',
  muted: '#6B7280',
  border: '#E5E7EB',
  primary: '#2563EB',
  primarySoft: '#EFF4FF',
  start: '#16A34A',
  drop: '#DC2626',
  accent: '#F59E0B',
  disabled: '#9CA3AF',
};

/** Platform-specific drop shadow shared by cards. */
export const SHADOW = Platform.select({
  ios: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  android: { elevation: 3 },
  default: {},
});

// ─── Leaflet map page ────────────────────────────────────────────────────────

/**
 * HTML page loaded once into the WebView. It exposes `window.updateMap(data)`,
 * which the app calls via `injectJavaScript` to draw markers and the route,
 * and posts `{ type: 'ready' | 'error' }` back to the app.
 */
export const MAP_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; }
    .pin {
      width: 18px; height: 18px; border-radius: 50%;
      border: 3px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.45);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    function send(msg) {
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(msg));
    }
    try {
      var map = L.map('map', { zoomControl: true }).setView([${DEFAULT_CENTER.lat}, ${DEFAULT_CENTER.lon}], 11);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      var layers = L.layerGroup().addTo(map);

      function pin(color) {
        return L.divIcon({
          className: '',
          html: '<div class="pin" style="background:' + color + '"></div>',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
          popupAnchor: [0, -12]
        });
      }

      window.updateMap = function (data) {
        layers.clearLayers();
        var bounds = [];

        if (data.start) {
          L.marker([data.start.lat, data.start.lon], { icon: pin('${COLORS.start}') })
            .bindPopup('<b>Start</b><br/>' + data.start.label).addTo(layers);
          bounds.push([data.start.lat, data.start.lon]);
        }
        if (data.drop) {
          L.marker([data.drop.lat, data.drop.lon], { icon: pin('${COLORS.drop}') })
            .bindPopup('<b>Drop</b><br/>' + data.drop.label).addTo(layers);
          bounds.push([data.drop.lat, data.drop.lon]);
        }
        if (data.route && data.route.length > 1) {
          var line = L.polyline(data.route, { color: '${COLORS.primary}', weight: 5, opacity: 0.85 }).addTo(layers);
          map.fitBounds(line.getBounds(), { padding: [30, 30] });
        } else if (bounds.length === 2) {
          map.fitBounds(bounds, { padding: [40, 40] });
        } else if (bounds.length === 1) {
          map.setView(bounds[0], 13);
        } else {
          map.setView([${DEFAULT_CENTER.lat}, ${DEFAULT_CENTER.lon}], 11);
        }
      };

      send({ type: 'ready' });
    } catch (e) {
      send({ type: 'error', message: String(e) });
    }
  </script>
</body>
</html>`;
