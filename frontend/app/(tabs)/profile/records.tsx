import { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, ChevronLeft, Trophy } from 'lucide-react-native';
import { api } from '../../../services/api';
import { colors, radius, shadow, spacing, typography } from '../../../utils/theme';
import { EmptyState } from '../../../components/common/EmptyState';
import { Input } from '../../../components/ui/Input';
import { Loader } from '../../../components/ui/Loader';
import { authStore } from '../../../stores/authStore';
import { formatWeight, kgToUnit } from '../../../utils/units';

interface PersonalRecord {
  exercise_id: string;
  exercise_name: string;
  weight: number;
  reps: number;
  estimated_1rm: number;
  date: string;
}

export default function PersonalRecordsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const unit = authStore((s) => s.user?.weight_unit) || 'kg';

  const { data: records, isLoading } = useQuery<PersonalRecord[]>({
    queryKey: ['analytics', 'records'],
    queryFn: () => api.get('/analytics/records').then((r) => r.data),
  });

  const filtered = (records || []).filter((r) => r.exercise_name.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
          <ChevronLeft size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Récords personales</Text>
      </View>

      <View style={styles.searchContainer}>
        <Input placeholder="Buscar ejercicio…" value={search} onChangeText={setSearch} />
      </View>

      {isLoading ? (
        <Loader />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.exercise_id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyState
              icon={Trophy}
              title={search ? 'Sin resultados' : 'Sin récords todavía'}
              message={search ? 'Prueba con otro nombre.' : 'Registra series para empezar a ver tus mejores marcas aquí.'}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => router.push(`/analytics/exercise/${item.exercise_id}`)}
            >
              <View style={styles.iconBadge}>
                <Trophy size={16} color={colors.accent.ember} strokeWidth={2} />
              </View>
              <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.exercise_name}
                </Text>
                <Text style={styles.meta}>
                  {formatWeight(item.weight, unit)} × {item.reps} reps · 1RM est.{' '}
                  {Math.round(kgToUnit(item.estimated_1rm, unit))}{unit}
                </Text>
                <Text style={styles.date}>
                  {new Date(item.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                </Text>
              </View>
              <ChevronRight size={18} color={colors.text.muted} />
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  backButton: {
    marginRight: spacing.sm,
  },
  title: {
    ...typography.h1,
    color: colors.text.primary,
    flexShrink: 1,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  info: {
    flex: 1,
  },
  name: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '700',
  },
  meta: {
    ...typography.tiny,
    color: colors.text.secondary,
    marginTop: 2,
  },
  date: {
    ...typography.tiny,
    color: colors.text.muted,
    textTransform: 'capitalize',
    marginTop: 2,
  },
});
