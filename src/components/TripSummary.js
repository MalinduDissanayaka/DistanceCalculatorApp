import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { COLORS, RATE_PER_KM, SHADOW } from '../constants/config';
import { formatDuration, formatNumber } from '../utils/helpers';
import StatRow from './StatRow';

/**
 * Card showing the calculated fare, distance, drive time and rate,
 * with a "Confirm Ride" button.
 *
 * @param {object} props
 * @param {{ distanceKm: number, durationSec: number, fare: number }} props.route Calculated route.
 * @param {() => void} props.onConfirm Called when "Confirm Ride" is tapped.
 */
export default function TripSummary({ route, onConfirm }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Trip summary</Text>

      <View style={styles.fareBox}>
        <Text style={styles.fareLabel}>Total Fare</Text>
        <Text style={styles.fareValue}>LKR {formatNumber(route.fare)}</Text>
      </View>

      <StatRow label="Distance" value={`${formatNumber(route.distanceKm, 2)} km`} />
      <StatRow label="Est. drive time" value={formatDuration(route.durationSec)} />
      <StatRow label="Rate" value={`LKR ${RATE_PER_KM} / km`} />

      <TouchableOpacity style={styles.confirmButton} onPress={onConfirm} activeOpacity={0.85}>
        <Text style={styles.confirmButtonText}>Confirm Ride</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 5,
    borderLeftColor: COLORS.start,
    ...SHADOW,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  fareBox: {
    backgroundColor: COLORS.primarySoft,
    borderRadius: 14,
    padding: 14,
    marginVertical: 12,
    alignItems: 'center',
  },
  fareLabel: { fontSize: 13, color: COLORS.muted, fontWeight: '600' },
  fareValue: { fontSize: 30, fontWeight: '800', color: COLORS.primary, marginTop: 2 },
  confirmButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  confirmButtonText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
