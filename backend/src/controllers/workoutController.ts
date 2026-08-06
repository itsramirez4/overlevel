import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { workoutService } from '../services/workoutService';

export class WorkoutController {
  async list(req: AuthRequest, res: Response) {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const workouts = await workoutService.list(req.userId!, limit);
    res.json(workouts);
  }

  async get(req: AuthRequest, res: Response) {
    const workout = await workoutService.getById(req.params.id, req.userId!);
    res.json(workout);
  }

  async start(req: AuthRequest, res: Response) {
    const workout = await workoutService.start(req.userId!, req.body.routine_id);
    res.status(201).json(workout);
  }

  async complete(req: AuthRequest, res: Response) {
    const workout = await workoutService.complete(req.params.id, req.userId!, req.body);
    res.json(workout);
  }

  async update(req: AuthRequest, res: Response) {
    const workout = await workoutService.update(req.params.id, req.userId!, req.body);
    res.json(workout);
  }

  async remove(req: AuthRequest, res: Response) {
    await workoutService.remove(req.params.id, req.userId!);
    res.status(204).send();
  }
}

export const workoutController = new WorkoutController();
