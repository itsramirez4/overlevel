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

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      await authService.login(email, password);
      router.replace('/(tabs)/dashboard');
    } catch (err) {
      setError(getErrorMessage(err, 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brand}>
            <Logo variant="icon" size="lg" />
            <Text style={styles.title}>Overlevel</Text>
            <Text style={styles.subtitle}>Domina tu progresión</Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Email"
              placeholder="tu@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />

            <Input
              label="Contraseña"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
            />

            {error ? (
              <Text style={styles.error} accessibilityLiveRegion="polite">
                {error}
              </Text>
            ) : null}

            <Button
              label={loading ? 'Entrando…' : 'Iniciar sesión'}
              loading={loading}
              onPress={handleLogin}
              style={styles.submitButton}
            />
          </View>

          <Text style={styles.footnote}>
            ¿No tienes acceso? Pide que te den de alta en Supabase Auth.
          </Text>
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
  },
  submitButton: {
    marginTop: spacing.sm,
  },
  error: {
    ...typography.small,
    color: colors.semantic.error,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  footnote: {
    ...typography.tiny,
    color: colors.text.muted,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
