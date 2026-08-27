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

/**
 * Pace as "min:ss /km" (or /mi), the standard way runners read a pace.
 * Pass the value already converted to the target unit (see units.ts'
 * paceToUnit) — this only formats, it doesn't convert.
 */
export const formatPace = (minPerUnit: number | null | undefined, unit: 'km' | 'mi' = 'km'): string => {
  if (minPerUnit == null) return '—';
  const mins = Math.floor(minPerUnit);
  const secs = Math.round((minPerUnit - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')} /${unit}`;
};
