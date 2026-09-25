import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import LocationInput from './src/components/LocationInput';
import MapView from './src/components/MapView';
import TripSummary from './src/components/TripSummary';
import { COLORS, COUNTRY_CODE, NOMINATIM_URL, OSRM_URL, RATE_PER_KM, SHADOW } from './src/constants/config';
import { getCurrentLocation } from './src/utils/currentLocation';
import { describeError, fetchJson, formatNumber, shortName } from './src/utils/helpers';

/**
 * Main screen: search Start/Drop locations, calculate the driving route
 * and fare, and show everything on the map.
 */
function FareCalculatorScreen() {
  const [startQuery, setStartQuery] = useState('');
  const [dropQuery, setDropQuery] = useState('');
  const [startCoords, setStartCoords] = useState(null); // { lat, lon, name }
  const [dropCoords, setDropCoords] = useState(null);
  const [route, setRoute] = useState(null); // { distanceKm, durationSec, fare, path: [[lat, lon], ...] }

  const [searching, setSearching] = useState({ start: false, drop: false });
  const [calculating, setCalculating] = useState(false);
  const [locating, setLocating] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  /** Geocodes the Start or Drop query with Nominatim and stores the result. */
  const searchLocation = useCallback(async (type) => {
    const query = (type === 'start' ? startQuery : dropQuery).trim();

    if (!query) {
      Alert.alert('Missing location', `Please enter a ${type} location first.`);
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

  /** Fetches the driving route from OSRM and calculates the fare. */
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

  // Editing a field after it was set clears the stale location and route.
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

  /** Uses a tapped suggestion as the Start or Drop location (no extra search needed). */
  const selectSuggestion = (type, suggestion) => {
    const location = { lat: suggestion.lat, lon: suggestion.lon, name: suggestion.name };
    if (type === 'start') {
      setStartQuery(suggestion.title);
      setStartCoords(location);
    } else {
      setDropQuery(suggestion.title);
      setDropCoords(location);
    }
    setRoute(null); // Previous route no longer matches.
  };

  /** Sets the Start location to the device's current GPS position. */
  const setStartToCurrentLocation = async () => {
    setLocating(true);
    try {
      const location = await getCurrentLocation();
      setStartQuery('Current location');
      setStartCoords(location);
      setRoute(null); // Previous route no longer matches.
    } catch (error) {
      if (error.code === 'permission') {
        Alert.alert(
          'Location permission needed',
          'Allow location access to use your current location as the start point.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ],
        );
      } else if (error.code === 'services') {
        Alert.alert('Location is off', 'Turn on location (GPS) on your phone and try again.');
      } else {
        Alert.alert('Location unavailable', "We couldn't get your current location. Try again, or type the start location.");
      }
    } finally {
      setLocating(false);
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
              onSelectSuggestion={(item) => selectSuggestion('start', item)}
              onUseCurrentLocation={setStartToCurrentLocation}
              locating={locating}
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
              onSelectSuggestion={(item) => selectSuggestion('drop', item)}
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
          {route ? <TripSummary route={route} onConfirm={confirmRide} /> : null}

          {/* Map */}
          <MapView
            start={startCoords}
            drop={dropCoords}
            routePath={route?.path ?? null}
            onScrollLockChange={(locked) => setScrollEnabled(!locked)}
          />

          <Text style={styles.footnote}>Map data © OpenStreetMap contributors · Routing by OSRM</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** App root: provides safe-area insets to the screen. */
export default function App() {
  return (
    <SafeAreaProvider>
      <FareCalculatorScreen />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 23 },

  header: { marginBottom: 16, marginTop: 8 },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.text },
  subtitle: { fontSize: 14, color: COLORS.muted, marginTop: 4 },

  card: { backgroundColor: COLORS.card, borderRadius: 18, padding: 16, marginBottom: 16, ...SHADOW },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  resetText: { color: COLORS.primary, fontWeight: '600' },

  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 18,
  },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  buttonDisabled: { backgroundColor: COLORS.disabled },

  footnote: { textAlign: 'center', fontSize: 11, color: COLORS.muted, marginTop: 12 },
});
