import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Calculator, Dumbbell, Plus } from 'lucide-react-native';
import { api } from '../../../services/api';
import { colors, radius, spacing, typography } from '../../../utils/theme';
import { useWorkout } from '../../../hooks/useWorkout';
import { workoutStore } from '../../../stores/workoutStore';
import { ExerciseLogSection } from '../../../components/workout/ExerciseLogSection';
import { SessionTimer } from '../../../components/workout/SessionTimer';
import { RestTimer } from '../../../components/workout/RestTimer';
import { CompleteWorkoutDialog } from '../../../components/workout/CompleteWorkoutDialog';
import { EmptyState } from '../../../components/common/EmptyState';
import { Button } from '../../../components/ui/Button';

export default function WorkoutLogScreen() {
  const router = useRouter();
  const { currentWorkout, completeWorkout } = useWorkout();
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const sessionExercises = workoutStore((state) => state.sessionExercises);
  const removeSessionExercise = workoutStore((state) => state.removeSessionExercise);
  const linkedToPrevious = workoutStore((state) => state.linkedToPrevious);
  const toggleSupersetLink = workoutStore((state) => state.toggleSupersetLink);

  // A chain of 2+ consecutive linked exercises shares a superset group, keyed by the chain's first exercise id.
  const supersetGroups: Record<string, string> = {};
  let chain: string[] = [];
  const flushChain = () => {
    if (chain.length > 1) chain.forEach((id) => (supersetGroups[id] = chain[0]));
    chain = [];
  };
  sessionExercises.forEach((exercise) => {
    if (linkedToPrevious[exercise.id] && chain.length > 0) {
      chain.push(exercise.id);
    } else {
      flushChain();
      chain = [exercise.id];
    }
  });
  flushChain();

  // Inside a superset round you move straight to the next exercise — the rest
  // timer only fires once the round's last exercise logs a set.
  const shouldRestAfter: Record<string, boolean> = {};
  sessionExercises.forEach((exercise, i) => {
    const next = sessionExercises[i + 1];
    shouldRestAfter[exercise.id] = !(next && linkedToPrevious[next.id]);
  });

  const { data: sets, refetch } = useQuery({
    queryKey: ['sets', currentWorkout?.id],
    queryFn: () => api.get(`/sets/workout/${currentWorkout!.id}`).then((r) => r.data),
    enabled: !!currentWorkout,
  });

  if (!currentWorkout) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyContainer}>
          <EmptyState
            icon={Dumbbell}
            title="No hay entrenamiento activo"
            message="Empieza uno desde la pestaña Entrenamientos."
          />
          <Button
            label="IR A ENTRENAMIENTOS"
            variant="outline"
            onPress={() => router.replace('/workouts')}
            style={styles.emptyButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  const handleComplete = async (feltLike?: string, notes?: string) => {
    setCompleteDialogOpen(false);
    await completeWorkout(feltLike, notes);
    router.replace('/(tabs)/dashboard');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Entrenamiento en curso</Text>
          <SessionTimer startedAt={currentWorkout.started_at} />
          <TouchableOpacity
            onPress={() => router.push('/profile/plate-calculator')}
            hitSlop={10}
            style={styles.plateCalcButton}
            accessibilityLabel="Calculadora de discos"
          >
            <Calculator size={18} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        <RestTimer />

        {sessionExercises.length === 0 ? (
          <EmptyState
            icon={Dumbbell}
            title="Sin ejercicios todavía"
            message="Añade el primer ejercicio para empezar a registrar series."
          />
        ) : (
          sessionExercises.map((exercise, index) => (
            <ExerciseLogSection
              key={exercise.id}
              workoutId={currentWorkout.id}
              exercise={exercise}
              loggedSets={(sets || []).filter((s: any) => s.exercise_id === exercise.id)}
              onSetLogged={() => refetch()}
              onRemove={() => removeSessionExercise(exercise.id)}
              isFirst={index === 0}
              isLinkedToPrevious={!!linkedToPrevious[exercise.id]}
              onToggleLink={() => toggleSupersetLink(exercise.id)}
              supersetGroup={supersetGroups[exercise.id]}
              shouldRest={shouldRestAfter[exercise.id]}
            />
          ))
        )}

        <TouchableOpacity
          style={styles.addExerciseButton}
          onPress={() => router.push('/workouts/add-exercise')}
          activeOpacity={0.7}
        >
          <Plus size={18} color={colors.accent.fire} strokeWidth={2.4} />
          <Text style={styles.addExerciseText}>Añadir ejercicio</Text>
        </TouchableOpacity>

        <Button
          label="TERMINAR ENTRENAMIENTO"
          variant="outline"
          onPress={() => setCompleteDialogOpen(true)}
          style={styles.endButton}
        />
      </ScrollView>

      <CompleteWorkoutDialog
        visible={completeDialogOpen}
        onConfirm={handleComplete}
        onCancel={() => setCompleteDialogOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  emptyContainer: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  emptyButton: {
    marginTop: spacing.lg,
  },
  plateCalcButton: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
    flex: 1,
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
    marginBottom: spacing.lg,
  },
  addExerciseText: {
    ...typography.small,
    color: colors.accent.fire,
    fontWeight: '700',
  },
  endButton: {
    marginBottom: spacing.lg,
  },
});
