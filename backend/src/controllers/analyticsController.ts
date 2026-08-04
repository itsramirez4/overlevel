import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { analyticsService } from '../services/analyticsService';

export class AnalyticsController {
  async summary(req: AuthRequest, res: Response) {
    const summary = await analyticsService.getSummary(req.userId!);
    res.json(summary);
  }

  async exerciseStats(req: AuthRequest, res: Response) {
    const stats = await analyticsService.getExerciseStats(req.params.id, req.userId!);
    res.json(stats);
  }

  async volumeHistory(req: AuthRequest, res: Response) {
    const weeks = req.query.weeks ? parseInt(req.query.weeks as string) : 8;
    const history = await analyticsService.getWeeklyVolumeHistory(req.userId!, weeks);
    res.json(history);
  }
}

export const analyticsController = new AnalyticsController();
