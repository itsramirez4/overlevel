CREATE TABLE sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL,
  reps INTEGER NOT NULL,
  weight DECIMAL(7,2) NOT NULL,
  rpe INTEGER CHECK (rpe >= 1 AND rpe <= 10),
  rest_seconds INTEGER,
  tempo TEXT,
  form_notes TEXT,
  is_pr BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sets_workout_id ON sets(workout_id);
CREATE INDEX idx_sets_exercise_id ON sets(exercise_id);
CREATE INDEX idx_sets_created_at ON sets(created_at);
