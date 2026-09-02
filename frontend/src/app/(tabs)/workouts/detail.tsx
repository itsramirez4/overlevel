import { useState } from 'react';
import { Alert, View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  Clock,
  Dumbbell,
  Flame,
  Link2,
  ListChecks,
  Pencil,
  Plus,
  SquareCheck,
  SquarePen,
  Trash2,
  Trophy,
  X,
} from 'lucide-react-native';
import { api } from '../../../services/api';
import { colors, radius, shadow, spacing, typography } from '../../../utils/theme';
import { StatCard } from '../../../components/analytics/StatCard';
import { EmptyState } from '../../../components/common/EmptyState';
import { Loader } from '../../../components/ui/Loader';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { EditWorkoutDialog } from '../../../components/workout/EditWorkoutDialog';
import { LoggedSetRow } from '../../../components/workout/LoggedSetRow';
import { SetLogger } from '../../../components/workout/SetLogger';
import { ExerciseNoteField } from '../../../components/workout/ExerciseNoteField';
import { getWorkoutName } from '../../../utils/workoutName';
import { feltLikeLabel } from '../../../utils/feltLike';
import { formatWeight, kgToUnit, formatDistance } from '../../../utils/units';
import { formatDuration, formatSetDuration } from '../../../utils/duration';
import { authStore } from '../../../stores/authStore';
import { getErrorMessage } from '../../../utils/errors';
import { Exercise, Set as WorkoutSet, Workout, WorkoutExerciseNote } from '../../../types';

