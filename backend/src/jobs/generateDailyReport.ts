import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';
import { calculateSetEffort, ExerciseCategory } from '../utils/calculations';

interface DailyReportSet {
  weight: number | null;
  reps: number | null;
  distance_km: number | null;
  rpe: number | null;
  is_warmup: boolean;
  exercises: { category: ExerciseCategory } | null;
}

/** Aggregates yesterday's sets into workout_stats, one row per user/date. */
export const generateDailyReport = async () => {
  // UTC, not local server time — same reasoning as every date range in
  // analyticsService.ts: setDate()/toISOString() mixes local-timezone field
  // math with a UTC-formatted result, which can pick the wrong calendar day
  // near a local midnight. The query below then uses explicit Z-suffixed
  // bounds instead of bare `${date}T00:00:00`, which otherwise left the
  // range's timezone up to Postgres's session setting rather than UTC.
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const date = yesterday.toISOString().split('T')[0];

  const { data: workouts, error } = await supabaseAdmin
    .from('workouts')
    .select('user_id, sets(weight, reps, distance_km, rpe, is_warmup, exercises(category))')
    .gte('started_at', `${date}T00:00:00Z`)
    .lt('started_at', `${date}T23:59:59.999Z`);

  if (error) {
    logger.error('generateDailyReport failed to fetch workouts', error);
    return;
  }

  const byUser = new Map<string, { workouts: number; volume: number; sets: number; reps: number; rpes: number[] }>();

  for (const w of (workouts || []) as unknown as { user_id: string; sets: DailyReportSet[] }[]) {
    const entry = byUser.get(w.user_id) || { workouts: 0, volume: 0, sets: 0, reps: 0, rpes: [] };
    entry.workouts += 1;
    // Same effort/exclusion rules as analyticsService and XP/battle damage:
    // cardio sets are distance-based (weight/reps are NULL for those, which
    // used to silently zero them out here), and warmups don't count.
    for (const s of w.sets || []) {
      if (s.is_warmup) continue;
      entry.volume += calculateSetEffort(s.exercises?.category || 'compound', s.weight, s.reps, s.distance_km);
      entry.sets += 1;
      entry.reps += s.reps || 0;
      if (s.rpe) entry.rpes.push(s.rpe);
    }
    byUser.set(w.user_id, entry);
  }

  for (const [userId, stats] of byUser) {
    await supabaseAdmin.from('workout_stats').upsert({
      user_id: userId,
      date,
      total_volume: stats.volume,
      total_sets: stats.sets,
      total_reps: stats.reps,
      avg_rpe: stats.rpes.length ? stats.rpes.reduce((a, b) => a + b, 0) / stats.rpes.length : null,
      workout_count: stats.workouts,
    }, { onConflict: 'user_id,date' });
  }

  logger.info(`Daily report generated for ${date} (${byUser.size} users)`);
};
