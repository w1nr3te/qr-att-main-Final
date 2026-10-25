import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<'checking' | 'ready' | 'invalid'>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const handleUrl = async (url: string | null) => {
      if (!url) return;

      // Supabase puts the tokens after a '#' (or '?') in the link.
      const hashIndex = url.indexOf('#');
      const queryIndex = url.indexOf('?');
      const raw =
        hashIndex >= 0
          ? url.slice(hashIndex + 1)
          : queryIndex >= 0
          ? url.slice(queryIndex + 1)
          : '';
      const params = new URLSearchParams(raw);
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');

      if (!access_token || !refresh_token) return;

      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      setStatus(error ? 'invalid' : 'ready');
    };

    Linking.getInitialURL().then(handleUrl);
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));

    return () => sub.remove();
  }, []);

  const handleSave = async () => {
    if (password.length < 6) {
      Alert.alert('Too short', 'Use at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Mismatch', 'The passwords do not match.');
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Password updated', 'You can now use your new password.', [
        { text: 'OK', onPress: () => router.replace('/(tabs)') },
      ]);
    }
  };

  if (status === 'checking') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (status === 'invalid') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Link not valid</Text>
        <Text style={styles.subtitle}>
          This reset link has expired or was already used. Request a new one.
        </Text>
        <View style={styles.button}>
          <AppButton
            theme="primary"
            title="Back to Sign In"
            icon="arrow-back-outline"
            onPress={() => router.replace('/login')}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Set New Password</Text>

      <Text style={styles.label}>New Password</Text>
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder="At least 6 characters"
        placeholderTextColor={COLORS.textSecondary}
        secureTextEntry
        editable={!saving}
      />

      <Text style={styles.label}>Confirm Password</Text>
      <TextInput
        style={styles.input}
        value={confirm}
        onChangeText={setConfirm}
        placeholder="Type it again"
        placeholderTextColor={COLORS.textSecondary}
        secureTextEntry
        editable={!saving}
      />

      <View style={styles.button}>
        <AppButton
          theme="primary"
          title={saving ? 'Saving...' : 'Save Password'}
          icon="checkmark-outline"
          onPress={handleSave}
          disabled={saving}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  button: {
    marginTop: 20,
  },
});