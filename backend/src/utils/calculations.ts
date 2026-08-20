/** Epley formula estimated one-rep max. */
export const estimate1RM = (weight: number, reps: number): number => {
  if (reps <= 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 100) / 100;
};

export const calculateVolume = (weight: number, reps: number): number => {
  return weight * reps;
};

/**
 * Cardio has no weight/reps — distance is the closest analog to "how much
 * work was done" for the math (battle damage, XP) that treats every set the
 * same way regardless of category. Scaled by 100 so a typical run's total
 * effort lands in the same order of magnitude as a strength set's volume
 * (kg*reps), not two orders smaller.
 */
export const calculateCardioEffort = (distanceKm: number): number => {
  return Math.round(distanceKm * 100 * 100) / 100;
};

export type ExerciseCategory = 'compound' | 'isolation' | 'cardio';

/** Effort for a single set, category-aware — the one number battle damage
 * and XP both key off regardless of whether the set is strength or cardio. */
export const calculateSetEffort = (
  category: ExerciseCategory,
  weight: number | null | undefined,
  reps: number | null | undefined,
  distanceKm: number | null | undefined
): number => {
  if (category === 'cardio') return calculateCardioEffort(distanceKm || 0);
  return calculateVolume(weight || 0, reps || 0);
};

/** Pace, in minutes per km — the natural "how good was this run" measure
 * when comparing sets of different distances (unlike raw duration). */
export const calculatePaceMinPerKm = (durationSeconds: number, distanceKm: number): number | null => {
  if (!distanceKm) return null;
  return Math.round((durationSeconds / 60 / distanceKm) * 100) / 100;
};

export const calculateAvgRpe = (rpes: (number | undefined)[]): number | undefined => {
  const valid = rpes.filter((r): r is number => typeof r === 'number');
  if (valid.length === 0) return undefined;
  return Math.round((valid.reduce((sum, r) => sum + r, 0) / valid.length) * 10) / 10;
};
