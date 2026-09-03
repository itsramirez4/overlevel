import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  Calculator,
  CalendarDays,
  ChevronRight,
  Dumbbell,
  LucideIcon,
  Ruler,
  Settings,
  Skull,
  Swords,
  Trophy,
} from 'lucide-react-native';
import { api } from '../../../services/api';
import { authStore } from '../../../stores/authStore';
import { authService } from '../../../services/auth';
import { colors, spacing, typography } from '../../../utils/theme';
import { Header } from '../../../components/common/Header';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { UserAvatar } from '../../../components/character/UserAvatar';
import { Character } from '../../../types';

const MENU_ITEMS: { icon: LucideIcon; label: string; href: string }[] = [
  { icon: Swords, label: 'Personaje', href: '/profile/character' },
  { icon: Skull, label: 'Bestiario', href: '/profile/bestiary' },
  { icon: Dumbbell, label: 'Ejercicios', href: '/profile/exercises' },
  { icon: CalendarDays, label: 'Historial de entrenamientos', href: '/workouts/history' },
  { icon: Trophy, label: 'Récords personales', href: '/profile/records' },
  { icon: Ruler, label: 'Medidas corporales', href: '/profile/measurements' },
  { icon: Calculator, label: 'Calculadora de discos', href: '/profile/plate-calculator' },
  { icon: Settings, label: 'Ajustes', href: '/profile/settings' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const user = authStore((state) => state.user);
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  const { data: character } = useQuery<Character | null>({
    queryKey: ['character'],
    queryFn: () => api.get('/characters/me').then((r) => r.data),
  });

  const handleLogout = async () => {
    setConfirmingLogout(false);
    await authService.logout();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        <Header title="Perfil" showLogo />

        <Card style={styles.profileCard}>
          <UserAvatar characterType={character?.character_type} size={AVATAR_SIZE} />
          <View style={styles.identity}>
            <Text style={styles.username}>{user?.username}</Text>
            <Text style={styles.email}>{user?.email}</Text>
          </View>
        </Card>

        {MENU_ITEMS.map((item) => (
          <MenuRow key={item.href} {...item} onPress={() => router.push(item.href)} />
        ))}

        <Button
          label="CERRAR SESIÓN"
          variant="outline"
          onPress={() => setConfirmingLogout(true)}
          style={styles.logoutButton}
        />
      </ScrollView>

      <ConfirmDialog
        visible={confirmingLogout}
        title="Cerrar sesión"
        message="¿Seguro que quieres cerrar sesión?"
        confirmLabel="Cerrar sesión"
        destructive
        onConfirm={handleLogout}
        onCancel={() => setConfirmingLogout(false)}
      />
    </SafeAreaView>
  );
}

const AVATAR_SIZE = 56;

const MenuRow = ({ icon: Icon, label, onPress }: { icon: LucideIcon; label: string; onPress: () => void }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
    <Card style={styles.row}>
      <Icon size={18} color={colors.text.secondary} strokeWidth={2} />
      <Text style={styles.rowLabel}>{label}</Text>
      <ChevronRight size={18} color={colors.text.muted} />
    </Card>
  </TouchableOpacity>
);

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
    gap: spacing.md,
    marginBottom: spacing.lg,
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
