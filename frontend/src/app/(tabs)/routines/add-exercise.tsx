import { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronLeft, Dumbbell, Plus } from 'lucide-react-native';
import { api } from '../../../services/api';
import { colors, radius, shadow, spacing, typography } from '../../../utils/theme';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { ExerciseForm } from '../../../components/forms/ExerciseForm';
import { EmptyState } from '../../../components/common/EmptyState';
import { MuscleGroupFilter } from '../../../components/exercises/MuscleGroupFilter';
import { authStore } from '../../../stores/authStore';
import { unitToKg } from '../../../utils/units';
import { getErrorMessage } from '../../../utils/errors';
import { Exercise, Routine } from '../../../types';

export default function AddExerciseScreen() {
  const { routineId } = useLocalSearchParams<{ routineId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const unit = authStore((s) => s.user?.weight_unit) || 'kg';
  const currentUserId = authStore((s) => s.user?.id);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [targetSets, setTargetSets] = useState('4');
  const [targetWeight, setTargetWeight] = useState('');
  const [targetReps, setTargetReps] = useState('8');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [muscleGroup, setMuscleGroup] = useState<string | null>(null);

  const { data: exercises, isLoading, isError, refetch: refetchExercises } = useQuery({
    queryKey: ['exercises', 'all'],
    queryFn: () => api.get<Exercise[]>('/exercises?scope=all').then((r) => r.data),
  });

  const filteredExercises = (exercises || [])
    .filter((e) => e.name.toLowerCase().includes(search.trim().toLowerCase()))
    .filter((e) => !muscleGroup || e.muscle_groups?.includes(muscleGroup));

  const { data: routine } = useQuery({
    queryKey: ['routines', routineId],
    queryFn: () => api.get<Routine>(`/routines/${routineId}`).then((r) => r.data),
    enabled: !!routineId,
  });

  const handleCreateExercise = async (data: {
    name: string;
    category: string;
    notes?: string;
    muscle_groups?: string[];
  }) => {
    setError('');
    setSaving(true);
    try {
      const { data: exercise } = await api.post<Exercise>('/exercises', data);
      await queryClient.invalidateQueries({ queryKey: ['exercises'] });
      setSelectedId(exercise.id);
      setCreatingNew(false);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo crear el ejercicio'));
    } finally {
      setSaving(false);
    }
  };

  const handleAddToRoutine = async () => {
    if (!selectedId) return;
    setError('');

    const parsedSets = targetSets.trim() ? parseInt(targetSets, 10) : undefined;
    const parsedWeight = targetWeight.trim() ? parseFloat(targetWeight) : undefined;
    const parsedReps = targetReps.trim() ? parseInt(targetReps, 10) : undefined;
    // Sets: 0 isn't a real target, so stays > 0. Weight/reps: 0 is a real
    // target (a bodyweight exercise), so only reject negative values.
    const invalid =
      (parsedSets !== undefined && (!Number.isFinite(parsedSets) || parsedSets <= 0)) ||
      (parsedWeight !== undefined && (!Number.isFinite(parsedWeight) || parsedWeight < 0)) ||
      (parsedReps !== undefined && (!Number.isFinite(parsedReps) || parsedReps < 0));
    if (invalid) {
      setError('Sets debe ser mayor que cero; peso y reps no pueden ser negativos');
      return;
    }

    setSaving(true);
    try {
      const nextOrder = (routine?.routine_exercises?.length || 0) + 1;
      await api.post(`/routines/${routineId}/exercises`, {
        exercise_id: selectedId,
        order_num: nextOrder,
        target_sets: parsedSets,
        target_weight: parsedWeight !== undefined ? unitToKg(parsedWeight, unit) : undefined,
        target_reps: parsedReps,
      });
      await queryClient.invalidateQueries({ queryKey: ['routines', routineId] });
      router.back();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo añadir el ejercicio'));
    } finally {
      setSaving(false);
    }
  };

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
        <Text style={styles.title} accessibilityRole="header">
          Añadir ejercicio
        </Text>
      </View>

      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={creatingNew ? [] : filteredExercises}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          creatingNew ? (
            <View style={styles.newExerciseSection}>
              <ExerciseForm onSubmit={handleCreateExercise} loading={saving} />
              <TouchableOpacity onPress={() => setCreatingNew(false)} style={styles.cancelLink}>
                <Text style={styles.cancelLinkText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Elige un ejercicio</Text>
              <Input placeholder="Buscar ejercicio…" value={search} onChangeText={setSearch} />
              <MuscleGroupFilter value={muscleGroup} onChange={setMuscleGroup} />
              <TouchableOpacity
                style={styles.newButton}
                onPress={() => setCreatingNew(true)}
                activeOpacity={0.7}
              >
                <Plus size={18} color={colors.accent.fire} strokeWidth={2.4} />
                <Text style={styles.newButtonText}>Crear ejercicio nuevo</Text>
              </TouchableOpacity>
            </>
          )
        }
        ListEmptyComponent={
          creatingNew || isLoading ? null : isError ? (
            <EmptyState
              icon={Dumbbell}
              title="No se pudo cargar"
              message="Revisa tu conexión e inténtalo de nuevo."
              onRetry={refetchExercises}
            />
          ) : (
            <EmptyState
              icon={Dumbbell}
              title={search || muscleGroup ? 'Sin resultados' : 'Sin ejercicios todavía'}
              message={
                search || muscleGroup
                  ? 'Prueba con otro nombre o grupo muscular.'
                  : 'Crea uno nuevo para empezar a añadirlo a tus rutinas.'
              }
            />
          )
        }
        renderItem={({ item, index }) =>
          creatingNew ? null : (
            <AnimatedTouchable
              entering={FadeInDown.delay(index * 50).duration(250)}
              style={[styles.exerciseCard, selectedId === item.id && styles.exerciseCardSelected]}
              onPress={() => setSelectedId(item.id)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedId === item.id }}
            >
              <View style={styles.iconBadge}>
                <Dumbbell size={16} color={colors.accent.fire} strokeWidth={2} />
              </View>
              <View style={styles.exerciseInfo}>
                <Text style={styles.exerciseName}>{item.name}</Text>
                {item.user_id !== currentUserId && item.users?.username ? (
                  <Text style={styles.exerciseAuthor}>creado por @{item.users.username}</Text>
                ) : null}
              </View>
              {selectedId === item.id && <Check size={18} color={colors.accent.fire} strokeWidth={2.4} />}
            </AnimatedTouchable>
          )
        }
        ListFooterComponent={
          !creatingNew && selectedId ? (
            <View style={styles.targetsSection}>
              <Text style={styles.sectionTitle}>Objetivo</Text>
              <View style={styles.targetsRow}>
                <View style={styles.targetInput}>
                  <Input label="Sets" value={targetSets} onChangeText={setTargetSets} keyboardType="number-pad" />
                </View>
                <View style={styles.targetInput}>
                  <Input
                    label={unit === 'lbs' ? 'Lbs' : 'Kg'}
                    value={targetWeight}
                    onChangeText={setTargetWeight}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.targetInput}>
                  <Input
                    label="Reps"
                    value={targetReps}
                    onChangeText={setTargetReps}
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <Button
                label={saving ? 'Añadiendo…' : 'AÑADIR A LA RUTINA'}
                loading={saving}
                onPress={handleAddToRoutine}
              />
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

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
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  newButton: {
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
  newButtonText: {
    ...typography.small,
    color: colors.accent.fire,
    fontWeight: '700',
  },
  newExerciseSection: {
    marginBottom: spacing.lg,
  },
  cancelLink: {
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  cancelLinkText: {
    ...typography.small,
    color: colors.text.secondary,
  },
  exerciseCard: {
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
  exerciseCardSelected: {
    borderColor: colors.accent.fire,
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
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '700',
  },
  exerciseAuthor: {
    ...typography.tiny,
    color: colors.text.muted,
    marginTop: 2,
  },
  targetsSection: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  targetsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  targetInput: {
    flex: 1,
  },
  error: {
    ...typography.small,
    color: colors.semantic.error,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
});
