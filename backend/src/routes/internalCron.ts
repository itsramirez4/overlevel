import express from 'express';
import { cronAuthMiddleware } from '../middleware/cronAuth';
import { internalCronController } from '../controllers/internalCronController';

const router = express.Router();

router.use(cronAuthMiddleware);
router.post('/daily-report', internalCronController.dailyReport);
router.post('/weekly-stats', internalCronController.weeklyStats);
router.post('/cleanup-tokens', internalCronController.cleanupTokens);

export default router;
