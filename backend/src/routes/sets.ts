import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { logSetSchema, updateSetSchema } from '../utils/validators';
import { setController } from '../controllers/setController';

const router = express.Router();

router.use(authMiddleware);
router.get('/workout/:workoutId', setController.listByWorkout);
router.get('/exercise/:exerciseId/last-session', setController.lastSession);
router.post('/', validateBody(logSetSchema), setController.log);
router.put('/:id', validateBody(updateSetSchema), setController.update);
router.delete('/:id', setController.remove);

export default router;
