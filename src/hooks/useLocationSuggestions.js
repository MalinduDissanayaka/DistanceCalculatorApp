import { useEffect, useState } from 'react';

import {
  PHOTON_URL,
  SEARCH_BBOX,
  SUGGESTION_DEBOUNCE_MS,
  SUGGESTION_LIMIT,
  SUGGESTION_MIN_CHARS,
} from '../constants/config';
import { fetchJson } from '../utils/helpers';

/**
 * @typedef {object} Suggestion
 * @property {string} id Unique key for list rendering.
 * @property {number} lat
 * @property {number} lon
 * @property {string} title Main line, e.g. "Kandy".
 * @property {string} subtitle Context line, e.g. "Central Province, Sri Lanka".
 * @property {string} name Full "title, subtitle" name.
 */

/**
 * Requests place suggestions from Photon for a partial query.
 * @param {string} query
 * @param {AbortSignal} signal Cancels the request when the query changes.
 * @returns {Promise<Suggestion[]>}
 */
async function fetchSuggestions(query, signal) {
  const params = [
    `q=${encodeURIComponent(query)}`,
    `limit=${SUGGESTION_LIMIT + 3}`, // Extra results to make up for duplicates removed below.
    'lang=en',
    SEARCH_BBOX ? `bbox=${SEARCH_BBOX}` : '',
  ].filter(Boolean).join('&');

  const data = await fetchJson(`${PHOTON_URL}?${params}`, {
    signal,
    headers: { Accept: 'application/json', 'User-Agent': 'DistanceCalculatorApp/1.0' },
  });

  const seen = new Set();
  const suggestions = [];
  for (const feature of data?.features ?? []) {
    const p = feature.properties ?? {};
    const [lon, lat] = feature.geometry?.coordinates ?? [];
    const street = [p.housenumber, p.street].filter(Boolean).join(' ');
    const title = p.name || street;
    if (!title || lat == null || lon == null) continue;

    // Build the context line without repeating the title (e.g. "Kandy, Kandy, ...").
    const context = [];
    for (const part of [p.name && street, p.city, p.county, p.state, p.country]) {
      if (part && part !== title && !context.includes(part)) context.push(part);
    }
    const subtitle = context.join(', ');
    const name = subtitle ? `${title}, ${subtitle}` : title;

    if (seen.has(name)) continue;
    seen.add(name);
    suggestions.push({ id: `${p.osm_type}${p.osm_id}-${suggestions.length}`, lat, lon, title, subtitle, name });
    if (suggestions.length === SUGGESTION_LIMIT) break;
  }
  return suggestions;
}

/**
 * Debounced search-as-you-type place suggestions.
 *
 * Waits SUGGESTION_DEBOUNCE_MS after the last change, cancels outdated
 * requests, and only searches once SUGGESTION_MIN_CHARS characters are typed.
 *
 * @param {string} query Text typed by the user.
 * @param {boolean} enabled Set to false to stop searching (e.g. field not focused).
 * @returns {{ suggestions: Suggestion[], loading: boolean, error: boolean, empty: boolean }}
 */
export default function useLocationSuggestions(query, enabled) {
  const trimmed = query.trim();
  const active = enabled && trimmed.length >= SUGGESTION_MIN_CHARS;
  const [result, setResult] = useState({ query: '', items: [], error: false });

  useEffect(() => {
    if (!active) return undefined;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const items = await fetchSuggestions(trimmed, controller.signal);
        setResult({ query: trimmed, items, error: false });
      } catch {
        if (!controller.signal.aborted) setResult({ query: trimmed, items: [], error: true });
      }
    }, SUGGESTION_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [active, trimmed]);

  // Only show results that belong to the text currently in the box.
  const ready = active && result.query === trimmed;
  return {
    suggestions: ready ? result.items : [],
    loading: active && !ready,
    error: ready && result.error,
    empty: ready && !result.error && result.items.length === 0,
  };
}
