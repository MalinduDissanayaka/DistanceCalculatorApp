import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS, SHADOW } from '../constants/config';
import { useAuth } from '../context/AuthContext';
import { getTripHistory } from '../utils/api';
import { formatDateTime, formatDuration, formatNumber, shortName } from '../utils/helpers';

/** One saved trip: route, date, distance, time and fare. */
function TripCard({ trip }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.date}>{formatDateTime(trip.createdAt)}</Text>
        <Text style={styles.fare}>LKR {formatNumber(trip.totalFareLkr)}</Text>
      </View>

      <View style={styles.place}>
        <View style={[styles.dot, { backgroundColor: COLORS.start }]} />
        <Text style={styles.placeText} numberOfLines={1}>{shortName(trip.startLocation)}</Text>
      </View>
      <View style={styles.place}>
        <View style={[styles.dot, { backgroundColor: COLORS.drop }]} />
        <Text style={styles.placeText} numberOfLines={1}>{shortName(trip.dropLocation)}</Text>
      </View>

      <Text style={styles.meta}>
        {formatNumber(trip.distanceKm, 2)} km · {formatDuration(trip.durationMinutes * 60)}
      </Text>
    </View>
  );
}

/**
 * The logged-in user's saved trips, newest first. Reloads every time the tab
 * is opened so a just-confirmed ride shows up; pull down to refresh.
 */
export default function TripHistoryScreen() {
  const { withToken } = useAuth();
  const [trips, setTrips] = useState(/** @type {import('../utils/api').Trip[] | null} */ (null));
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setTrips(await withToken(getTripHistory));
      setError('');
    } catch (e) {
      if (e.status !== 401) setError(e.message); // 401 already logged the user out.
    }
  }, [withToken]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const totalFare = trips?.reduce((sum, t) => sum + Number(t.totalFareLkr), 0) ?? 0;

  let body;
  if (trips === null && !error) {
    body = <ActivityIndicator style={styles.center} color={COLORS.primary} size="large" />;
  } else if (trips === null) {
    body = (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>Couldn&apos;t load your trips</Text>
        <Text style={styles.emptyText}>{error}</Text>
        <TouchableOpacity style={styles.button} onPress={refresh} activeOpacity={0.85}>
          <Text style={styles.buttonText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  } else {
    body = (
      <FlatList
        data={trips}
        keyExtractor={(trip) => String(trip.id)}
        renderItem={({ item }) => <TripCard trip={item} />}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[COLORS.primary]} />}
        ListHeaderComponent={
          <>
            {error ? <Text style={styles.inlineError}>{error}</Text> : null}
            {trips.length > 0 ? (
              <Text style={styles.summary}>
                {trips.length} {trips.length === 1 ? 'trip' : 'trips'} · LKR {formatNumber(totalFare)} total
              </Text>
            ) : null}
          </>
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyTitle}>No trips yet</Text>
            <Text style={styles.emptyText}>Calculate a fare and tap “Confirm Ride” to save it here.</Text>
            <TouchableOpacity style={styles.button} onPress={() => router.navigate('/')} activeOpacity={0.85}>
              <Text style={styles.buttonText}>Plan a trip</Text>
            </TouchableOpacity>
          </View>
        }
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.title}>Trip history</Text>
        <Text style={styles.subtitle}>Your confirmed rides, newest first</Text>
      </View>
      {body}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.text },
  subtitle: { fontSize: 14, color: COLORS.muted, marginTop: 4 },

  list: { padding: 16, paddingTop: 8, flexGrow: 1 },
  summary: { fontSize: 13, fontWeight: '600', color: COLORS.muted, marginBottom: 10 },
  inlineError: { color: COLORS.danger, fontSize: 13, marginBottom: 10 },

  card: { backgroundColor: COLORS.card, borderRadius: 16, padding: 14, marginBottom: 12, ...SHADOW },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  date: { fontSize: 12, color: COLORS.muted, fontWeight: '600' },
  fare: { fontSize: 17, fontWeight: '800', color: COLORS.primary },
  place: { flexDirection: 'row', alignItems: 'center', marginVertical: 3 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  placeText: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.text },
  meta: { fontSize: 13, color: COLORS.muted, marginTop: 8 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  emptyText: { fontSize: 14, color: COLORS.muted, textAlign: 'center', marginTop: 6 },
  button: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 22, marginTop: 16 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
