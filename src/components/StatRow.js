import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { COLORS } from '../constants/config';

/**
 * A single "label ........ value" row used in the trip summary.
 *
 * @param {object} props
 * @param {string} props.label Left-hand label, e.g. "Distance".
 * @param {string} props.value Right-hand value, e.g. "115.20 km".
 */
export default function StatRow({ label, value }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  statLabel: { fontSize: 14, color: COLORS.muted },
  statValue: { fontSize: 14, fontWeight: '700', color: COLORS.text },
});
