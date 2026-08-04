/** Epley formula estimated one-rep max. */
export const estimate1RM = (weight: number, reps: number): number => {
  if (reps <= 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 100) / 100;
};

export const calculateVolume = (weight: number, reps: number): number => {
  return weight * reps;
};

export const calculateAvgRpe = (rpes: (number | undefined)[]): number | undefined => {
  const valid = rpes.filter((r): r is number => typeof r === 'number');
  if (valid.length === 0) return undefined;
  return Math.round((valid.reduce((sum, r) => sum + r, 0) / valid.length) * 10) / 10;
};
