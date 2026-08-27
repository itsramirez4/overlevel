import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

export const logSetSchema = z.object({
  reps: z.number().int().positive(),
  weight: z.number().positive(),
  rpe: z.number().int().min(1).max(10).optional(),
  rest_seconds: z.number().int().nonnegative().optional(),
  tempo: z.string().optional(),
  form_notes: z.string().optional(),
});
