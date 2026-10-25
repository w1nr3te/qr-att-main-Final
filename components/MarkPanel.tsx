import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/constants/colors';
import { supabase } from '@/lib/supabase';

type MarkStatus = 'on_time' | 'late' | 'excused';
type AttendanceValue = MarkStatus | 'early' | null;

type StudentRow = {
  id: string;
  name: string;
  status: AttendanceValue;
};

const OPTIONS: { value: MarkStatus; label: string }[] = [
  { value: 'on_time', label: 'On time' },
  { value: 'late', label: 'Late' },
  { value: 'excused', label: 'Excused' },
];

const STATUS_LABEL: Record<NonNullable<AttendanceValue>, string> = {
  on_time: 'On time',
  late: 'Late',
  early: 'Early',
  excused: 'Excused',
};

type Props = {
  eventId: string;
  onSaved: () => void;
};

export default function MarkPanel({ eventId, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadStudents = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_students_for_event', {
      p_event_id: eventId,
    });
    setLoading(false);

    if (error) {
      Alert.alert('Could not load students', error.message);
      return;
    }
    setStudents((data ?? []) as StudentRow[]);
  };

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) loadStudents();
  };

  const mark = async (student: StudentRow, status: MarkStatus) => {
    if (student.status === status) return;

    setBusyId(student.id);
    const { error } = await supabase.rpc('set_attendance_manual', {
      p_event_id: eventId,
      p_student_id: student.id,
      p_status: status,
    });
    setBusyId(null);

    if (error) {
      Alert.alert('Could not save', error.message);
      return;
    }

    await loadStudents();
    onSaved();
  };

  return (
    <View style={styles.wrapper}>
      <Pressable style={styles.toggle} onPress={toggle}>
        <Text style={styles.toggleText}>
          {open ? 'Hide students' : 'Mark attendance'}
        </Text>
      </Pressable>

      {open && (
        loading ? (
          <ActivityIndicator color={COLORS.primary} style={styles.loader} />
        ) : students.length === 0 ? (
          <Text style={styles.meta}>No students have signed up yet.</Text>
        ) : (
          students.map((s) => (
            <View key={s.id} style={styles.studentRow}>
              <View style={styles.studentHeader}>
                <Text style={styles.studentName} numberOfLines={1}>
                  {s.name}
                </Text>
                <Text style={styles.studentStatus}>
                  {s.status ? STATUS_LABEL[s.status] : 'Not marked'}
                </Text>
              </View>

              <View style={styles.optionRow}>
                {OPTIONS.map((opt) => {
                  const active = s.status === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      disabled={busyId === s.id}
                      onPress={() => mark(s, opt.value)}
                      style={[styles.option, active && styles.optionActive]}
                    >
                      <Text style={[styles.optionText, active && styles.optionTextActive]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 10,
  },
  toggle: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  loader: {
    marginVertical: 12,
  },
  meta: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 10,
  },
  studentRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingVertical: 10,
  },
  studentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  studentName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginRight: 8,
  },
  studentStatus: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  optionRow: {
    flexDirection: 'row',
  },
  option: {
    backgroundColor: COLORS.surface,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 6,
  },
  optionActive: {
    backgroundColor: COLORS.primary,
  },
  optionText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  optionTextActive: {
    color: '#FFFFFF',
  },
});