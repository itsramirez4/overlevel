import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { workoutController } from '../controllers/workoutController';

const router = express.Router();

router.use(authMiddleware);
router.get('/', workoutController.list);
router.get('/:id', workoutController.get);
router.post('/', workoutController.start);
router.put('/:id/complete', workoutController.complete);
router.delete('/:id', workoutController.remove);

export default router;
