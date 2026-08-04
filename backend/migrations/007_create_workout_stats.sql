CREATE TABLE workout_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_volume DECIMAL(10,2),
  total_sets INTEGER,
  total_reps INTEGER,
  avg_rpe DECIMAL(3,1),
  num_exercises INTEGER,
  workout_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, date)
);

CREATE INDEX idx_workout_stats_user_id ON workout_stats(user_id);
CREATE INDEX idx_workout_stats_date ON workout_stats(date);
