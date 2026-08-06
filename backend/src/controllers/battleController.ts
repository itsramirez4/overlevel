import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { battleService } from '../services/battleService';

export class BattleController {
  async listForWorkout(req: AuthRequest, res: Response) {
    const battles = await battleService.getForWorkout(req.params.workoutId, req.userId!);
    res.json(battles);
  }
}

export const battleController = new BattleController();
