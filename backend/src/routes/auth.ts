import express from 'express';
import { loginSchema } from '../utils/validators';
import { validateBody } from '../middleware/validation';
import { authController } from '../controllers/authController';

const router = express.Router();

router.post('/login', validateBody(loginSchema), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

export default router;
