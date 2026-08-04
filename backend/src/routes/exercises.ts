import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { createExerciseSchema, updateExerciseSchema } from '../utils/validators';
import { exerciseController } from '../controllers/exerciseController';

const router = express.Router();

router.use(authMiddleware);
router.get('/', exerciseController.list);
router.get('/:id', exerciseController.get);
router.post('/', validateBody(createExerciseSchema), exerciseController.create);
router.put('/:id', validateBody(updateExerciseSchema), exerciseController.update);
router.delete('/:id', exerciseController.remove);

export default router;
