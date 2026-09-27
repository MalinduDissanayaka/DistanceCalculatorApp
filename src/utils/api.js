import { API_URL, REQUEST_TIMEOUT_MS } from '../constants/config';

/**
 * Error thrown for any failed backend call.
 * `status` is the HTTP status, or 0 when the server couldn't be reached.
 * `fieldErrors` holds per-field validation messages from a 400 response, e.g. { email: 'Email must be valid' }.
 */
export class ApiError extends Error {
  constructor(message, status = 0, fieldErrors = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

/** Fallback messages when the server doesn't send one. */
const STATUS_MESSAGES = {
  400: 'Some details are missing or invalid.',
  401: 'Your session has expired. Please log in again.',
  403: 'You are not allowed to do that.',
  404: 'The requested item was not found.',
  409: 'That already exists.',
  500: 'Something went wrong on the server. Please try again shortly.',
};

/**
 * Calls the Spring Boot backend and returns the parsed JSON body.
 * @param {string} path API path, e.g. "/api/auth/login".
 * @param {object} [options]
 * @param {string} [options.method='GET']
 * @param {object} [options.body] Sent as JSON.
 * @param {string} [options.token] Sent as "Authorization: Bearer <token>".
 * @returns {Promise<any>}
 * @throws {ApiError}
 */
export async function apiRequest(path, { method = 'GET', body, token } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new ApiError('The server took too long to respond. Please try again.');
    }
    throw new ApiError(`Can't reach the server at ${API_URL}. Check that the backend is running and your phone is on the same Wi-Fi.`);
  } finally {
    clearTimeout(timer);
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    // Backend errors look like { status, error, message, fieldErrors? }.
    const fieldErrors = data?.fieldErrors ?? {};
    const message = response.status === 400 && Object.keys(fieldErrors).length > 0
      ? Object.values(fieldErrors)[0]
      : data?.message || STATUS_MESSAGES[response.status] || `Request failed (HTTP ${response.status}).`;
    throw new ApiError(message, response.status, fieldErrors);
  }
  return data;
}

// ─── Endpoints ───────────────────────────────────────────────────────────────

/**
 * @typedef {object} AuthResponse
 * @property {string} token JWT to send as a Bearer token.
 * @property {number} expiresIn Token lifetime in milliseconds.
 * @property {number} userId
 * @property {string} name
 * @property {string} email
 */

/** @returns {Promise<AuthResponse>} */
export function login(email, password) {
  return apiRequest('/api/auth/login', { method: 'POST', body: { email, password } });
}

/** @returns {Promise<AuthResponse>} */
export function signUp(name, email, password) {
  return apiRequest('/api/auth/signup', { method: 'POST', body: { name, email, password } });
}

/**
 * @typedef {object} Trip
 * @property {number} id
 * @property {string} startLocation
 * @property {string} dropLocation
 * @property {number} distanceKm
 * @property {number} durationMinutes
 * @property {number} totalFareLkr
 * @property {string} createdAt ISO-8601 UTC timestamp.
 */

/** Saves a calculated trip for the logged-in user. @returns {Promise<Trip>} */
export function saveTrip(token, trip) {
  return apiRequest('/api/trips/calculate-and-save', { method: 'POST', body: trip, token });
}

/** Returns the logged-in user's trips, newest first. @returns {Promise<Trip[]>} */
export function getTripHistory(token) {
  return apiRequest('/api/trips/history', { token });
}
