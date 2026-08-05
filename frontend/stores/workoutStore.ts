import { create } from 'zustand';
import { Exercise, Workout } from '../types';

interface WorkoutStore {
  currentWorkout: Workout | null;
  setCurrentWorkout: (workout: Workout | null) => void;
  sessionExercises: Exercise[];
  setSessionExercises: (exercises: Exercise[]) => void;
  addSessionExercise: (exercise: Exercise) => void;
  removeSessionExercise: (exerciseId: string) => void;
  restEndsAt: number | null;
  startRest: (seconds: number) => void;
  clearRest: () => void;
  linkedToPrevious: Record<string, boolean>;
  toggleSupersetLink: (exerciseId: string) => void;
}

export const workoutStore = create<WorkoutStore>((set, get) => ({
  currentWorkout: null,
  setCurrentWorkout: (workout) => set({ currentWorkout: workout, restEndsAt: null }),

  sessionExercises: [],
  setSessionExercises: (exercises) => set({ sessionExercises: exercises, linkedToPrevious: {} }),
  addSessionExercise: (exercise) => {
    if (get().sessionExercises.some((e) => e.id === exercise.id)) return;
    set({ sessionExercises: [...get().sessionExercises, exercise] });
  },
  removeSessionExercise: (exerciseId) => {
    const linkedToPrevious = { ...get().linkedToPrevious };
    delete linkedToPrevious[exerciseId];
    set({
      sessionExercises: get().sessionExercises.filter((e) => e.id !== exerciseId),
      linkedToPrevious,
    });
  },

  restEndsAt: null,
  startRest: (seconds) => set({ restEndsAt: Date.now() + seconds * 1000 }),
  clearRest: () => set({ restEndsAt: null }),

  linkedToPrevious: {},
  toggleSupersetLink: (exerciseId) =>
    set({
      linkedToPrevious: {
        ...get().linkedToPrevious,
        [exerciseId]: !get().linkedToPrevious[exerciseId],
      },
    }),
}));
