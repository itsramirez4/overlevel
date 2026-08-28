import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

/**
 * Authenticates GitHub Actions' scheduled calls to /api/internal/cron/* — a
 * shared secret in a header, not a user JWT, since nothing about these calls
 * is tied to a logged-in user. timingSafeEqual (not ===) so the secret can't
 * be brute-forced a character at a time via response-time differences.
 */
export const cronAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const provided = req.headers['x-cron-secret'];
  const expected = process.env.CRON_SECRET;

  if (!expected || typeof provided !== 'string') {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid cron secret' });
  }

  const providedBuf = Buffer.from(provided);
  const expectedBuf = Buffer.from(expected);
  if (providedBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(providedBuf, expectedBuf)) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid cron secret' });
  }

  next();
};
