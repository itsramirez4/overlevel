import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { battleController } from '../controllers/battleController';

const router = express.Router();

router.use(authMiddleware);
router.get('/workout/:workoutId', battleController.listForWorkout);

export default router;
