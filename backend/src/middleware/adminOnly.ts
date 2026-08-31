import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { isAdmin } from '../utils/admin';

export const adminOnlyMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!isAdmin(req.userId!)) {
    return res.status(403).json({ error: 'FORBIDDEN', message: 'Admin only' });
  }
  next();
};
