import cron from 'node-cron';
import { generateDailyReport } from '../jobs/generateDailyReport';
import { generateWeeklyStats } from '../jobs/generateWeeklyStats';
import { cleanupRefreshTokens } from '../jobs/cleanupRefreshTokens';
import { logger } from '../utils/logger';

/** Returns the scheduled tasks so callers can .stop() them on shutdown —
 * otherwise a graceful-shutdown handler has no way to stop a job that's
 * mid-run or about to fire while the process is exiting. */
export const initCronJobs = () => {
  const dailyReport = cron.schedule('30 0 * * *', async () => {
    logger.info('Running generateDailyReport');
    await generateDailyReport();
  });

  const weeklyStats = cron.schedule('0 1 * * 1', async () => {
    logger.info('Running generateWeeklyStats');
    await generateWeeklyStats();
  });

  const tokenCleanup = cron.schedule('0 2 * * *', async () => {
    logger.info('Running cleanupRefreshTokens');
    await cleanupRefreshTokens();
  });

  return [dailyReport, weeklyStats, tokenCleanup];
};
