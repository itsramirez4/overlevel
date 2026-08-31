import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { adminOnlyMiddleware } from '../middleware/adminOnly';
import { validateBody } from '../middleware/validation';
import { createExerciseSchema, mergeExerciseSchema, updateExerciseSchema } from '../utils/validators';
import { exerciseController } from '../controllers/exerciseController';

const router = express.Router();

router.use(authMiddleware);
router.get('/', exerciseController.list);
router.get('/trash', exerciseController.listTrash);
router.get('/:id', exerciseController.get);
router.post('/', validateBody(createExerciseSchema), exerciseController.create);
router.put('/:id', validateBody(updateExerciseSchema), exerciseController.update);
router.delete('/:id', exerciseController.remove);
router.post('/:id/restore', exerciseController.restore);
router.delete('/:id/permanent', exerciseController.permanentlyDelete);
router.post('/:id/merge', adminOnlyMiddleware, validateBody(mergeExerciseSchema), exerciseController.merge);

export default router;
