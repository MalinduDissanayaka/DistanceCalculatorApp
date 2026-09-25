import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

// ─── Config ──────────────────────────────────────────────────────────────────
const RATE_PER_KM = 120; // LKR per km
const DEFAULT_CENTER = { lat: 6.9271, lon: 79.8612 }; // Colombo, Sri Lanka
const COUNTRY_CODE = 'lk'; // Limit geocoding to Sri Lanka. Set to '' to search worldwide.
const REQUEST_TIMEOUT_MS = 15000;

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';

const COLORS = {
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

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function describeError(error) {
  if (error?.name === 'AbortError') {
    return 'The request timed out. Please check your connection and try again.';
  }
  if (String(error?.message).startsWith('HTTP')) {
    return `The server returned an error (${error.message}). Please try again shortly.`;
  }
  return 'Network error. Please check your internet connection and try again.';
}

function formatNumber(value, decimals = 0) {
  const [whole, fraction] = Number(value).toFixed(decimals).split('.');
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return fraction ? `${withCommas}.${fraction}` : withCommas;
}

function formatDuration(seconds) {
  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
}

// ─── Leaflet map (static HTML, updated via injectJavaScript) ─────────────────
const MAP_HTML = `<!DOCTYPE html>
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

// ─── Small UI pieces ─────────────────────────────────────────────────────────
function LocationInput({ label, color, value, onChangeText, onSubmit, loading, resolved, placeholder }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputRow}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={COLORS.disabled}
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmit}
          returnKeyType="search"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={[styles.setButton, loading && styles.buttonDisabled]}
          onPress={onSubmit}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.setButtonText}>{resolved ? 'Update' : 'Set'}</Text>
          )}
        </TouchableOpacity>
      </View>
      {resolved ? (
        <Text style={styles.resolvedText} numberOfLines={2}>
          ✓ {resolved.name}
        </Text>
      ) : null}
    </View>
  );
}

function StatRow({ label, value }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────
function FareCalculatorScreen() {
  const webViewRef = useRef(null);

  const [startQuery, setStartQuery] = useState('');
  const [dropQuery, setDropQuery] = useState('');
  const [startCoords, setStartCoords] = useState(null); // { lat, lon, name }
  const [dropCoords, setDropCoords] = useState(null);
  const [route, setRoute] = useState(null); // { distanceKm, durationSec, fare, path: [[lat, lon], ...] }

  const [searching, setSearching] = useState({ start: false, drop: false });
  const [calculating, setCalculating] = useState(false);

  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  // Keep the map in sync with the current state.
  useEffect(() => {
    if (!mapReady || !webViewRef.current) return;
    const payload = {
      start: startCoords && { lat: startCoords.lat, lon: startCoords.lon, label: shortName(startCoords.name) },
      drop: dropCoords && { lat: dropCoords.lat, lon: dropCoords.lon, label: shortName(dropCoords.name) },
      route: route?.path ?? null,
    };
    webViewRef.current.injectJavaScript(`window.updateMap && window.updateMap(${JSON.stringify(payload)}); true;`);
  }, [mapReady, startCoords, dropCoords, route]);

  // 1. Geocoding (Nominatim)
  const searchLocation = useCallback(async (type) => {
    const query = (type === 'start' ? startQuery : dropQuery).trim();
    const label = type === 'start' ? 'start' : 'drop';

    if (!query) {
      Alert.alert('Missing location', `Please enter a ${label} location first.`);
      return;
    }

    setSearching((s) => ({ ...s, [type]: true }));
    try {
      const params = [
        'format=jsonv2',
        'limit=1',
        `q=${encodeURIComponent(query)}`,
        COUNTRY_CODE ? `countrycodes=${COUNTRY_CODE}` : '',
      ].filter(Boolean).join('&');

      const data = await fetchJson(`${NOMINATIM_URL}?${params}`, {
        headers: {
          Accept: 'application/json',
          'Accept-Language': 'en',
          // Nominatim's usage policy asks apps to identify themselves.
          'User-Agent': 'DistanceCalculatorApp/1.0',
        },
      });

      if (!Array.isArray(data) || data.length === 0) {
        Alert.alert('Location not found', `We couldn't find "${query}". Try a more specific name (e.g. "Kandy, Sri Lanka").`);
        return;
      }

      const location = {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        name: data[0].display_name,
      };

      if (type === 'start') setStartCoords(location);
      else setDropCoords(location);
      setRoute(null); // Previous route no longer matches.
    } catch (error) {
      Alert.alert('Search failed', describeError(error));
    } finally {
      setSearching((s) => ({ ...s, [type]: false }));
    }
  }, [startQuery, dropQuery]);

  // 2. Routing + fare (OSRM)
  const calculateRoute = useCallback(async () => {
    if (!startCoords || !dropCoords) {
      const missing = [!startCoords && 'Start', !dropCoords && 'Drop'].filter(Boolean).join(' and ');
      Alert.alert('Locations required', `Please set the ${missing} location before calculating.`);
      return;
    }
    if (startCoords.lat === dropCoords.lat && startCoords.lon === dropCoords.lon) {
      Alert.alert('Same location', 'Start and Drop locations are the same. Please choose different places.');
      return;
    }

    setCalculating(true);
    try {
      const url = `${OSRM_URL}/${startCoords.lon},${startCoords.lat};${dropCoords.lon},${dropCoords.lat}?overview=full&geometries=geojson`;
      const data = await fetchJson(url);

      if (data.code !== 'Ok' || !data.routes?.length) {
        Alert.alert('No route found', 'We couldn\'t find a driving route between these locations.');
        return;
      }

      const best = data.routes[0];
      const distanceKm = best.distance / 1000;
      setRoute({
        distanceKm,
        durationSec: best.duration,
        fare: Math.round(distanceKm * RATE_PER_KM),
        // GeoJSON is [lon, lat]; Leaflet expects [lat, lon].
        path: best.geometry.coordinates.map(([lon, lat]) => [lat, lon]),
      });
    } catch (error) {
      Alert.alert('Route calculation failed', describeError(error));
    } finally {
      setCalculating(false);
    }
  }, [startCoords, dropCoords]);

  const handleStartChange = (text) => {
    setStartQuery(text);
    if (startCoords) {
      setStartCoords(null);
      setRoute(null);
    }
  };

  const handleDropChange = (text) => {
    setDropQuery(text);
    if (dropCoords) {
      setDropCoords(null);
      setRoute(null);
    }
  };

  const resetAll = () => {
    setStartQuery('');
    setDropQuery('');
    setStartCoords(null);
    setDropCoords(null);
    setRoute(null);
  };

  const confirmRide = () => {
    Alert.alert(
      'Ride Confirmed 🎉',
      `From: ${shortName(startCoords?.name)}\nTo: ${shortName(dropCoords?.name)}\n\n` +
        `Distance: ${formatNumber(route.distanceKm, 2)} km\nTotal Fare: LKR ${formatNumber(route.fare)}`,
    );
  };

  const handleMapMessage = (event) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'ready') {
        setMapReady(true);
        setMapError(false);
      } else if (msg.type === 'error') {
        setMapError(true);
      }
    } catch {
      // Ignore malformed messages.
    }
  };

  const reloadMap = () => {
    setMapReady(false);
    setMapError(false);
    webViewRef.current?.reload();
  };

  const canCalculate = !!startCoords && !!dropCoords && !calculating;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={scrollEnabled}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Ride Fare Calculator</Text>
            <Text style={styles.subtitle}>Get the driving distance and fare for your trip</Text>
          </View>

          {/* Inputs */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Trip details</Text>
              {(startQuery || dropQuery) ? (
                <TouchableOpacity onPress={resetAll} hitSlop={10}>
                  <Text style={styles.resetText}>Clear</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <LocationInput
              label="Start Location"
              color={COLORS.start}
              placeholder="e.g. Colombo Fort"
              value={startQuery}
              onChangeText={handleStartChange}
              onSubmit={() => searchLocation('start')}
              loading={searching.start}
              resolved={startCoords}
            />
            <LocationInput
              label="Drop Location"
              color={COLORS.drop}
              placeholder="e.g. Kandy"
              value={dropQuery}
              onChangeText={handleDropChange}
              onSubmit={() => searchLocation('drop')}
              loading={searching.drop}
              resolved={dropCoords}
            />

            <TouchableOpacity
              style={[styles.primaryButton, !canCalculate && styles.buttonDisabled]}
              onPress={calculateRoute}
              disabled={calculating}
              activeOpacity={0.85}
            >
              {calculating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Calculate Fare & Route</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Summary */}
          {route ? (
            <View style={[styles.card, styles.summaryCard]}>
              <Text style={styles.cardTitle}>Trip summary</Text>

              <View style={styles.fareBox}>
                <Text style={styles.fareLabel}>Total Fare</Text>
                <Text style={styles.fareValue}>LKR {formatNumber(route.fare)}</Text>
              </View>

              <StatRow label="Distance" value={`${formatNumber(route.distanceKm, 2)} km`} />
              <StatRow label="Est. drive time" value={formatDuration(route.durationSec)} />
              <StatRow label="Rate" value={`LKR ${RATE_PER_KM} / km`} />

              <TouchableOpacity style={styles.confirmButton} onPress={confirmRide} activeOpacity={0.85}>
                <Text style={styles.confirmButtonText}>Confirm Ride</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Map */}
          <View
            style={styles.mapCard}
            // Let the map handle pan/zoom gestures instead of the page scrolling.
            onTouchStart={() => setScrollEnabled(false)}
            onTouchEnd={() => setScrollEnabled(true)}
            onTouchCancel={() => setScrollEnabled(true)}
          >
            <WebView
              ref={webViewRef}
              originWhitelist={['*']}
              source={{ html: MAP_HTML }}
              onMessage={handleMapMessage}
              onError={() => setMapError(true)}
              javaScriptEnabled
              domStorageEnabled
              nestedScrollEnabled
              style={styles.flex}
            />
            {!mapReady && !mapError ? (
              <View style={styles.mapOverlay} pointerEvents="none">
                <ActivityIndicator color={COLORS.primary} />
                <Text style={styles.mapOverlayText}>Loading map…</Text>
              </View>
            ) : null}
            {mapError ? (
              <View style={styles.mapOverlay}>
                <Text style={styles.mapOverlayText}>Couldn't load the map.</Text>
                <TouchableOpacity onPress={reloadMap} style={styles.retryButton}>
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>

          <Text style={styles.footnote}>Map data © OpenStreetMap contributors · Routing by OSRM</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function shortName(name) {
  if (!name) return '';
  return name.split(',').slice(0, 2).join(',').trim();
}

export default function App() {
  return (
    <SafeAreaProvider>
      <FareCalculatorScreen />
    </SafeAreaProvider>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const shadow = Platform.select({
  ios: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  android: { elevation: 3 },
  default: {},
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 120 },

  header: { marginBottom: 16, marginTop: 8 },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.text },
  subtitle: { fontSize: 14, color: COLORS.muted, marginTop: 4 },

  card: { backgroundColor: COLORS.card, borderRadius: 18, padding: 16, marginBottom: 16, ...shadow },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  resetText: { color: COLORS.primary, fontWeight: '600' },

  field: { marginTop: 10 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.muted, marginBottom: 6 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: '#FAFBFC',
    paddingLeft: 12,
  },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  input: { flex: 1, paddingVertical: 12, fontSize: 15, color: COLORS.text },
  setButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    minWidth: 76,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopRightRadius: 11,
    borderBottomRightRadius: 11,
  },
  setButtonText: { color: '#fff', fontWeight: '700' },
  resolvedText: { fontSize: 12, color: COLORS.start, marginTop: 6 },

  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 18,
  },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  buttonDisabled: { backgroundColor: COLORS.disabled },

  summaryCard: { borderLeftWidth: 5, borderLeftColor: COLORS.start },
  fareBox: {
    backgroundColor: COLORS.primarySoft,
    borderRadius: 14,
    padding: 14,
    marginVertical: 12,
    alignItems: 'center',
  },
  fareLabel: { fontSize: 13, color: COLORS.muted, fontWeight: '600' },
  fareValue: { fontSize: 30, fontWeight: '800', color: COLORS.primary, marginTop: 2 },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  statLabel: { fontSize: 14, color: COLORS.muted },
  statValue: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  confirmButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  confirmButtonText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  mapCard: {
    height: 340,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
    ...shadow,
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(243,245,249,0.9)',
  },
  mapOverlayText: { marginTop: 8, color: COLORS.muted },
  retryButton: { marginTop: 10, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 10, backgroundColor: COLORS.primary },
  retryText: { color: '#fff', fontWeight: '700' },

  footnote: { textAlign: 'center', fontSize: 11, color: COLORS.muted, marginTop: 12 },
});
