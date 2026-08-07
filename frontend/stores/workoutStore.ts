import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Exercise, Workout } from '../types';

interface WorkoutStore {
  // False until AsyncStorage rehydration finishes. Screens that decide
  // whether to show "resume workout" vs. "start a new one" must wait for
  // this — reading currentWorkout before then always sees the default
  // `null`, even if a real in-progress workout is about to load in, and
  // could let the user start a duplicate that orphans the real one.
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
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

// Persisted so an in-progress workout (exercises, rest timer, superset links)
// survives the app being killed/restarted mid-session — without this, only
// the backend workout row survived and the whole session state was lost.
export const workoutStore = create<WorkoutStore>()(
  persist(
    (set, get) => ({
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),

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
    }),
    {
      name: 'overlevel-workout-session',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        currentWorkout: state.currentWorkout,
        sessionExercises: state.sessionExercises,
        restEndsAt: state.restEndsAt,
        linkedToPrevious: state.linkedToPrevious,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
