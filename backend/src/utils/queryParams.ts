import { AppError } from '../middleware/errorHandler';

/**
 * Bare `parseInt(req.query.x as string)` turns a non-numeric query param
 * into NaN, which then flows into date arithmetic or Postgrest range params
 * and surfaces as a generic 500 instead of a proper 400. Validates instead.
 */
export function parsePositiveIntParam(value: unknown, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = parseInt(value as string, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new AppError(`Invalid numeric query parameter: ${value}`, 400);
  }
  return parsed;
}
