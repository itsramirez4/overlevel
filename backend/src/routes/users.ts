import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimiter';
import { validateBody } from '../middleware/validation';
import { changePasswordSchema, importHevySchema, updateUserSchema } from '../utils/validators';
import { userController } from '../controllers/userController';

const router = express.Router();

router.use(authMiddleware);
router.get('/me', userController.me);
router.put('/me', validateBody(updateUserSchema), userController.update);
router.get('/me/body-weight-history', userController.bodyWeightHistory);
// Verifies current_password against the real account password — same
// brute-force exposure as login, so it needs the same strict limiter
// instead of the generous default every other authenticated route gets.
router.put('/me/password', authRateLimiter, validateBody(changePasswordSchema), userController.changePassword);
router.get('/me/export', userController.exportData);
router.post('/me/import/hevy', validateBody(importHevySchema), userController.importHevy);

// Social — /search must stay before /:id, or a request for /search would
// itself get captured as `id: "search"` by the param route below.
router.get('/search', userController.search);
router.get('/:id', userController.publicProfile);
router.get('/:id/workouts', userController.publicWorkouts);
router.get('/:id/followers', userController.followers);
router.get('/:id/following', userController.following);
router.post('/:id/follow', userController.follow);
router.delete('/:id/follow', userController.unfollow);

export default router;
