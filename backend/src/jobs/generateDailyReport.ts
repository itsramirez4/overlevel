import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';

/** Aggregates yesterday's sets into workout_stats, one row per user/date. */
export const generateDailyReport = async () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const date = yesterday.toISOString().split('T')[0];

  const { data: workouts, error } = await supabaseAdmin
    .from('workouts')
    .select('user_id, sets(weight, reps, rpe)')
    .gte('started_at', `${date}T00:00:00`)
    .lt('started_at', `${date}T23:59:59`);

  if (error) {
    logger.error('generateDailyReport failed to fetch workouts', error);
    return;
  }

  const byUser = new Map<string, { volume: number; sets: number; reps: number; rpes: number[] }>();

  for (const w of workouts || []) {
    const entry = byUser.get(w.user_id) || { volume: 0, sets: 0, reps: 0, rpes: [] };
    for (const s of w.sets || []) {
      entry.volume += s.weight * s.reps;
      entry.sets += 1;
      entry.reps += s.reps;
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
      workout_count: 1,
    }, { onConflict: 'user_id,date' });
  }

  logger.info(`Daily report generated for ${date} (${byUser.size} users)`);
};
