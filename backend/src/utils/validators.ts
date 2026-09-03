import { z } from 'zod';

export const updateUserSchema = z.object({
  // Trimmed first so a whitespace-only value can't slip through .min(3).
  // Lowercase-only on the wire — search/lookup elsewhere compares as typed,
  // so a mixed-case username would silently fail to match its own display form.
  username: z
    .string()
    .trim()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_.]+$/, 'Solo minúsculas, números, puntos y guiones bajos')
    .optional(),
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

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const registerSchema = z.object({
  email: z.string().email(),
  // 8, not 6 — same OWASP/NIST-informed minimum as changePasswordSchema.
  password: z.string().min(8),
});

export const confirmEmailSchema = z.object({
  access_token: z.string().min(1),
});

export const resetPasswordSchema = z.object({
  access_token: z.string().min(1),
  new_password: z.string().min(6),
});

export const clientErrorSchema = z.object({
  message: z.string().min(1).max(2000),
  stack: z.string().max(10000).optional(),
  componentStack: z.string().max(10000).optional(),
  context: z.string().max(200).optional(),
});

export const createExerciseSchema = z.object({
  // .min(1) alone would let "   " through — trim first so a whitespace-only
  // name (or one with stray leading/trailing spaces) can't slip in.
  name: z.string().trim().min(1).max(100),
  category: z.enum(['compound', 'isolation', 'cardio']),
  muscle_groups: z.array(z.string()).optional(),
  equipment: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export const updateExerciseSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  category: z.enum(['compound', 'isolation', 'cardio']).optional(),
  muscle_groups: z.array(z.string()).optional(),
  equipment: z.array(z.string()).optional(),
  notes: z.string().optional(),
  // Per-exercise unit override, e.g. logging curls in lbs while squats stay
  // in kg — null explicitly clears the override back to the user's global
  // preference (undefined just means "not part of this update").
  weight_unit: z.enum(['kg', 'lbs']).nullable().optional(),
  distance_unit: z.enum(['km', 'mi']).nullable().optional(),
});

export const mergeExerciseSchema = z.object({
  into: z.string().uuid(),
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
  // target_sets stays positive — a target of 0 sets isn't a real target.
  // target_weight/target_reps are nonnegative like their logged-set
  // counterparts: a 0 weight target (bodyweight exercise) is real.
  target_sets: z.number().int().positive().optional(),
  target_weight: z.number().nonnegative().optional(),
  target_reps: z.number().int().nonnegative().optional(),
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

// reps/weight vs duration_seconds/distance_km are both optional here — which
// pair is actually required depends on the exercise's category (strength vs
// cardio), which setService looks up and enforces; Zod only checks shape/range.
export const logSetSchema = z.object({
  workout_id: z.string().uuid(),
  exercise_id: z.string().uuid(),
  set_number: z.number().int().positive(),
  // nonnegative, not positive: 0 reps (a failed attempt) and 0 weight
  // (bodyweight-only, or an unloaded bar) are both real, loggable sets.
  reps: z.number().int().nonnegative().optional(),
  weight: z.number().nonnegative().optional(),
  // Same reasoning as reps/weight: 0 distance (stationary/no-distance
  // cardio) and 0 duration are both real values, not "missing".
  duration_seconds: z.number().int().nonnegative().optional(),
  distance_km: z.number().nonnegative().optional(),
  rpe: z.number().int().min(1).max(10).optional(),
  rest_seconds: z.number().int().nonnegative().optional(),
  tempo: z.string().optional(),
  form_notes: z.string().optional(),
  is_warmup: z.boolean().optional(),
  superset_group: z.string().optional(),
});

export const updateSetSchema = z.object({
  // nonnegative, not positive: 0 reps (a failed attempt) and 0 weight
  // (bodyweight-only, or an unloaded bar) are both real, loggable sets.
  reps: z.number().int().nonnegative().optional(),
  weight: z.number().nonnegative().optional(),
  duration_seconds: z.number().int().nonnegative().optional(),
  distance_km: z.number().nonnegative().optional(),
  rpe: z.number().int().min(1).max(10).optional(),
  rest_seconds: z.number().int().nonnegative().optional(),
  tempo: z.string().optional(),
  form_notes: z.string().optional(),
  is_warmup: z.boolean().optional(),
  superset_group: z.string().optional(),
});

export const changePasswordSchema = z.object({
  current_password: z.string().min(1),
  // 8, not 6 — current OWASP/NIST guidance favors a longer minimum over
  // complexity rules, and 6 is short enough to be within easy brute-force
  // range if the rate limiter were ever bypassed or misconfigured.
  new_password: z.string().min(8),
});

export const importHevySchema = z.object({
  // 5MB of CSV text — generous for even a multi-year export, well under the
  // global 10MB JSON body limit (index.ts), and small enough that a
  // maximal-size upload can't tie up importService's fully sequential
  // per-row inserts for an unbounded amount of time.
  csv: z.string().min(1).max(5_000_000),
});

export const updateWorkoutSchema = z.object({
  title: z.string().max(200).optional(),
  notes: z.string().optional(),
  felt_like: z.enum(['terrible', 'bad', 'ok', 'good', 'amazing']).optional(),
  // For logging a workout after the fact and correcting which day it
  // actually happened on — workoutService.update() enforces it can't be
  // future-dated or land after completed_at.
  started_at: z.string().datetime().optional(),
});

// Same allowed fields as updateWorkoutSchema — completing a workout can
// also set how it felt / notes, but must never touch user_id, routine_id,
// started_at, etc. via mass assignment.
export const completeWorkoutSchema = updateWorkoutSchema;

export const startWorkoutSchema = z.object({
  routine_id: z.string().uuid().optional(),
});

// The whole-exercise note (distinct from a single set's form_notes) — empty
// string is a valid value, meaning "clear it" (see workoutExerciseNoteService.set).
export const setWorkoutExerciseNoteSchema = z.object({
  notes: z.string().max(2000),
});

// All optional (a session might only measure a couple of things), but at
// least one has to be present — an entry with nothing filled in isn't a
// measurement.
export const logMeasurementSchema = z
  .object({
    waist_cm: z.number().positive().optional(),
    chest_cm: z.number().positive().optional(),
    hips_cm: z.number().positive().optional(),
    bicep_cm: z.number().positive().optional(),
    thigh_cm: z.number().positive().optional(),
    neck_cm: z.number().positive().optional(),
    body_fat_pct: z.number().positive().max(100).optional(),
  })
  .refine((v) => Object.values(v).some((n) => n !== undefined), {
    message: 'Introduce al menos una medida',
  });

export const createCharacterSchema = z.object({
  character_type: z.enum(['powerlifter', 'bodybuilder', 'crossfitter', 'calisthenics', 'fracasado']),
});
