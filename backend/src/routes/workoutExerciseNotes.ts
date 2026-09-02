import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { setWorkoutExerciseNoteSchema } from '../utils/validators';
import { workoutExerciseNoteController } from '../controllers/workoutExerciseNoteController';

const router = express.Router();

router.use(authMiddleware);
router.get('/workout/:workoutId', workoutExerciseNoteController.listForWorkout);
router.put('/:workoutId/:exerciseId', validateBody(setWorkoutExerciseNoteSchema), workoutExerciseNoteController.set);

export default router;
