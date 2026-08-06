import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { setService } from '../services/setService';

export class SetController {
  async listByWorkout(req: AuthRequest, res: Response) {
    const sets = await setService.listByWorkout(req.params.workoutId, req.userId!);
    res.json(sets);
  }

  async lastSession(req: AuthRequest, res: Response) {
    const excludeWorkoutId = req.query.excludeWorkoutId as string | undefined;
    const session = await setService.getLastSession(req.params.exerciseId, req.userId!, excludeWorkoutId);
    res.json(session);
  }

  async log(req: AuthRequest, res: Response) {
    const set = await setService.log(req.userId!, req.body);
    res.status(201).json(set);
  }

  async update(req: AuthRequest, res: Response) {
    const set = await setService.update(req.params.id, req.userId!, req.body);
    res.json(set);
  }

  async remove(req: AuthRequest, res: Response) {
    await setService.remove(req.params.id, req.userId!);
    res.status(204).send();
  }
}

export const setController = new SetController();
