import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { api } from '../../services/api';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Loader } from '../../components/ui/Loader';
import { colors, spacing, typography } from '../../utils/theme';
import { getErrorMessage } from '../../utils/errors';

// Supabase's recovery link carries the token in the URL fragment
// (overlevel://reset-password#access_token=...&type=recovery), not a query
// param — expo-router's own route params never see a fragment, so it's
// pulled directly off the raw deep-link URL instead.
function extractAccessToken(url: string): string | null {
  const hashIndex = url.indexOf('#');
  if (hashIndex === -1) return null;
  return new URLSearchParams(url.slice(hashIndex + 1)).get('access_token');
}

export default function ResetPasswordScreen() {
  const router = useRouter();
  // undefined = still reading the deep link, null = no/invalid token found.
  const [accessToken, setAccessToken] = useState<string | null | undefined>(undefined);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    Linking.getInitialURL().then((url) => setAccessToken(url ? extractAccessToken(url) : null));
    // Covers the app already being open in the background when the link is tapped.
    const subscription = Linking.addEventListener('url', ({ url }) => setAccessToken(extractAccessToken(url)));
    return () => subscription.remove();
  }, []);

  const handleSubmit = async () => {
    if (!accessToken) return;
    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { access_token: accessToken, new_password: newPassword });
      setDone(true);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo actualizar la contraseña'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <Text style={styles.title}>Nueva contraseña</Text>
          </View>

          {accessToken === undefined ? (
            <Loader />
          ) : done ? (
            <View style={styles.form}>
              <Text style={styles.info} accessibilityLiveRegion="polite">
                Contraseña actualizada. Ya puedes iniciar sesión con ella.
              </Text>
              <Button label="Iniciar sesión" onPress={() => router.replace('/(auth)/login')} />
            </View>
          ) : accessToken === null ? (
            <View style={styles.form}>
              <Text style={styles.error} accessibilityLiveRegion="polite">
                Este enlace no es válido o ha caducado. Pide uno nuevo.
              </Text>
              <Button label="Pedir otro enlace" onPress={() => router.replace('/(auth)/forgot-password')} />
            </View>
          ) : (
            <View style={styles.form}>
              <Input
                label="Nueva contraseña"
                value={newPassword}
                onChangeText={(text) => {
                  setNewPassword(text);
                  setError('');
                }}
                secureTextEntry
              />
              <Input
                label="Confirmar contraseña"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  setError('');
                }}
                secureTextEntry
              />

              {error ? (
                <Text style={styles.error} accessibilityLiveRegion="polite">
                  {error}
                </Text>
              ) : null}

              <Button
                label={loading ? 'Guardando…' : 'Guardar contraseña'}
                loading={loading}
                onPress={handleSubmit}
                style={styles.submitButton}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  flex: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  brand: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  title: {
    ...typography.h1,
    color: colors.text.primary,
    textAlign: 'center',
  },
  form: {
    width: '100%',
    gap: spacing.sm,
  },
  submitButton: {
    marginTop: spacing.sm,
  },
  info: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  error: {
    ...typography.small,
    color: colors.semantic.error,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
});
