import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Redirect, useFocusEffect } from 'expo-router';

import { COLORS } from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/lib/profile';

type ReportRow = {
  id: string;
  title: string;
  event_code: string;
  start_time: string | null;
  teacher: string | null;
  on_time: number;
  late: number;
  early: number;
  excused: number;
  total: number;
};

type LogRow = {
  id: number;
  actor_id: string | null;
  action: string;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

type Tab = 'events' | 'activity';

function formatDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleString() : '-';
}

export default function ReportsScreen() {
  const { isAdmin, loading } = useProfile();
  const [tab, setTab] = useState<Tab>('events');
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [fetching, setFetching] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);

    const [reportRes, logRes, profileRes] = await Promise.all([
      supabase.rpc('get_report'),
      supabase
        .from('activity_log')
        .select('id, actor_id, action, target_id, details, created_at')
        .order('created_at', { ascending: false })
        .limit(100),
      supabase.from('profiles').select('id, full_name, email'),
    ]);

    const firstError = reportRes.error || logRes.error || profileRes.error;
    if (firstError) {
      setError(firstError.message);
    }

    setReports((reportRes.data ?? []) as ReportRow[]);
    setLogs((logRes.data ?? []) as LogRow[]);

    const map: Record<string, string> = {};
    (profileRes.data ?? []).forEach((p: any) => {
      map[p.id] = p.full_name || p.email;
    });
    setNames(map);

    setFetching(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (isAdmin) load();
    }, [isAdmin, load])
  );

  // ---- Role guard (after all hooks) ----
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!isAdmin) {
    return <Redirect href="/(tabs)" />;
  }

  const nameOf = (id: string | null) => (id ? names[id] ?? 'Unknown user' : 'System');

  const describe = (row: LogRow) => {
    if (row.action === 'role_change') {
      const d = row.details as { from?: string; to?: string } | null;
      return `${nameOf(row.target_id)}: ${d?.from ?? '?'} → ${d?.to ?? '?'}`;
    }
    if (row.action === 'manual_attendance') {
      const d = row.details as { status?: string } | null;
      return `${nameOf(row.target_id)} marked ${d?.status ?? '?'}`;
    }
    return row.action;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reports</Text>

      <View style={styles.segment}>
        <Pressable
          style={[styles.segmentBtn, tab === 'events' && styles.segmentActive]}
          onPress={() => setTab('events')}
        >
          <Text style={[styles.segmentText, tab === 'events' && styles.segmentTextActive]}>
            Events
          </Text>
        </Pressable>
        <Pressable
          style={[styles.segmentBtn, tab === 'activity' && styles.segmentActive]}
          onPress={() => setTab('activity')}
        >
          <Text style={[styles.segmentText, tab === 'activity' && styles.segmentTextActive]}>
            Activity
          </Text>
        </Pressable>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      {fetching ? (
        <ActivityIndicator size="large" color={COLORS.primary} />
      ) : tab === 'events' ? (
        <FlatList
          data={reports}
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
          ListEmptyComponent={<Text style={styles.meta}>No events yet.</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.meta}>
                Code {item.event_code} · {formatDate(item.start_time)}
              </Text>
              <Text style={styles.meta}>Teacher: {item.teacher ?? 'Unknown'}</Text>

              <View style={styles.countRow}>
                <Count label="On time" value={item.on_time} />
                <Count label="Late" value={item.late} />
                <Count label="Early" value={item.early} />
                <Count label="Excused" value={item.excused} />
                <Count label="Total" value={item.total} />
              </View>
            </View>
          )}
        />
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => String(item.id)}
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
          ListEmptyComponent={<Text style={styles.meta}>No activity yet.</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{describe(item)}</Text>
              <Text style={styles.meta}>
                By {nameOf(item.actor_id)} · {formatDate(item.created_at)}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

function Count({ label, value }: { label: string; value: number }) {
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
    marginBottom: 12,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 4,
    marginBottom: 14,
  },
  segmentBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  segmentActive: {
    backgroundColor: COLORS.primary,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  segmentTextActive: {
    color: '#FFFFFF',
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
  cardTitle: {
    fontSize: 15,
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
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
  },
  chipLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});