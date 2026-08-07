import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { routineService } from '../services/routineService';

export class RoutineController {
  async list(req: AuthRequest, res: Response) {
    const routines = await routineService.list(req.userId!);
    res.json(routines);
  }

  async get(req: AuthRequest, res: Response) {
    const routine = await routineService.getById(req.params.id, req.userId!);
    res.json(routine);
  }

  async create(req: AuthRequest, res: Response) {
    const routine = await routineService.create(req.userId!, req.body);
    res.status(201).json(routine);
  }

  async update(req: AuthRequest, res: Response) {
    const routine = await routineService.update(req.params.id, req.userId!, req.body);
    res.json(routine);
  }

  async remove(req: AuthRequest, res: Response) {
    await routineService.remove(req.params.id, req.userId!);
    res.status(204).send();
  }

  async listTrash(req: AuthRequest, res: Response) {
    const routines = await routineService.listTrash(req.userId!);
    res.json(routines);
  }

  async restore(req: AuthRequest, res: Response) {
    const routine = await routineService.restore(req.params.id, req.userId!);
    res.json(routine);
  }

  async permanentlyDelete(req: AuthRequest, res: Response) {
    await routineService.permanentlyDelete(req.params.id, req.userId!);
    res.status(204).send();
  }

  async addExercise(req: AuthRequest, res: Response) {
    const routineExercise = await routineService.addExercise(req.params.id, req.userId!, req.body);
    res.status(201).json(routineExercise);
  }

  async removeExercise(req: AuthRequest, res: Response) {
    await routineService.removeExercise(req.params.id, req.userId!, req.params.routineExerciseId);
    res.status(204).send();
  }

  async reorderExercises(req: AuthRequest, res: Response) {
    await routineService.reorderExercises(req.params.id, req.userId!, req.body.order);
    res.status(204).send();
  }
}

export const routineController = new RoutineController();
