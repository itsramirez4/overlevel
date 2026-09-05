import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button } from '../../components/ui/Button';
import { Logo } from '../../components/common/Logo';
import { colors, spacing, typography } from '../../utils/theme';

// Registration is closed for now (backend enforces this too, via
// ENABLE_SELF_REGISTRATION — this screen just avoids showing a working form
// for something the API will reject). Accounts are provisioned in the
// Supabase Auth dashboard in the meantime.
export default function RegisterScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.brand}>
          <Logo variant="icon" size="lg" />
          <Text style={styles.title}>Crear cuenta</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.message}>Más adelante</Text>
          <Text style={styles.submessage}>
            De momento no se pueden crear cuentas nuevas. Vuelve a intentarlo más adelante.
          </Text>
          <Button label="Volver a iniciar sesión" onPress={() => router.replace('/(auth)/login')} style={styles.button} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg.primary,
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
  content: {
    alignItems: 'center',
  },
  message: {
    ...typography.h2,
    color: colors.accent.gold,
    textAlign: 'center',
  },
  submessage: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  button: {
    alignSelf: 'stretch',
  },
});
