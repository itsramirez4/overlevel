import { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { authService } from '../../services/auth';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Logo } from '../../components/common/Logo';
import { colors, spacing, typography } from '../../utils/theme';
import { getErrorMessage } from '../../utils/errors';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const router = useRouter();

  const handleRegister = async () => {
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const { requiresEmailConfirmation } = await authService.register(email, password);
      if (requiresEmailConfirmation) {
        setSentTo(email);
      } else {
        router.replace('/(tabs)/dashboard');
      }
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo crear la cuenta'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <Logo variant="icon" size="lg" />
            <Text style={styles.title}>Crear cuenta</Text>
            <Text style={styles.subtitle}>Empieza a registrar tu progreso</Text>
          </View>

          {sentTo ? (
            <View style={styles.form}>
              <Text style={styles.info} accessibilityLiveRegion="polite">
                Te hemos enviado un enlace de confirmación a {sentTo}. Ábrelo desde este dispositivo para activar tu
                cuenta.
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

              <Input
                label="Contraseña"
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setError('');
                }}
                secureTextEntry
                autoComplete="password-new"
              />

              <Input
                label="Confirmar contraseña"
                placeholder="••••••••"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  setError('');
                }}
                secureTextEntry
                autoComplete="password-new"
              />

              {error ? (
                <Text style={styles.error} accessibilityLiveRegion="polite">
                  {error}
                </Text>
              ) : null}

              <Button
                label={loading ? 'Creando cuenta…' : 'CREAR CUENTA'}
                loading={loading}
                onPress={handleRegister}
                style={styles.submitButton}
              />

              <Button label="Ya tengo cuenta" variant="ghost" onPress={() => router.replace('/(auth)/login')} />
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
    marginTop: spacing.md,
  },
  subtitle: {
    ...typography.small,
    color: colors.accent.gold,
    marginTop: spacing.xs,
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
