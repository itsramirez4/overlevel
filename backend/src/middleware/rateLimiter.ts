import rateLimit from 'express-rate-limit';
import { config } from '../config/env';

const message = {
  error: 'RATE_LIMITED',
  message: 'Too many requests, please try again later',
};

/** Strict — auth is the one place brute-force protection actually matters. */
export const authRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message,
});

/** Generous — everything else is already gated behind a valid JWT. */
export const apiRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.apiRateLimit.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message,
});
