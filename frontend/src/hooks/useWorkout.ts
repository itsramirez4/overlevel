import { workoutStore } from '../stores/workoutStore';
import { api } from '../services/api';
import { requestNotificationPermissions, cancelRestTimerNotification } from '../services/notifications';
import { Exercise, Routine, RoutineExercise, Workout } from '../types';

export const useWorkout = () => {
  const hasHydrated = workoutStore((state) => state.hasHydrated);
  const currentWorkout = workoutStore((state) => state.currentWorkout);
  const setCurrentWorkout = workoutStore((state) => state.setCurrentWorkout);
  const setSessionExercises = workoutStore((state) => state.setSessionExercises);

  const startWorkout = async (routineId?: string) => {
    const { data } = await api.post<Workout & { resumed?: boolean }>('/workouts', { routine_id: routineId });
    setCurrentWorkout(data);

    // Best-effort — the rest timer's countdown works regardless of this.
    requestNotificationPermissions();

    if (data.resumed) {
      // workoutService.start() is idempotent server-side: if the user
      // already had an incomplete workout (local state lost — reinstall,
      // cleared storage, a new device), it returns that one instead of
      // creating an orphaned duplicate. Rebuild the session's exercise list
      // from what it already has logged — same dedup-by-first-appearance
      // logic as "repeat last workout" — instead of the fresh-start paths
      // below, so exercises already worked don't just vanish from the screen.
      const orderedSets = (data.sets || []).slice().sort((a, b) => a.set_number - b.set_number);
      const seen = new Set<string>();
      const exercises: Exercise[] = orderedSets
        .map((s) => s.exercises)
        .filter((ex): ex is Exercise => {
          if (!ex || seen.has(ex.id)) return false;
          seen.add(ex.id);
          return true;
        });
      setSessionExercises(exercises);

      // Every set logged for a superset chain shares the same
      // superset_group value (the chain's first exercise's id — see
      // workouts/log.tsx's supersetGroups), so two neighboring exercises
      // here with the same non-null value were linked. setSessionExercises
      // above always resets linkedToPrevious to {}, so this has to run
      // after it, not before.
      const groupByExercise = new Map<string, string>();
      for (const s of orderedSets) {
        if (s.superset_group && s.exercises && !groupByExercise.has(s.exercises.id)) {
          groupByExercise.set(s.exercises.id, s.superset_group);
        }
      }
      const linkedToPrevious: Record<string, boolean> = {};
      for (let i = 1; i < exercises.length; i++) {
        const prevGroup = groupByExercise.get(exercises[i - 1].id);
        const curGroup = groupByExercise.get(exercises[i].id);
        if (prevGroup && curGroup && prevGroup === curGroup) linkedToPrevious[exercises[i].id] = true;
      }
      if (Object.keys(linkedToPrevious).length > 0) {
        workoutStore.setState({ linkedToPrevious });
      }
    } else if (routineId) {
      const { data: routine } = await api.get<Routine>(`/routines/${routineId}`);
      const exercises: Exercise[] = (routine.routine_exercises || [])
        .slice()
        .sort((a, b) => a.order_num - b.order_num)
        .filter((re): re is RoutineExercise & { exercises: Exercise } => !!re.exercises)
        .map((re) => ({
          ...re.exercises,
          target_sets: re.target_sets,
          target_weight: re.target_weight,
          target_reps: re.target_reps,
        }));
      setSessionExercises(exercises);
    } else {
      setSessionExercises([]);
    }

    return data;
  };

  const completeWorkout = async (title?: string, feltLike?: string, notes?: string) => {
    if (!currentWorkout) return;
    const { data } = await api.put<Workout>(`/workouts/${currentWorkout.id}/complete`, {
      title,
      felt_like: feltLike,
      notes,
    });
    setCurrentWorkout(null);
    setSessionExercises([]);
    // Otherwise a rest timer still counting down when the workout gets
    // completed fires its OS notification minutes later, for a workout
    // that's already finished.
    cancelRestTimerNotification();
    return data;
  };

  return { hasHydrated, currentWorkout, startWorkout, completeWorkout };
};
