import express from 'express';
import { forgotPasswordSchema, loginSchema, resetPasswordSchema } from '../utils/validators';
import { validateBody } from '../middleware/validation';
import { authController } from '../controllers/authController';

const router = express.Router();

router.post('/login', validateBody(loginSchema), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.post('/forgot-password', validateBody(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validateBody(resetPasswordSchema), authController.resetPassword);

export default router;
