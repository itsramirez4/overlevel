import { Request, Response } from 'express';
import { generateDailyReport } from '../jobs/generateDailyReport';
import { generateWeeklyStats } from '../jobs/generateWeeklyStats';
import { cleanupRefreshTokens } from '../jobs/cleanupRefreshTokens';
import { logger } from '../utils/logger';

/**
 * Same job functions node-cron calls in-process (cronService.ts) — this is
 * just a second way to invoke them, for a host whose free tier sleeps when
 * idle (Render) and so can't be trusted to have a live process sitting
 * around waiting for an in-process timer to fire. A GitHub Actions
 * schedule hits these instead, which also happens to wake the service up.
 */
export class InternalCronController {
  async dailyReport(req: Request, res: Response) {
    logger.info('Running generateDailyReport (triggered externally)');
    await generateDailyReport();
    res.status(204).send();
  }

  async weeklyStats(req: Request, res: Response) {
    logger.info('Running generateWeeklyStats (triggered externally)');
    await generateWeeklyStats();
    res.status(204).send();
  }

  async cleanupTokens(req: Request, res: Response) {
    logger.info('Running cleanupRefreshTokens (triggered externally)');
    await cleanupRefreshTokens();
    res.status(204).send();
  }
}

export const internalCronController = new InternalCronController();
