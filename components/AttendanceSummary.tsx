import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { COLORS } from '@/constants/colors';
import { getMySummary, type Summary } from '@/lib/database';

const WARNING_BELOW = 75; // show a warning when the rate drops under this %

export default function AttendanceSummary() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      getMySummary()
        .then((s) => {
          setSummary(s);
          setError(null);
        })
        .catch((e) => setError(e.message));
    }, [])
  );

  if (error) {
    return <Text style={styles.error}>{error}</Text>;
  }

  if (!summary) {
    return <ActivityIndicator color={COLORS.primary} style={styles.loader} />;
  }

  const lowRate = summary.rate !== null && summary.rate < WARNING_BELOW;

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>Attendance</Text>

      <Text style={[styles.rate, lowRate && styles.rateLow]}>
        {summary.rate === null ? 'No events yet' : `${summary.rate}%`}
      </Text>

      {lowRate && (
        <Text style={styles.warning}>
          Your attendance is below {WARNING_BELOW}%.
        </Text>
      )}

      <View style={styles.row}>
        <Stat label="Attended" value={summary.attended} />
        <Stat label="Absent" value={summary.absent} />
        <Stat label="Excused" value={summary.excused} />
      </View>

      <Text style={styles.meta}>
        {summary.events_started} event{summary.events_started === 1 ? '' : 's'} started so far
      </Text>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    padding: 18,
    marginBottom: 24,
  },
  heading: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  rate: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.primary,
  },
  rateLow: {
    color: COLORS.danger,
  },
  warning: {
    fontSize: 13,
    color: COLORS.danger,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    marginTop: 14,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    paddingVertical: 8,
    marginRight: 6,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  meta: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 10,
  },
  loader: {
    marginBottom: 24,
  },
  error: {
    fontSize: 13,
    color: COLORS.danger,
    marginBottom: 24,
  },
});