import { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { api } from '../../services/api';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { colors, spacing, typography } from '../../utils/theme';
import { getErrorMessage } from '../../utils/errors';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError('Introduce tu email');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      setSent(true);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo enviar el email'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <Text style={styles.title}>¿Olvidaste tu contraseña?</Text>
            <Text style={styles.subtitle}>Te enviamos un enlace para restablecerla</Text>
          </View>

          {sent ? (
            <View style={styles.form}>
              <Text style={styles.info} accessibilityLiveRegion="polite">
                Si existe una cuenta con ese email, revisa tu bandeja de entrada — te hemos enviado un enlace para
                restablecer la contraseña.
              </Text>
              <Button label="Volver a iniciar sesión" onPress={() => router.replace('/(auth)/login')} />
            </View>
          ) : (
            <View style={styles.form}>
              <Input
                label="Email"
                placeholder="tu@email.com"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setError('');
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />

              {error ? (
                <Text style={styles.error} accessibilityLiveRegion="polite">
                  {error}
                </Text>
              ) : null}

              <Button
                label={loading ? 'Enviando…' : 'Enviar enlace'}
                loading={loading}
                onPress={handleSubmit}
                style={styles.submitButton}
              />
              <Button label="Volver" variant="ghost" onPress={() => router.back()} />
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
  subtitle: {
    ...typography.small,
    color: colors.accent.gold,
    marginTop: spacing.xs,
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
