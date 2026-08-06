import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { createCharacterSchema } from '../utils/validators';
import { characterController } from '../controllers/characterController';

const router = express.Router();

router.use(authMiddleware);
router.get('/types', characterController.types);
router.get('/me', characterController.getMine);
router.post('/', validateBody(createCharacterSchema), characterController.create);
router.put('/me', validateBody(createCharacterSchema), characterController.changeType);

export default router;
