import * as Location from 'expo-location';

import { PHOTON_REVERSE_URL, REQUEST_TIMEOUT_MS } from '../constants/config';
import { describePlace, fetchJson } from './helpers';

/**
 * Error thrown by getCurrentLocation with a `code` the UI can react to:
 * - 'permission'  the user denied location access
 * - 'services'    device location (GPS) is turned off
 * - 'unavailable' no position could be obtained
 */
export class CurrentLocationError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

/** Rejects if `promise` takes longer than `ms`. */
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

/**
 * Looks up a readable name for coordinates with Photon.
 * Falls back to plain coordinates if the lookup fails.
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<string>}
 */
async function reverseGeocode(lat, lon) {
  const fallback = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  try {
    const data = await fetchJson(`${PHOTON_REVERSE_URL}?lat=${lat}&lon=${lon}&lang=en`, {
      headers: { Accept: 'application/json', 'User-Agent': 'DistanceCalculatorApp/1.0' },
    });
    const properties = data?.features?.[0]?.properties;
    if (!properties) return fallback;
    // Prefer the street over a nearby shop or building name (e.g. "Book Shop").
    const place = describePlace(properties.street ? { ...properties, name: undefined } : properties);
    return place?.name || fallback;
  } catch {
    return fallback;
  }
}

/**
 * Gets the device's current position (asking for permission if needed)
 * and a readable name for it.
 * @returns {Promise<{ lat: number, lon: number, name: string }>}
 * @throws {CurrentLocationError}
 */
export async function getCurrentLocation() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new CurrentLocationError('permission', 'Location permission was denied.');
  }

  if (!(await Location.hasServicesEnabledAsync())) {
    throw new CurrentLocationError('services', 'Location services are turned off.');
  }

  let position = null;
  try {
    position = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      REQUEST_TIMEOUT_MS,
    );
  } catch {
    // GPS can be slow indoors; fall back to the last known position.
    position = await Location.getLastKnownPositionAsync();
  }

  if (!position) {
    throw new CurrentLocationError('unavailable', 'Could not determine your location.');
  }

  const { latitude: lat, longitude: lon } = position.coords;
  return { lat, lon, name: await reverseGeocode(lat, lon) };
}
