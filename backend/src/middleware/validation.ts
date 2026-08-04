import { ZodSchema } from 'zod';
import { Request, Response, NextFunction } from 'express';

export const validateBody = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.body);
      req.body = validated;
      next();
    } catch (error: any) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: error.errors?.[0]?.message || 'Validation failed',
        details: error.errors,
      });
    }
  };
};
