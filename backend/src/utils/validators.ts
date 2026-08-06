import { z } from 'zod';

export const updateUserSchema = z.object({
  full_name: z.string().max(100).optional(),
  bio: z.string().max(500).optional(),
  avatar_url: z.string().url().optional(),
  weight_unit: z.enum(['kg', 'lbs']).optional(),
  distance_unit: z.enum(['km', 'mi']).optional(),
  body_weight: z.number().positive().optional(),
  profile_public: z.boolean().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const createExerciseSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.enum(['compound', 'isolation', 'cardio']),
  muscle_groups: z.array(z.string()).optional(),
  equipment: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export const updateExerciseSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  category: z.enum(['compound', 'isolation', 'cardio']).optional(),
  muscle_groups: z.array(z.string()).optional(),
  equipment: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export const createRoutineSchema = z.object({
  name: z.string().min(1).max(100),
  day_of_week: z.string().optional(),
  pattern: z.enum(['fixed_day', 'alternating_ab', 'alternating_abc']).default('alternating_ab'),
  notes: z.string().optional(),
});

export const addRoutineExerciseSchema = z.object({
  exercise_id: z.string().uuid(),
  order_num: z.number().int().positive(),
  target_sets: z.number().int().positive().optional(),
  target_weight: z.number().positive().optional(),
  target_reps: z.number().int().positive().optional(),
  notes: z.string().optional(),
});

export const updateRoutineSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  day_of_week: z.string().optional(),
  pattern: z.enum(['fixed_day', 'alternating_ab', 'alternating_abc']).optional(),
  notes: z.string().optional(),
});

export const reorderRoutineExercisesSchema = z.object({
  order: z.array(z.string().uuid()).min(1),
});

export const logSetSchema = z.object({
  workout_id: z.string().uuid(),
  exercise_id: z.string().uuid(),
  set_number: z.number().int().positive(),
  reps: z.number().int().positive(),
  weight: z.number().positive(),
  rpe: z.number().int().min(1).max(10).optional(),
  rest_seconds: z.number().int().nonnegative().optional(),
  tempo: z.string().optional(),
  form_notes: z.string().optional(),
  is_warmup: z.boolean().optional(),
  superset_group: z.string().optional(),
});

export const updateSetSchema = z.object({
  reps: z.number().int().positive().optional(),
  weight: z.number().positive().optional(),
  rpe: z.number().int().min(1).max(10).optional(),
  rest_seconds: z.number().int().nonnegative().optional(),
  tempo: z.string().optional(),
  form_notes: z.string().optional(),
  is_warmup: z.boolean().optional(),
  superset_group: z.string().optional(),
});

export const changePasswordSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(6),
});

export const importHevySchema = z.object({
  csv: z.string().min(1),
});

export const updateWorkoutSchema = z.object({
  title: z.string().max(200).optional(),
  notes: z.string().optional(),
  felt_like: z.enum(['terrible', 'bad', 'ok', 'good', 'amazing']).optional(),
});

export const createCharacterSchema = z.object({
  character_type: z.enum(['powerlifter', 'bodybuilder', 'crossfitter', 'calisthenics', 'fracasado']),
});
