import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { changePasswordSchema, importHevySchema, updateUserSchema } from '../utils/validators';
import { userController } from '../controllers/userController';

const router = express.Router();

router.use(authMiddleware);
router.get('/me', userController.me);
router.put('/me', validateBody(updateUserSchema), userController.update);
router.get('/me/body-weight-history', userController.bodyWeightHistory);
router.put('/me/password', validateBody(changePasswordSchema), userController.changePassword);
router.get('/me/export', userController.exportData);
router.post('/me/import/hevy', validateBody(importHevySchema), userController.importHevy);

export default router;
