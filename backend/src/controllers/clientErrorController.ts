import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { Sentry } from '../config/sentry';

export class ClientErrorController {
  /** No auth required — a crash can happen before login (or because of it),
   * so this can't depend on having a valid session. */
  async report(req: Request, res: Response) {
    const { message, stack, componentStack, context } = req.body;

    logger.error('Client error report', { message, stack, componentStack, context });

    if (stack) {
      const error = new Error(message);
      error.stack = stack;
      Sentry.captureException(error, { tags: { source: 'client' }, extra: { componentStack, context } });
    } else {
      Sentry.captureMessage(message, { tags: { source: 'client' }, extra: { context } });
    }

    res.status(204).send();
  }
}

export const clientErrorController = new ClientErrorController();