interface ExerciseGroup {
  exerciseId: string;
  name: string;
  exercise?: Exercise;
  isCardio: boolean;
  sets: WorkoutSet[];
}

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editingSets, setEditingSets] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pendingExercises, setPendingExercises] = useState<Exercise[]>([]);
  const [removeTarget, setRemoveTarget] = useState<{ exerciseId: string; name: string } | null>(null);
  const [removing, setRemoving] = useState(false);
  const unit = authStore((s) => s.user?.weight_unit) || 'kg';
  const globalDistanceUnit = authStore((s) => s.user?.distance_unit) || 'km';
  const currentUserId = authStore((s) => s.user?.id);

  const { data: workout, isLoading, refetch } = useQuery({
    queryKey: ['workouts', id],
    queryFn: () => api.get<Workout>(`/workouts/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const { data: allExercises } = useQuery({
    queryKey: ['exercises', 'all'],
    queryFn: () => api.get<Exercise[]>('/exercises?scope=all').then((r) => r.data),
    enabled: pickerOpen,
  });

  const { data: exerciseNotes, refetch: refetchNotes } = useQuery({
    queryKey: ['exercise-notes', id],
    queryFn: () => api.get<WorkoutExerciseNote[]>(`/workout-exercise-notes/workout/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const handleNoteSaved = (exerciseId: string, notes: string) => {
    api.put(`/workout-exercise-notes/${id}/${exerciseId}`, { notes }).then(() => refetchNotes());
  };

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

  const handleSaveEdit = async (title?: string, notes?: string, feltLike?: string, startedAt?: string) => {
    if (savingEdit) return;
    setSavingEdit(true);
    try {
      await api.put(`/workouts/${id}`, { title, notes, felt_like: feltLike, started_at: startedAt });
      setEditOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['workouts', id] });
      await queryClient.invalidateQueries({ queryKey: ['workouts'] });
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err, 'No se pudieron guardar los cambios. Inténtalo de nuevo.'));
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSetChanged = async () => {
    await refetch();
    await queryClient.invalidateQueries({ queryKey: ['workouts'] });
  };

  const handlePickExercise = (exercise: Exercise) => {
    setPendingExercises((prev) => (prev.some((e) => e.id === exercise.id) ? prev : [...prev, exercise]));
    setPickerOpen(false);
    setPickerSearch('');
  };

  const confirmRemoveExercise = async () => {
    if (!removeTarget) return;
    const { exerciseId } = removeTarget;
    setRemoving(true);
    try {
      const toDelete = (workout?.sets || []).filter((s) => s.exercise_id === exerciseId);
      for (const set of toDelete) {
        await api.delete(`/sets/${set.id}`);
      }
      setPendingExercises((prev) => prev.filter((e) => e.id !== exerciseId));
      await handleSetChanged();
    } catch {
      Alert.alert('Error', 'No se pudo quitar el ejercicio. Inténtalo de nuevo.');
    } finally {
      setRemoving(false);
      setRemoveTarget(null);
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
    .filter((s) => !s.is_warmup)
    .reduce((sum, s) => sum + (s.weight || 0) * (s.reps || 0), 0);

  const exerciseGroups = Object.values(
    sets.reduce((groups: Record<string, ExerciseGroup>, set) => {
      const key = set.exercise_id;
      if (!groups[key]) {
        groups[key] = {
          exerciseId: key,
          name: set.exercises?.name || 'Ejercicio',
          exercise: set.exercises,
          isCardio: set.exercises?.category === 'cardio',
          sets: [],
        };
      }
      groups[key].sets.push(set);
      return groups;
    }, {})
  );

  exerciseGroups.forEach((g) => g.sets.sort((a, b) => a.set_number - b.set_number));

  // Picked in edit mode but no set logged for it yet — shown as an empty
  // group with just a SetLogger. Once its first set lands, it naturally
  // shows up in exerciseGroups above instead (via the next refetch), so
  // filter it out here to avoid rendering the same exercise twice.
  const addedExerciseIds = new Set(exerciseGroups.map((g) => g.exerciseId));
  const visiblePending = pendingExercises.filter((e) => !addedExerciseIds.has(e.id));

  const rows: ExerciseGroup[] = [
    ...exerciseGroups,
    ...visiblePending.map((e) => ({
      exerciseId: e.id,
      name: e.name,
      exercise: e,
      isCardio: e.category === 'cardio',
      sets: [] as WorkoutSet[],
    })),
  ];

  const availableExercises = (allExercises || [])
    .filter((e) => !addedExerciseIds.has(e.id) && !pendingExercises.some((p) => p.id === e.id))
    .filter((e) => e.name.toLowerCase().includes(pickerSearch.trim().toLowerCase()));

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
          onPress={() => setEditingSets((v) => !v)}
          hitSlop={10}
          style={styles.deleteButton}
          accessibilityLabel={editingSets ? 'Terminar de editar series' : 'Editar series'}
        >
          {editingSets ? (
            <SquareCheck size={18} color={colors.accent.fire} />
          ) : (
            <SquarePen size={18} color={colors.text.secondary} />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setEditOpen(true)}
          hitSlop={10}
          style={styles.deleteButton}
          accessibilityLabel="Editar título, notas y sensación"
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
        data={rows}
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
          <>
            {editingSets && (
              <TouchableOpacity style={styles.addExerciseButton} onPress={() => setPickerOpen(true)} activeOpacity={0.7}>
                <Plus size={18} color={colors.accent.fire} strokeWidth={2.4} />
                <Text style={styles.addExerciseText}>Añadir ejercicio</Text>
              </TouchableOpacity>
            )}
            {workout.felt_like ? (
              <Text style={styles.feltLike}>
                Sensación: <Text style={styles.feltLikeValue}>{feltLikeLabel[workout.felt_like]}</Text>
              </Text>
            ) : null}
          </>
        }
        ListEmptyComponent={
          <EmptyState icon={Dumbbell} title="Sin series registradas" message="Este entrenamiento no tiene series." />
        }
        renderItem={({ item, index }) => {
          const weightUnit = item.exercise?.weight_unit || unit;
          const distanceUnit = item.exercise?.distance_unit || globalDistanceUnit;

          return (
            <Animated.View entering={FadeInDown.delay(index * 50).duration(250)} style={styles.exerciseCard}>
              <View style={styles.exerciseHeader}>
                <Text style={styles.exerciseName}>{item.name}</Text>
                {editingSets && (
                  <TouchableOpacity
                    onPress={() => setRemoveTarget({ exerciseId: item.exerciseId, name: item.name })}
                    hitSlop={8}
                    accessibilityLabel={`Quitar ${item.name} del entrenamiento`}
                  >
                    <X size={16} color={colors.semantic.error} />
                  </TouchableOpacity>
                )}
              </View>

              <ExerciseNoteField
                value={exerciseNotes?.find((n) => n.exercise_id === item.exerciseId)?.notes}
                onSave={(notes) => handleNoteSaved(item.exerciseId, notes)}
              />

              {editingSets ? (
                <>
                  {item.sets.length > 0 && (
                    <View style={styles.loggedSets}>
                      {item.sets.map((set) => (
                        <LoggedSetRow
                          key={set.id}
                          set={set}
                          isCardio={item.isCardio}
                          exerciseId={item.exerciseId}
                          weightUnit={weightUnit}
                          distanceUnit={distanceUnit}
                          onChanged={handleSetChanged}
                        />
                      ))}
                    </View>
                  )}
                  {item.exercise ? (
                    <SetLogger
                      workoutId={id!}
                      exercise={item.exercise}
                      setNumber={item.sets.length + 1}
                      onSetLogged={handleSetChanged}
                      shouldRest={false}
                    />
                  ) : (
                    // No embedded exercise on this group's sets — nothing
                    // sensible to log a new set against. Its already-logged
                    // sets above still render fine either way.
                    <Text style={styles.missingExerciseNotice}>
                      No se puede añadir más series a este ejercicio.
                    </Text>
                  )}
                </>
              ) : (
                item.sets.map((set) => (
                  <View
                    key={set.id}
                    style={[styles.setRow, set.is_pr && styles.setRowPr, set.is_warmup && styles.setRowWarmup]}
                  >
                    <Text style={styles.setNumber}>{set.set_number}</Text>
                    <Text style={styles.setValue}>
                      {item.isCardio
                        ? `${formatSetDuration(set.duration_seconds || 0)} · ${formatDistance(set.distance_km || 0, distanceUnit)}`
                        : `${formatWeight(set.weight || 0, weightUnit)} × ${set.reps} reps`}
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
                ))
              )}
            </Animated.View>
          );
        }}
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

      <ConfirmDialog
        visible={!!removeTarget}
        title="Quitar ejercicio"
        message={`¿Quitar "${removeTarget?.name}" y todas sus series de este entrenamiento?`}
        confirmLabel="Quitar"
        destructive
        loading={removing}
        onConfirm={confirmRemoveExercise}
        onCancel={() => !removing && setRemoveTarget(null)}
      />

      <EditWorkoutDialog
        visible={editOpen}
        loading={savingEdit}
        initialTitle={workout.title}
        initialNotes={workout.notes}
        initialFeltLike={workout.felt_like}
        initialStartedAt={workout.started_at}
        onSave={handleSaveEdit}
        onCancel={() => !savingEdit && setEditOpen(false)}
      />

      <Modal visible={pickerOpen} onClose={() => setPickerOpen(false)}>
        <Text style={styles.pickerTitle}>Añadir ejercicio</Text>
        <Input placeholder="Buscar ejercicio…" value={pickerSearch} onChangeText={setPickerSearch} />
        <FlatList
          style={styles.pickerList}
          data={availableExercises}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <Text style={styles.pickerEmpty}>{pickerSearch ? 'Sin resultados.' : 'No hay más ejercicios disponibles.'}</Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.pickerRow} onPress={() => handlePickExercise(item)} activeOpacity={0.7}>
              <Text style={styles.pickerRowText}>{item.name}</Text>
              {item.user_id !== currentUserId && item.users?.username ? (
                <Text style={styles.pickerRowAuthor}>creado por @{item.users.username}</Text>
              ) : null}
            </TouchableOpacity>
          )}
        />
      </Modal>
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
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  exerciseName: {
    ...typography.h3,
    color: colors.text.primary,
  },
  loggedSets: {
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  missingExerciseNotice: {
    ...typography.tiny,
    color: colors.text.muted,
    fontStyle: 'italic',
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
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1.5,
    borderColor: colors.accent.fire,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  addExerciseText: {
    ...typography.small,
    color: colors.accent.fire,
    fontWeight: '700',
  },
  pickerTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  pickerList: {
    maxHeight: 320,
    marginTop: spacing.md,
  },
  pickerEmpty: {
    ...typography.small,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  pickerRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  pickerRowText: {
    ...typography.body,
    color: colors.text.primary,
  },
  pickerRowAuthor: {
    ...typography.tiny,
    color: colors.text.muted,
    marginTop: 2,
  },
});
