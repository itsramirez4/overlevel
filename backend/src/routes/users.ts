import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { updateUserSchema } from '../utils/validators';
import { userController } from '../controllers/userController';

const router = express.Router();

router.use(authMiddleware);
router.get('/me', userController.me);
router.put('/me', validateBody(updateUserSchema), userController.update);
router.get('/me/body-weight-history', userController.bodyWeightHistory);

export default router;
