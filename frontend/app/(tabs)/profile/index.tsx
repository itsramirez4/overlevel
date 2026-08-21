import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Calculator,
  CalendarDays,
  ChevronRight,
  Dumbbell,
  LogOut,
  Settings,
  Skull,
  Swords,
  Trophy,
} from 'lucide-react-native';
import { authStore } from '../../../stores/authStore';
import { authService } from '../../../services/auth';
import { colors, radius, spacing, typography } from '../../../utils/theme';
import { Header } from '../../../components/common/Header';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';

export default function ProfileScreen() {
  const router = useRouter();
  const user = authStore((state) => state.user);

  const handleLogout = async () => {
    await authService.logout();
    router.replace('/(auth)/login');
  };

  const initial = (user?.username || user?.email || '?').charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        <Header title="Perfil" />

        <Card style={styles.profileCard}>
          <View style={styles.avatar}>
            {user?.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{initial}</Text>
            )}
          </View>
          <View style={styles.identity}>
            <Text style={styles.username}>{user?.username}</Text>
            <Text style={styles.email}>{user?.email}</Text>
          </View>
        </Card>

        <TouchableOpacity
          style={styles.row}
          onPress={() => router.push('/profile/character')}
          activeOpacity={0.7}
        >
          <Swords size={18} color={colors.text.secondary} strokeWidth={2} />
          <Text style={styles.rowLabel}>Personaje</Text>
          <ChevronRight size={18} color={colors.text.muted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.row}
          onPress={() => router.push('/profile/bestiary')}
          activeOpacity={0.7}
        >
          <Skull size={18} color={colors.text.secondary} strokeWidth={2} />
          <Text style={styles.rowLabel}>Bestiario</Text>
          <ChevronRight size={18} color={colors.text.muted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.row}
          onPress={() => router.push('/profile/exercises')}
          activeOpacity={0.7}
        >
          <Dumbbell size={18} color={colors.text.secondary} strokeWidth={2} />
          <Text style={styles.rowLabel}>Ejercicios</Text>
          <ChevronRight size={18} color={colors.text.muted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.row}
          onPress={() => router.push('/workouts/history')}
          activeOpacity={0.7}
        >
          <CalendarDays size={18} color={colors.text.secondary} strokeWidth={2} />
          <Text style={styles.rowLabel}>Historial de entrenamientos</Text>
          <ChevronRight size={18} color={colors.text.muted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.row}
          onPress={() => router.push('/profile/records')}
          activeOpacity={0.7}
        >
          <Trophy size={18} color={colors.text.secondary} strokeWidth={2} />
          <Text style={styles.rowLabel}>Récords personales</Text>
          <ChevronRight size={18} color={colors.text.muted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.row}
          onPress={() => router.push('/profile/plate-calculator')}
          activeOpacity={0.7}
        >
          <Calculator size={18} color={colors.text.secondary} strokeWidth={2} />
          <Text style={styles.rowLabel}>Calculadora de discos</Text>
          <ChevronRight size={18} color={colors.text.muted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.row}
          onPress={() => router.push('/profile/settings')}
          activeOpacity={0.7}
        >
          <Settings size={18} color={colors.text.secondary} strokeWidth={2} />
          <Text style={styles.rowLabel}>Ajustes</Text>
          <ChevronRight size={18} color={colors.text.muted} />
        </TouchableOpacity>

        <Button
          label="CERRAR SESIÓN"
          variant="outline"
          onPress={handleLogout}
          style={styles.logoutButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const AVATAR_SIZE = 56;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: radius.pill,
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.accent.fire,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    ...typography.h2,
    color: colors.accent.fire,
  },
  identity: {
    flex: 1,
  },
  username: {
    ...typography.h3,
    color: colors.text.primary,
  },
  email: {
    ...typography.small,
    color: colors.text.secondary,
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.xl,
  },
  rowLabel: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
    flex: 1,
  },
  logoutButton: {
    marginTop: spacing.md,
  },
});
