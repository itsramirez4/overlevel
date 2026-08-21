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

export interface BodyWeightLog {
  id: string;
  user_id: string;
  weight: number;
  logged_at: string;
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
  // Per-exercise unit override — unset means "use the user's global preference".
  weight_unit?: 'kg' | 'lbs';
  distance_unit?: 'km' | 'mi';
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

export interface Workout {
  id: string;
  user_id: string;
  routine_id?: string;
  title?: string;
  started_at: string;
  completed_at?: string;
  duration_minutes?: number;
  felt_like?: 'terrible' | 'bad' | 'ok' | 'good' | 'amazing';
  notes?: string;
  sets?: Set[];
  routines?: { name: string };
  created_at: string;
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
}

export interface WorkoutStats {
  id: string;
  user_id: string;
  date: string;
  total_volume: number;
  total_sets: number;
  total_reps: number;
  avg_rpe?: number;
  num_exercises: number;
  workout_count: number;
}
