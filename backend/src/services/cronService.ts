import cron from 'node-cron';
import { generateDailyReport } from '../jobs/generateDailyReport';
import { generateWeeklyStats } from '../jobs/generateWeeklyStats';
import { logger } from '../utils/logger';

export const initCronJobs = () => {
  // Every day at 00:30
  cron.schedule('30 0 * * *', async () => {
    logger.info('Running generateDailyReport');
    await generateDailyReport();
  });

  // Every Monday at 01:00
  cron.schedule('0 1 * * 1', async () => {
    logger.info('Running generateWeeklyStats');
    await generateWeeklyStats();
  });
};
