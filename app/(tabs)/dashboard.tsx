import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Redirect, useFocusEffect } from 'expo-router';

import { COLORS } from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/lib/profile';
import MarkPanel from '@/components/MarkPanel';

type Status = 'early' | 'on_time' | 'late';

type Attendee = {
  name: string;
  status: Status;
  scanned_at: string;
};

type DashEvent = {
  id: string;
  title: string;
  event_code: string;
  start_time: string | null;
  end_time: string | null;
  counts: { early: number; on_time: number; late: number; total: number };
  attendees: Attendee[];
};

const STATUS_LABEL: Record<Status, string> = {
  early: 'Early',
  on_time: 'On time',
  late: 'Late',
};

function formatDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleString() : '-';
}

export default function DashboardScreen() {
  const { isTeacher, loading } = useProfile();
  const [events, setEvents] = useState<DashEvent[]>([]);
  const [fetching, setFetching] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const { data, error } = await supabase.rpc('get_dashboard');
    if (error) {
      setError(error.message);
    } else {
      setEvents((data ?? []) as DashEvent[]);
    }
    setFetching(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (isTeacher) load();
    }, [isTeacher, load])
  );

  // ---- Role guard (after all hooks) ----
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!isTeacher) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dashboard</Text>
      <Text style={styles.subtitle}>Attendance for your events.</Text>

      {error && <Text style={styles.error}>{error}</Text>}

      {fetching ? (
        <ActivityIndicator size="large" color={COLORS.primary} />
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <Text style={styles.subtitle}>No events yet. Create one in the Teacher tab.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.eventTitle}>{item.title}</Text>
              <Text style={styles.meta}>
                Code {item.event_code} · {formatDate(item.start_time)}
              </Text>

              <View style={styles.countRow}>
                <CountChip label="On time" value={item.counts.on_time} />
                <CountChip label="Late" value={item.counts.late} />
                <CountChip label="Early" value={item.counts.early} />
                <CountChip label="Total" value={item.counts.total} />
              </View>

              {item.attendees.length === 0 ? (
                <Text style={styles.meta}>No one has scanned yet.</Text>
              ) : (
                item.attendees.map((a, i) => (
                  <View key={`${item.id}-${i}`} style={styles.attendeeRow}>
                    <Text style={styles.attendeeName} numberOfLines={1}>
                      {a.name}
                    </Text>
                    <Text style={styles.attendeeStatus}>
                      {STATUS_LABEL[a.status]} · {formatDate(a.scanned_at)}
                    </Text>
                  </View>
                ))
              )}
                            <MarkPanel eventId={item.id} onSaved={load} />
            </View>
          )}
          
        />
      )}
    </View>
  );
}

function CountChip({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipValue}>{value}</Text>
      <Text style={styles.chipLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  error: {
    color: COLORS.danger,
    marginBottom: 8,
  },
  list: {
    paddingBottom: 40,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 12,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  meta: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  countRow: {
    flexDirection: 'row',
    marginTop: 12,
    marginBottom: 10,
  },
  chip: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    marginRight: 6,
  },
  chipValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  chipLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  attendeeRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingVertical: 8,
  },
  attendeeName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  attendeeStatus: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});