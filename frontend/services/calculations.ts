/** Epley formula estimated one-rep max. */
export const estimate1RM = (weight: number, reps: number): number => {
  if (reps <= 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 100) / 100;
};

export const calculateVolume = (weight: number, reps: number): number => weight * reps;
