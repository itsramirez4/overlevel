import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { exerciseService } from '../services/exerciseService';

export class ExerciseController {
  async list(req: AuthRequest, res: Response) {
    const exercises = await exerciseService.list(req.userId!);
    res.json(exercises);
  }

  async get(req: AuthRequest, res: Response) {
    const exercise = await exerciseService.getById(req.params.id, req.userId!);
    res.json(exercise);
  }

  async create(req: AuthRequest, res: Response) {
    const exercise = await exerciseService.create(req.userId!, req.body);
    res.status(201).json(exercise);
  }

  async update(req: AuthRequest, res: Response) {
    const exercise = await exerciseService.update(req.params.id, req.userId!, req.body);
    res.json(exercise);
  }

  async remove(req: AuthRequest, res: Response) {
    await exerciseService.remove(req.params.id, req.userId!);
    res.status(204).send();
  }
}

export const exerciseController = new ExerciseController();
