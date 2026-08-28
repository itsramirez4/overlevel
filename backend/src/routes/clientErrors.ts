import express from 'express';
import { validateBody } from '../middleware/validation';
import { clientErrorSchema } from '../utils/validators';
import { clientErrorController } from '../controllers/clientErrorController';

const router = express.Router();

router.post('/', validateBody(clientErrorSchema), clientErrorController.report);

export default router;
