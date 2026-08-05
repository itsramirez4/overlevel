import { workoutStore } from '../stores/workoutStore';
import { api } from '../services/api';
import { requestNotificationPermissions } from '../services/notifications';

export const useWorkout = () => {
  const currentWorkout = workoutStore((state) => state.currentWorkout);
  const setCurrentWorkout = workoutStore((state) => state.setCurrentWorkout);
  const setSessionExercises = workoutStore((state) => state.setSessionExercises);

  const startWorkout = async (routineId?: string) => {
    const { data } = await api.post('/workouts', { routine_id: routineId });
    setCurrentWorkout(data);

    // Best-effort — the rest timer's countdown works regardless of this.
    requestNotificationPermissions();

    if (routineId) {
      const { data: routine } = await api.get(`/routines/${routineId}`);
      const exercises = (routine.routine_exercises || [])
        .slice()
        .sort((a: any, b: any) => a.order_num - b.order_num)
        .map((re: any) => re.exercises)
        .filter(Boolean);
      setSessionExercises(exercises);
    } else {
      setSessionExercises([]);
    }

    return data;
  };

  const completeWorkout = async (feltLike?: string, notes?: string) => {
    if (!currentWorkout) return;
    const { data } = await api.put(`/workouts/${currentWorkout.id}/complete`, {
      felt_like: feltLike,
      notes,
    });
    setCurrentWorkout(null);
    setSessionExercises([]);
    return data;
  };

  return { currentWorkout, startWorkout, completeWorkout };
};
