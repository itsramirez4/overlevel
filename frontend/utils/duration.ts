export const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours}h ${rest}min` : `${hours}h`;
};

/** A single cardio set's duration, e.g. "32:05" — mm:ss, not the h/min
 * format above (that's for whole-workout durations, minutes only). */
export const formatSetDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/** Pace as "min:ss /km", the standard way runners read a pace. */
export const formatPace = (minPerKm: number | null | undefined): string => {
  if (minPerKm == null) return '—';
  const mins = Math.floor(minPerKm);
  const secs = Math.round((minPerKm - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')} /km`;
};
