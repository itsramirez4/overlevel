import { Workout } from '../types';

/** A workout's display name: its imported/explicit title, else its routine's name, else its date. */
export const getWorkoutName = (workout: Workout): string => {
  if (workout.title) return workout.title;
  if (workout.routines?.name) return workout.routines.name;
  return new Date(workout.started_at).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
};
