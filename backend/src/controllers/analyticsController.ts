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

  async exerciseProgress(req: AuthRequest, res: Response) {
    const progress = await analyticsService.getExerciseProgressHistory(req.params.id, req.userId!);
    res.json(progress);
  }

  async personalRecords(req: AuthRequest, res: Response) {
    const records = await analyticsService.getPersonalRecords(req.userId!);
    res.json(records);
  }

  async volumeHistory(req: AuthRequest, res: Response) {
    const weeks = req.query.weeks ? parseInt(req.query.weeks as string) : 8;
    const history = await analyticsService.getWeeklyVolumeHistory(req.userId!, weeks);
    res.json(history);
  }

  async muscleDistribution(req: AuthRequest, res: Response) {
    const weeks = req.query.weeks ? parseInt(req.query.weeks as string) : 8;
    const distribution = await analyticsService.getMuscleGroupDistribution(req.userId!, weeks);
    res.json(distribution);
  }

  async heatmap(req: AuthRequest, res: Response) {
    const weeks = req.query.weeks ? parseInt(req.query.weeks as string) : 10;
    const heatmap = await analyticsService.getWorkoutHeatmap(req.userId!, weeks);
    res.json(heatmap);
  }
}

export const analyticsController = new AnalyticsController();
