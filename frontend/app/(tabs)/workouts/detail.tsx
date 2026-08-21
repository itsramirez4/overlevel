import { useState } from 'react';
import { Alert, View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Clock, Dumbbell, Flame, Link2, ListChecks, Pencil, Trash2, Trophy } from 'lucide-react-native';
import { api } from '../../../services/api';
import { colors, radius, shadow, spacing, typography } from '../../../utils/theme';
import { StatCard } from '../../../components/analytics/StatCard';
import { EmptyState } from '../../../components/common/EmptyState';
import { Loader } from '../../../components/ui/Loader';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { EditWorkoutDialog } from '../../../components/workout/EditWorkoutDialog';
import { getWorkoutName } from '../../../utils/workoutName';
import { feltLikeLabel } from '../../../utils/feltLike';
import { formatWeight, kgToUnit, formatDistance } from '../../../utils/units';
import { formatDuration, formatSetDuration } from '../../../utils/duration';
import { authStore } from '../../../stores/authStore';

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const unit = authStore((s) => s.user?.weight_unit) || 'kg';
  const globalDistanceUnit = authStore((s) => s.user?.distance_unit) || 'km';

  const { data: workout, isLoading } = useQuery({
    queryKey: ['workouts', id],
    queryFn: () => api.get(`/workouts/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const confirmDelete = async () => {
    try {
      await api.delete(`/workouts/${id}`);
      setDeleteOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['workouts'] });
      router.back();
    } catch {
      setDeleteOpen(false);
      Alert.alert('Error', 'No se pudo borrar el entrenamiento. Inténtalo de nuevo.');
    }
  };

  const handleSaveEdit = async (title?: string, notes?: string, feltLike?: string) => {
    if (savingEdit) return;
    setSavingEdit(true);
    try {
      await api.put(`/workouts/${id}`, { title, notes, felt_like: feltLike });
      setEditOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['workouts', id] });
      await queryClient.invalidateQueries({ queryKey: ['workouts'] });
    } catch {
      Alert.alert('Error', 'No se pudieron guardar los cambios. Inténtalo de nuevo.');
    } finally {
      setSavingEdit(false);
    }
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
    sets.reduce((groups: Record<string, { exerciseId: string; name: string; isCardio: boolean; sets: any[] }>, set: any) => {
      const key = set.exercise_id;
      if (!groups[key]) {
        groups[key] = {
          exerciseId: key,
          name: set.exercises?.name || 'Ejercicio',
          isCardio: set.exercises?.category === 'cardio',
          sets: [],
        };
      }
      groups[key].sets.push(set);
      return groups;
    }, {})
  ) as { exerciseId: string; name: string; isCardio: boolean; sets: any[] }[];

  exerciseGroups.forEach((g) => g.sets.sort((a, b) => a.set_number - b.set_number));

  const name = getWorkoutName(workout);
  const hasExplicitName = !!(workout.title || workout.routines?.name);
  const formattedDate = new Date(workout.started_at).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.backButton}
          accessibilityLabel="Volver"
          accessibilityRole="button"
        >
          <ChevronLeft size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
            {name}
          </Text>
          {hasExplicitName && (
            <Text style={styles.dateSubtitle} numberOfLines={1}>
              {formattedDate}
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() => setEditOpen(true)}
          hitSlop={10}
          style={styles.deleteButton}
          accessibilityLabel="Editar entrenamiento"
        >
          <Pencil size={18} color={colors.text.secondary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setDeleteOpen(true)}
          hitSlop={10}
          style={styles.deleteButton}
          accessibilityLabel="Borrar entrenamiento"
        >
          <Trash2 size={18} color={colors.semantic.error} />
        </TouchableOpacity>
      </View>

      {workout.notes ? <Text style={styles.description}>{workout.notes}</Text> : null}

      <FlatList
        data={exerciseGroups}
        keyExtractor={(item) => item.exerciseId}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.statsRow}>
            <StatCard label="Series" value={sets.length} icon={ListChecks} />
            <StatCard label="Volumen" value={`${Math.round(kgToUnit(totalVolume, unit))}${unit}`} icon={Flame} />
            {workout.duration_minutes ? (
              <StatCard label="Duración" value={formatDuration(workout.duration_minutes)} icon={Clock} />
            ) : null}
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
                  {item.isCardio
                    ? `${formatSetDuration(set.duration_seconds || 0)} · ${formatDistance(set.distance_km || 0, set.exercises?.distance_unit || globalDistanceUnit)}`
                    : `${formatWeight(set.weight || 0, set.exercises?.weight_unit || unit)} × ${set.reps} reps`}
                </Text>
                {set.is_warmup ? <Text style={styles.warmupTag}>Calentamiento</Text> : null}
                {set.superset_group ? (
                  <Link2
                    size={12}
                    color={colors.accent.ember}
                    strokeWidth={2.2}
                    accessibilityLabel="Serie en superserie"
                  />
                ) : null}
                {set.is_pr && (
                  <Trophy size={14} color={colors.accent.ember} strokeWidth={2.2} accessibilityLabel="Récord personal" />
                )}
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

      <EditWorkoutDialog
        visible={editOpen}
        loading={savingEdit}
        initialTitle={workout.title}
        initialNotes={workout.notes}
        initialFeltLike={workout.felt_like}
        onSave={handleSaveEdit}
        onCancel={() => !savingEdit && setEditOpen(false)}
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
  headerTextContainer: {
    flex: 1,
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
    textTransform: 'capitalize',
  },
  dateSubtitle: {
    ...typography.tiny,
    color: colors.text.secondary,
    textTransform: 'capitalize',
    marginTop: 2,
  },
  description: {
    ...typography.small,
    color: colors.text.secondary,
    fontStyle: 'italic',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
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
