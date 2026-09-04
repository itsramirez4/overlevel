import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';
import { pushTokenService } from '../services/pushTokenService';
import { sendPushNotification } from '../services/pushService';

/** Logs a weekly volume/training-frequency summary per user, and pushes each
 * one their own recap — skipped for anyone who trained zero times this week,
 * a "you did nothing" push being more likely to annoy than motivate. */
export const generateWeeklyStats = async () => {
  // UTC, not local server time — same reasoning as generateDailyReport.
  const weekAgo = new Date();
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);

  const { data, error } = await supabaseAdmin
    .from('workout_stats')
    .select('user_id, total_volume, total_sets, workout_count')
    .gte('date', weekAgo.toISOString().split('T')[0]);

  if (error) {
    logger.error('generateWeeklyStats failed to fetch stats', error);
    return;
  }

  const byUser = new Map<string, { volume: number; sets: number; workouts: number }>();
  for (const row of data || []) {
    const entry = byUser.get(row.user_id) || { volume: 0, sets: 0, workouts: 0 };
    entry.volume += row.total_volume || 0;
    entry.sets += row.total_sets || 0;
    entry.workouts += row.workout_count || 0;
    byUser.set(row.user_id, entry);
  }

  for (const [userId, stats] of byUser) {
    if (stats.workouts === 0) continue;
    try {
      const tokens = await pushTokenService.getTokensForUsers([userId]);
      if (tokens.length === 0) continue;
      const workoutsLabel = stats.workouts === 1 ? 'entrenamiento' : 'entrenamientos';
      await sendPushNotification(
        tokens,
        'Resumen semanal',
        `${stats.workouts} ${workoutsLabel}, ${stats.sets} series, ${Math.round(stats.volume)}kg de volumen. ¡Sigue así!`,
        { type: 'weekly_recap' }
      );
    } catch (err) {
      logger.error(`Failed to send weekly recap push to user ${userId}`, err);
    }
  }

  logger.info(`Weekly stats computed for ${byUser.size} users`);
};
