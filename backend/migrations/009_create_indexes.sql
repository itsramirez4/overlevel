CREATE INDEX idx_sets_user_exercise ON sets(workout_id, exercise_id);
CREATE INDEX idx_workouts_user_created ON workouts(user_id, created_at DESC);
CREATE INDEX idx_routine_exercises_order ON routine_exercises(routine_id, order_num);
