import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Redirect } from 'expo-router';

import { COLORS } from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import { useProfile, type Role } from '@/lib/profile';

type UserRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
};

const ROLES: Role[] = ['student', 'teacher', 'admin'];

export default function AdminScreen() {
  const { isAdmin, loading } = useProfile();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [fetching, setFetching] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setFetching(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .order('email');

    if (error) {
      setError(error.message);
    } else {
      setError(null);
      setUsers((data ?? []) as UserRow[]);
    }
    setFetching(false);
  }, []);

  useEffect(() => {
    if (isAdmin) loadUsers();
  }, [isAdmin, loadUsers]);

  const changeRole = async (target: UserRow, newRole: Role) => {
    if (newRole === target.role) return;

    setBusyId(target.id);
    const { error } = await supabase.rpc('set_user_role', {
      target_id: target.id,
      new_role: newRole,
    });
    setBusyId(null);

    if (error) {
      Alert.alert('Could not change role', error.message);
      return;
    }
    await loadUsers();
  };

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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Manage Users</Text>
      <Text style={styles.subtitle}>Tap a role to change it.</Text>

      {error && <Text style={styles.error}>{error}</Text>}

      {fetching ? (
        <ActivityIndicator size="large" color={COLORS.primary} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.name}>{item.full_name || item.email}</Text>
              <Text style={styles.email}>{item.email}</Text>

              <View style={styles.roleRow}>
                {ROLES.map((r) => {
                  const active = item.role === r;
                  return (
                    <Pressable
                      key={r}
                      disabled={busyId === item.id}
                      onPress={() => changeRole(item, r)}
                      style={[styles.roleChip, active && styles.roleChipActive]}
                    >
                      <Text style={[styles.roleText, active && styles.roleTextActive]}>
                        {r}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
        />
      )}
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
    marginBottom: 10,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  email: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  roleRow: {
    flexDirection: 'row',
  },
  roleChip: {
    backgroundColor: COLORS.surface,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginRight: 8,
  },
  roleChipActive: {
    backgroundColor: COLORS.primary,
  },
  roleText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
    textTransform: 'capitalize',
  },
  roleTextActive: {
    color: '#FFFFFF',
  },
});