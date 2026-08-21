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
  moveSessionExercise: (exerciseId: string, direction: 'up' | 'down') => void;
  updateSessionExercise: (exerciseId: string, patch: Partial<Exercise>) => void;
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

      // Reordering changes who's actually "previous" for every exercise from
      // this point on, so superset links (each just a boolean keyed by
      // exercise id, meaning "linked to whoever precedes it") would silently
      // repair themselves onto the wrong neighbor if left alone — clearing
      // them all is the only way to guarantee no accidental pairing survives
      // a reorder. The user can just re-link if they still want a superset.
      moveSessionExercise: (exerciseId, direction) => {
        const exercises = [...get().sessionExercises];
        const index = exercises.findIndex((e) => e.id === exerciseId);
        if (index === -1) return;

        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= exercises.length) return;

        [exercises[index], exercises[targetIndex]] = [exercises[targetIndex], exercises[index]];
        set({ sessionExercises: exercises, linkedToPrevious: {} });
      },

      // Patches one session exercise in place — used to reflect a per-exercise
      // unit change (kg/lbs, km/mi) immediately in every screen showing this
      // exercise, without waiting on a refetch.
      updateSessionExercise: (exerciseId, patch) => {
        set({
          sessionExercises: get().sessionExercises.map((e) => (e.id === exerciseId ? { ...e, ...patch } : e)),
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
