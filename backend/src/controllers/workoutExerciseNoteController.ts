import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { workoutExerciseNoteService } from '../services/workoutExerciseNoteService';

export class WorkoutExerciseNoteController {
  async listForWorkout(req: AuthRequest, res: Response) {
    const notes = await workoutExerciseNoteService.getForWorkout(req.params.workoutId, req.userId!);
    res.json(notes);
  }

  async set(req: AuthRequest, res: Response) {
    const note = await workoutExerciseNoteService.set(
      req.params.workoutId,
      req.params.exerciseId,
      req.userId!,
      req.body.notes
    );
    res.json(note);
  }
}

export const workoutExerciseNoteController = new WorkoutExerciseNoteController();
