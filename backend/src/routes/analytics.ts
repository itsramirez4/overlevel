import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { analyticsController } from '../controllers/analyticsController';

const router = express.Router();

router.use(authMiddleware);
router.get('/summary', analyticsController.summary);
router.get('/volume-history', analyticsController.volumeHistory);
router.get('/muscle-distribution', analyticsController.muscleDistribution);
router.get('/exercise/:id', analyticsController.exerciseStats);

export default router;
