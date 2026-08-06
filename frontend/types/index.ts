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
  // Only set when this exercise came from starting a routine — the
  // per-exercise target that routine defined, if any.
  target_sets?: number;
  target_weight?: number;
  target_reps?: number;
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
  exercise?: Exercise;
}

export interface Routine {
  id: string;
  user_id: string;
  name: string;
  day_of_week?: string;
  pattern: 'fixed_day' | 'alternating_ab' | 'alternating_abc';
  is_active: boolean;
  notes?: string;
  exercises?: RoutineExercise[];
  created_at: string;
  updated_at: string;
}

export interface Set {
  id: string;
  workout_id: string;
  exercise_id: string;
  set_number: number;
  reps: number;
  weight: number;
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

export interface Workout {
  id: string;
  user_id: string;
  routine_id?: string;
  routine?: Routine;
  routines?: { name: string };
  title?: string;
  started_at: string;
  completed_at?: string;
  duration_minutes?: number;
  felt_like?: 'terrible' | 'bad' | 'ok' | 'good' | 'amazing';
  notes?: string;
  sets?: Set[];
  created_at: string;
  // Only present in the response to PUT /workouts/:id/complete, and only
  // when the user has a character — the RPG layer is fully optional.
  xp_award?: { xpGained: number; leveledUp: boolean; previousLevel: number; newLevel: number };
}
