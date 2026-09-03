import { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Dumbbell, Plus } from 'lucide-react-native';
import { api } from '../../../services/api';
import { colors, radius, shadow, spacing, typography } from '../../../utils/theme';
import { workoutStore } from '../../../stores/workoutStore';
import { ExerciseForm } from '../../../components/forms/ExerciseForm';
import { EmptyState } from '../../../components/common/EmptyState';
import { Input } from '../../../components/ui/Input';
import { MuscleGroupFilter } from '../../../components/exercises/MuscleGroupFilter';
import { getErrorMessage } from '../../../utils/errors';
import { authStore } from '../../../stores/authStore';
import { Exercise } from '../../../types';

export default function WorkoutAddExerciseScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const currentUserId = authStore((state) => state.user?.id);
  const sessionExercises = workoutStore((state) => state.sessionExercises);
  const addSessionExercise = workoutStore((state) => state.addSessionExercise);

  const [creatingNew, setCreatingNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [muscleGroup, setMuscleGroup] = useState<string | null>(null);

  const { data: exercises, isLoading, isError, refetch: refetchExercises } = useQuery({
    queryKey: ['exercises', 'all'],
    queryFn: () => api.get<Exercise[]>('/exercises?scope=all').then((r) => r.data),
  });

  const alreadyAddedIds = new Set(sessionExercises.map((e) => e.id));
  const availableExercises = (exercises || [])
    .filter((e) => !alreadyAddedIds.has(e.id))
    .filter((e) => e.name.toLowerCase().includes(search.trim().toLowerCase()))
    .filter((e) => !muscleGroup || e.muscle_groups?.includes(muscleGroup));

  const handlePick = (exercise: Exercise) => {
    addSessionExercise(exercise);
    router.back();
  };

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
      addSessionExercise(exercise);
      router.back();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo crear el ejercicio'));
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
        data={creatingNew ? [] : availableExercises}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          creatingNew ? (
            <View style={styles.newExerciseSection}>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <ExerciseForm onSubmit={handleCreateExercise} loading={saving} />
              <TouchableOpacity onPress={() => setCreatingNew(false)} style={styles.cancelLink}>
                <Text style={styles.cancelLinkText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
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
              title={search || muscleGroup ? 'Sin resultados' : 'Sin ejercicios disponibles'}
              message={
                search || muscleGroup
                  ? 'Prueba con otro nombre o grupo muscular.'
                  : 'Crea uno nuevo para añadirlo a este entrenamiento.'
              }
            />
          )
        }
        renderItem={({ item, index }) =>
          creatingNew ? null : (
            <AnimatedTouchable
              entering={FadeInDown.delay(index * 50).duration(250)}
              style={styles.exerciseCard}
              onPress={() => handlePick(item)}
              activeOpacity={0.7}
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
            </AnimatedTouchable>
          )
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
  error: {
    ...typography.small,
    color: colors.semantic.error,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
});
