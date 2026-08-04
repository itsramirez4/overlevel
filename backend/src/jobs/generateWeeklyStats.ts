import { supabaseAdmin } from '../config/supabase';
import { logger } from '../utils/logger';

/** Logs a weekly volume/training-frequency summary per user for observability. */
export const generateWeeklyStats = async () => {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { data, error } = await supabaseAdmin
    .from('workout_stats')
    .select('user_id, total_volume, total_sets, workout_count')
    .gte('date', weekAgo.toISOString().split('T')[0]);

  if (error) {
    logger.error('generateWeeklyStats failed to fetch stats', error);
    return;
  }

  logger.info(`Weekly stats computed for ${new Set((data || []).map(d => d.user_id)).size} users`);
};
