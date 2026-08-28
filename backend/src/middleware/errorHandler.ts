import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { Sentry } from '../config/sentry';

export class AppError extends Error {
  constructor(public message: string, public statusCode: number = 500) {
    super(message);
  }
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error('Error:', err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: 'ERROR',
      message: err.message,
    });
  }

  // Body-parser (malformed JSON), and any other middleware/library that sets
  // its own 4xx status, was otherwise collapsed to a generic 500 — telling
  // a client to retry a request (as many do for 5xx but not 4xx) that will
  // never succeed, and misreporting the caller's mistake as a server failure.
  const status = typeof err?.statusCode === 'number' ? err.statusCode : typeof err?.status === 'number' ? err.status : 500;
  if (status >= 400 && status < 500) {
    return res.status(status).json({
      error: 'BAD_REQUEST',
      message: err?.message || 'Invalid request',
    });
  }

  // Only genuinely unexpected failures reach here — AppError and the 4xx
  // passthrough above both mean something already identified and handled
  // the situation, not a bug worth paging anyone about.
  Sentry.captureException(err);

  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: 'Something went wrong',
  });
};
