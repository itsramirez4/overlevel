import { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Dumbbell, Flame, Link2, ListChecks, Trash2, Trophy } from 'lucide-react-native';
import { api } from '../../../services/api';
import { colors, radius, shadow, spacing, typography } from '../../../utils/theme';
import { StatCard } from '../../../components/analytics/StatCard';
import { EmptyState } from '../../../components/common/EmptyState';
import { Loader } from '../../../components/ui/Loader';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';

const feltLikeLabel: Record<string, string> = {
  terrible: 'Terrible',
  bad: 'Mal',
  ok: 'Normal',
  good: 'Bien',
  amazing: 'Genial',
};

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: workout, isLoading } = useQuery({
    queryKey: ['workouts', id],
    queryFn: () => api.get(`/workouts/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const confirmDelete = async () => {
    setDeleteOpen(false);
    await api.delete(`/workouts/${id}`);
    await queryClient.invalidateQueries({ queryKey: ['workouts'] });
    router.back();
  };

  if (isLoading || !workout) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Loader />
      </SafeAreaView>
    );
  }

  const sets = workout.sets || [];
  const totalVolume = sets
    .filter((s: any) => !s.is_warmup)
    .reduce((sum: number, s: any) => sum + s.weight * s.reps, 0);

  const exerciseGroups = Object.values(
    sets.reduce((groups: Record<string, { name: string; sets: any[] }>, set: any) => {
      const key = set.exercise_id;
      if (!groups[key]) groups[key] = { name: set.exercises?.name || 'Ejercicio', sets: [] };
      groups[key].sets.push(set);
      return groups;
    }, {})
  ) as { name: string; sets: any[] }[];

  exerciseGroups.forEach((g) => g.sets.sort((a, b) => a.set_number - b.set_number));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
          <ChevronLeft size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {new Date(workout.started_at).toLocaleDateString('es-ES', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </Text>
        <TouchableOpacity
          onPress={() => setDeleteOpen(true)}
          hitSlop={10}
          style={styles.deleteButton}
          accessibilityLabel="Borrar entrenamiento"
        >
          <Trash2 size={18} color={colors.semantic.error} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={exerciseGroups}
        keyExtractor={(item) => item.name}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.statsRow}>
            <StatCard label="Series" value={sets.length} icon={ListChecks} />
            <StatCard label="Volumen" value={`${Math.round(totalVolume)}kg`} icon={Flame} />
          </View>
        }
        ListFooterComponent={
          workout.felt_like ? (
            <Text style={styles.feltLike}>
              Sensación: <Text style={styles.feltLikeValue}>{feltLikeLabel[workout.felt_like]}</Text>
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState icon={Dumbbell} title="Sin series registradas" message="Este entrenamiento no tiene series." />
        }
        renderItem={({ item }) => (
          <View style={styles.exerciseCard}>
            <Text style={styles.exerciseName}>{item.name}</Text>
            {item.sets.map((set: any) => (
              <View
                key={set.id}
                style={[styles.setRow, set.is_pr && styles.setRowPr, set.is_warmup && styles.setRowWarmup]}
              >
                <Text style={styles.setNumber}>{set.set_number}</Text>
                <Text style={styles.setValue}>
                  {set.weight}kg × {set.reps} reps
                </Text>
                {set.is_warmup ? <Text style={styles.warmupTag}>Calentamiento</Text> : null}
                {set.superset_group ? <Link2 size={12} color={colors.accent.ember} strokeWidth={2.2} /> : null}
                {set.is_pr && <Trophy size={14} color={colors.accent.ember} strokeWidth={2.2} />}
                {set.rpe ? <Text style={styles.setRpe}>RPE {set.rpe}</Text> : null}
              </View>
            ))}
          </View>
        )}
      />

      <ConfirmDialog
        visible={deleteOpen}
        title="Borrar entrenamiento"
        message="¿Seguro que quieres borrar este entrenamiento y todas sus series? Esta acción no se puede deshacer."
        confirmLabel="Borrar"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setDeleteOpen(false)}
      />
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
    ...typography.h2,
    color: colors.text.primary,
    textTransform: 'capitalize',
    flex: 1,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  exerciseCard: {
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  exerciseName: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xs,
  },
  setRowPr: {
    borderWidth: 1,
    borderColor: colors.accent.ember,
  },
  setRowWarmup: {
    opacity: 0.65,
  },
  warmupTag: {
    ...typography.tiny,
    color: colors.text.muted,
    fontStyle: 'italic',
  },
  setNumber: {
    ...typography.tiny,
    color: colors.accent.fire,
    fontWeight: '800',
    width: 16,
  },
  setValue: {
    ...typography.small,
    color: colors.text.primary,
    fontWeight: '600',
    flex: 1,
  },
  setRpe: {
    ...typography.tiny,
    color: colors.text.secondary,
  },
  feltLike: {
    ...typography.small,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  feltLikeValue: {
    color: colors.text.primary,
    fontWeight: '700',
  },
});
