import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { completeWorkoutSchema, startWorkoutSchema, updateWorkoutSchema } from '../utils/validators';
import { workoutController } from '../controllers/workoutController';

const router = express.Router();

router.use(authMiddleware);
router.get('/', workoutController.list);
router.get('/:id', workoutController.get);
router.post('/', validateBody(startWorkoutSchema), workoutController.start);
router.put('/:id/complete', validateBody(completeWorkoutSchema), workoutController.complete);
router.put('/:id', validateBody(updateWorkoutSchema), workoutController.update);
router.delete('/:id', workoutController.remove);

export default router;
