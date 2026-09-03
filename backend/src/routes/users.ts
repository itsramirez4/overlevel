import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimiter';
import { validateBody } from '../middleware/validation';
import { changePasswordSchema, importHevySchema, logMeasurementSchema, updateUserSchema } from '../utils/validators';
import { userController } from '../controllers/userController';

const router = express.Router();

router.use(authMiddleware);
router.get('/me', userController.me);
router.put('/me', validateBody(updateUserSchema), userController.update);
router.get('/me/body-weight-history', userController.bodyWeightHistory);
router.get('/me/measurements', userController.listMeasurements);
router.post('/me/measurements', validateBody(logMeasurementSchema), userController.logMeasurement);
router.delete('/me/measurements/:measurementId', userController.removeMeasurement);
// Verifies current_password against the real account password — same
// brute-force exposure as login, so it needs the same strict limiter
// instead of the generous default every other authenticated route gets.
router.put('/me/password', authRateLimiter, validateBody(changePasswordSchema), userController.changePassword);
router.get('/me/export', userController.exportData);
router.get('/me/feed', userController.feed);
router.post('/me/import/hevy', validateBody(importHevySchema), userController.importHevy);

// Social — /search must stay before /:id, or a request for /search would
// itself get captured as `id: "search"` by the param route below.
router.get('/search', userController.search);
router.get('/:id', userController.publicProfile);
router.get('/:id/character', userController.publicCharacter);
router.get('/:id/workouts', userController.publicWorkouts);
router.get('/:id/workouts/:workoutId', userController.publicWorkoutDetail);
router.get('/:id/followers', userController.followers);
router.get('/:id/following', userController.following);
router.post('/:id/follow', userController.follow);
router.delete('/:id/follow', userController.unfollow);

export default router;
