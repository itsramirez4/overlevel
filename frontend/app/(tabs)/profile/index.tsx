import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  Calculator,
  CalendarDays,
  ChevronRight,
  Dumbbell,
  LogOut,
  Search,
  Settings,
  Skull,
  Swords,
  Trophy,
} from 'lucide-react-native';
import { authStore } from '../../../stores/authStore';
import { authService } from '../../../services/auth';
import { api } from '../../../services/api';
import { colors, radius, spacing, typography } from '../../../utils/theme';
import { Header } from '../../../components/common/Header';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { PublicProfile } from '../../../types';

export default function ProfileScreen() {
  const router = useRouter();
  const user = authStore((state) => state.user);

  const { data: profile } = useQuery<PublicProfile>({
    queryKey: ['users', user?.id],
    queryFn: () => api.get(`/users/${user!.id}`).then((r) => r.data),
    enabled: !!user?.id,
  });

  const handleLogout = async () => {
    await authService.logout();
    router.replace('/(auth)/login');
  };

  const initial = (user?.username || user?.email || '?').charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.content}>
        <Header title="Perfil" />

        <Card style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.identity}>
            <Text style={styles.username}>{user?.username}</Text>
            <Text style={styles.email}>{user?.email}</Text>
          </View>
        </Card>

        {profile && (
          <View style={styles.statsRow}>
            <TouchableOpacity
              style={styles.statItem}
              onPress={() => router.push(`/profile/connections?id=${user!.id}&type=followers`)}
              activeOpacity={0.7}
            >
              <Text style={styles.statValue}>{profile.followers_count}</Text>
              <Text style={styles.statLabel}>Seguidores</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.statItem}
              onPress={() => router.push(`/profile/connections?id=${user!.id}&type=following`)}
              activeOpacity={0.7}
            >
              <Text style={styles.statValue}>{profile.following_count}</Text>
              <Text style={styles.statLabel}>Seguidos</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={styles.row}
          onPress={() => router.push('/profile/search-users')}
          activeOpacity={0.7}
        >
          <Search size={18} color={colors.text.secondary} strokeWidth={2} />
          <Text style={styles.rowLabel}>Buscar usuarios</Text>
          <ChevronRight size={18} color={colors.text.muted} />
        </TouchableOpacity>

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
      </View>
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
    padding: spacing.lg,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginBottom: spacing.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    ...typography.h3,
    color: colors.text.primary,
  },
  statLabel: {
    ...typography.tiny,
    color: colors.text.secondary,
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
    marginTop: 'auto',
  },
});
