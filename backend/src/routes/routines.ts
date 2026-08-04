import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import {
  createRoutineSchema,
  updateRoutineSchema,
  addRoutineExerciseSchema,
  reorderRoutineExercisesSchema,
} from '../utils/validators';
import { routineController } from '../controllers/routineController';

const router = express.Router();

router.use(authMiddleware);
router.get('/', routineController.list);
router.get('/:id', routineController.get);
router.post('/', validateBody(createRoutineSchema), routineController.create);
router.put('/:id', validateBody(updateRoutineSchema), routineController.update);
router.delete('/:id', routineController.remove);
router.post('/:id/exercises', validateBody(addRoutineExerciseSchema), routineController.addExercise);
router.put(
  '/:id/exercises/reorder',
  validateBody(reorderRoutineExercisesSchema),
  routineController.reorderExercises
);
router.delete('/:id/exercises/:routineExerciseId', routineController.removeExercise);

export default router;
