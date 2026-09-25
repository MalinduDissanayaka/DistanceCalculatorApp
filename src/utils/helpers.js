import { REQUEST_TIMEOUT_MS } from '../constants/config';

/**
 * Fetches a URL and parses the JSON body, aborting after REQUEST_TIMEOUT_MS.
 * @param {string} url
 * @param {RequestInit} [options] Extra fetch options (headers, etc.).
 * @returns {Promise<any>} Parsed JSON.
 * @throws {Error} `HTTP <status>` for non-2xx responses, or an AbortError on timeout.
 */
export async function fetchJson(url, options = {}) {
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

/**
 * Converts a fetch error into a user-friendly message.
 * @param {any} error
 * @returns {string}
 */
export function describeError(error) {
  if (error?.name === 'AbortError') {
    return 'The request timed out. Please check your connection and try again.';
  }
  if (String(error?.message).startsWith('HTTP')) {
    return `The server returned an error (${error.message}). Please try again shortly.`;
  }
  return 'Network error. Please check your internet connection and try again.';
}

/**
 * Formats a number with thousands separators, e.g. 12345.6 → "12,345.60".
 * @param {number} value
 * @param {number} [decimals=0]
 * @returns {string}
 */
export function formatNumber(value, decimals = 0) {
  const [whole, fraction] = Number(value).toFixed(decimals).split('.');
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return fraction ? `${withCommas}.${fraction}` : withCommas;
}

/**
 * Formats a duration in seconds as "X h Y min" (minimum 1 min).
 * @param {number} seconds
 * @returns {string}
 */
export function formatDuration(seconds) {
  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
}

/**
 * Shortens a Nominatim display name to its first two parts,
 * e.g. "Kandy, Central Province, Sri Lanka" → "Kandy, Central Province".
 * @param {string} [name]
 * @returns {string}
 */
export function shortName(name) {
  if (!name) return '';
  return name.split(',').slice(0, 2).join(',').trim();
}
