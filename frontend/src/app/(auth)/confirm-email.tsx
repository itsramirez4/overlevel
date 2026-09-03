import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { authService } from '../../services/auth';
import { Button } from '../../components/ui/Button';
import { Loader } from '../../components/ui/Loader';
import { colors, spacing, typography } from '../../utils/theme';
import { getErrorMessage } from '../../utils/errors';

// Same fragment shape as the password-recovery link
// (overlevel://confirm-email#access_token=...&type=signup) — expo-router's
// route params never see a fragment, so it's pulled off the raw deep-link
// URL directly, same as reset-password.tsx.
function extractAccessToken(url: string): string | null {
  const hashIndex = url.indexOf('#');
  if (hashIndex === -1) return null;
  return new URLSearchParams(url.slice(hashIndex + 1)).get('access_token');
}

export default function ConfirmEmailScreen() {
  const router = useRouter();
  // undefined = still reading the deep link / confirming, null = no/invalid
  // token found, 'error' = a token was found but confirming it failed.
  const [status, setStatus] = useState<'pending' | 'confirming' | 'done' | 'no-token' | 'error'>('pending');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const confirm = async (url: string | null) => {
      const token = url ? extractAccessToken(url) : null;
      if (!token) {
        setStatus('no-token');
        return;
      }
      setStatus('confirming');
      try {
        await authService.confirmEmail(token);
        setStatus('done');
        router.replace('/(tabs)/dashboard');
      } catch (err) {
        setErrorMessage(getErrorMessage(err, 'No se pudo confirmar la cuenta'));
        setStatus('error');
      }
    };

    Linking.getInitialURL().then(confirm);
    // Covers the app already being open in the background when the link is tapped.
    const subscription = Linking.addEventListener('url', ({ url }) => confirm(url));
    return () => subscription.remove();
  }, [router]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {status === 'pending' || status === 'confirming' ? (
          <Loader label="Confirmando tu cuenta…" />
        ) : status === 'no-token' ? (
          <View style={styles.form}>
            <Text style={styles.error} accessibilityLiveRegion="polite">
              Este enlace no es válido o ha caducado.
            </Text>
            <Button label="Ir a iniciar sesión" onPress={() => router.replace('/(auth)/login')} />
          </View>
        ) : status === 'error' ? (
          <View style={styles.form}>
            <Text style={styles.error} accessibilityLiveRegion="polite">
              {errorMessage}
            </Text>
            <Button label="Ir a iniciar sesión" onPress={() => router.replace('/(auth)/login')} />
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  form: {
    width: '100%',
    gap: spacing.sm,
  },
  error: {
    ...typography.small,
    color: colors.semantic.error,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
});
