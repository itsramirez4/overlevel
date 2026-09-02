export interface User {
  id: string;
  email: string;
  username: string;
  full_name?: string;
  bio?: string;
  avatar_url?: string;
  weight_unit: 'kg' | 'lbs';
  distance_unit: 'km' | 'mi';
  body_weight?: number;
  profile_public: boolean;
  created_at: string;
  updated_at: string;
  // Computed server-side (see backend/src/utils/admin.ts), not stored —
  // absent/false for everyone except accounts listed in ADMIN_USER_IDS.
  is_admin?: boolean;
}

export interface Exercise {
  id: string;
  user_id: string;
  name: string;
  category: 'compound' | 'isolation' | 'cardio';
  muscle_groups: string[];
  equipment: string[];
  notes?: string;
  is_custom: boolean;
  created_at: string;
  // Set only on trashed exercises (GET /exercises/trash) — null/absent means active.
  deleted_at?: string | null;
  // Only set when this exercise came from starting a routine — the
  // per-exercise target that routine defined, if any.
  target_sets?: number;
  target_weight?: number;
  target_reps?: number;
  // Per-exercise unit override — unset means "use the user's global preference".
  weight_unit?: 'kg' | 'lbs';
  distance_unit?: 'km' | 'mi';
  // Only present from GET /exercises?scope=all — who created it, for
  // attribution when it's not yours (exercises are shared across users).
  users?: { username: string };
}

export interface PublicUser {
  id: string;
  username: string;
  full_name?: string;
  character_type?: CharacterType | null;
}

export interface PublicProfile extends PublicUser {
  bio?: string;
  profile_public: boolean;
  created_at: string;
  followers_count: number;
  following_count: number;
  is_following: boolean;
  is_self: boolean;
}

export interface RoutineExercise {
  id: string;
  routine_id: string;
  exercise_id: string;
  order_num: number;
  target_sets?: number;
  target_weight?: number;
  target_reps?: number;
  notes?: string;
  // Key is `exercises` (not `exercise`) because Supabase/PostgREST embeds a
  // joined row under the target table's name.
  exercises?: Exercise;
}

export interface Routine {
  id: string;
  user_id: string;
  name: string;
  day_of_week?: string;
  pattern: 'fixed_day' | 'alternating_ab' | 'alternating_abc';
  is_active: boolean;
  notes?: string;
  routine_exercises?: RoutineExercise[];
  created_at: string;
  updated_at: string;
  // Set only on trashed routines (GET /routines/trash) — null/absent means active.
  deleted_at?: string | null;
}

export interface Set {
  id: string;
  workout_id: string;
  exercise_id: string;
  set_number: number;
  // Strength exercises set these; cardio exercises set duration_seconds/distance_km instead.
  reps?: number;
  weight?: number;
  duration_seconds?: number;
  distance_km?: number;
  rpe?: number;
  rest_seconds?: number;
  tempo?: string;
  form_notes?: string;
  is_pr: boolean;
  is_warmup: boolean;
  superset_group?: string;
  created_at: string;
  // Only present in the response to POST /sets (not on stored/fetched sets).
  battle?: ExerciseBattle;
  // Present when the set is fetched embedded with its exercise (workout
  // detail, sets-for-workout) — same embed-key convention as RoutineExercise.
  exercises?: Exercise;
}

export type CharacterType = 'powerlifter' | 'bodybuilder' | 'crossfitter' | 'calisthenics' | 'fracasado';

export interface CharacterTypeDef {
  id: CharacterType;
  name: string;
  tagline: string;
  description: string;
}

export interface Character {
  id: string;
  user_id: string;
  character_type: CharacterType;
  name: string;
  level: number;
  xp: number;
  xp_for_current_level: number;
  xp_for_next_level: number;
  progress: number;
  stats: {
    fuerza: number;
    resistencia: number;
    constancia: number;
  };
  type_info?: CharacterTypeDef;
  created_at: string;
}

export interface ExerciseBattle {
  id: string;
  workout_id: string;
  exercise_id: string;
  user_id: string;
  hp_max: number;
  hp_current: number;
  defeated: boolean;
  defeated_at: string | null;
}

export interface WorkoutExerciseNote {
  id: string;
  workout_id: string;
  exercise_id: string;
  user_id: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Workout {
  id: string;
  user_id: string;
  routine_id?: string;
  routine?: Routine;
  routines?: { name: string };
  // These three are nullable TEXT columns — an unset one comes back as a
  // real `null`, not a missing key, so `| null` here isn't optional detail:
  // code that treats "unset" as only `undefined` (e.g. a naive `?? default`)
  // misses the null case and can round-trip it back to the API unexpectedly.
  title?: string | null;
  started_at: string;
  completed_at?: string;
  duration_minutes?: number;
  felt_like?: 'terrible' | 'bad' | 'ok' | 'good' | 'amazing' | null;
  notes?: string | null;
  sets?: Set[];
  created_at: string;
  // Only present in the response to PUT /workouts/:id/complete, and only
  // when the user has a character — the RPG layer is fully optional.
  xp_award?: { xpGained: number; leveledUp: boolean; previousLevel: number; newLevel: number };
}
