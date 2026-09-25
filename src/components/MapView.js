import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { COLORS, MAP_HTML, SHADOW } from '../constants/config';
import { shortName } from '../utils/helpers';

/**
 * OpenStreetMap (Leaflet) map rendered in a WebView.
 *
 * The HTML page loads once; whenever `start`, `drop` or `routePath` change,
 * the new data is pushed into the page with `injectJavaScript`, so the map
 * never reloads. Shows a loading overlay and a Retry button on failure.
 *
 * @param {object} props
 * @param {{ lat: number, lon: number, name: string } | null} props.start Start location.
 * @param {{ lat: number, lon: number, name: string } | null} props.drop Drop location.
 * @param {Array<[number, number]> | null} props.routePath Route as [lat, lon] points.
 * @param {(locked: boolean) => void} [props.onScrollLockChange]
 *   Called with `true` while the user is touching the map, so the parent
 *   ScrollView can stop scrolling and let the map pan/zoom.
 */
export default function MapView({ start, drop, routePath, onScrollLockChange }) {
  const webViewRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);

  // Push the latest markers and route into the Leaflet page.
  useEffect(() => {
    if (!mapReady || !webViewRef.current) return;
    const payload = {
      start: start && { lat: start.lat, lon: start.lon, label: shortName(start.name) },
      drop: drop && { lat: drop.lat, lon: drop.lon, label: shortName(drop.name) },
      route: routePath ?? null,
    };
    webViewRef.current.injectJavaScript(`window.updateMap && window.updateMap(${JSON.stringify(payload)}); true;`);
  }, [mapReady, start, drop, routePath]);

  // Messages posted by the Leaflet page: { type: 'ready' | 'error' }.
  const handleMessage = (event) => {
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

  const reload = () => {
    setMapReady(false);
    setMapError(false);
    webViewRef.current?.reload();
  };

  return (
    <View
      style={styles.mapCard}
      // Let the map handle pan/zoom gestures instead of the page scrolling.
      onTouchStart={() => onScrollLockChange?.(true)}
      onTouchEnd={() => onScrollLockChange?.(false)}
      onTouchCancel={() => onScrollLockChange?.(false)}
    >
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: MAP_HTML }}
        onMessage={handleMessage}
        onError={() => setMapError(true)}
        javaScriptEnabled
        domStorageEnabled
        nestedScrollEnabled
        style={styles.webView}
      />
      {!mapReady && !mapError ? (
        <View style={styles.overlay} pointerEvents="none">
          <ActivityIndicator color={COLORS.primary} />
          <Text style={styles.overlayText}>Loading map…</Text>
        </View>
      ) : null}
      {mapError ? (
        <View style={styles.overlay}>
          <Text style={styles.overlayText}>{"Couldn't load the map."}</Text>
          <TouchableOpacity onPress={reload} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  mapCard: {
    height: 340,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
    ...SHADOW,
  },
  webView: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(243,245,249,0.9)',
  },
  overlayText: { marginTop: 8, color: COLORS.muted },
  retryButton: { marginTop: 10, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 10, backgroundColor: COLORS.primary },
  retryText: { color: '#fff', fontWeight: '700' },
});
