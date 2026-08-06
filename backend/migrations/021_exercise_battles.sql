-- Combat layer: one battle per (workout, exercise) pair. `defeated` is a
-- one-way ratchet — set true once and never reset by later edits/deletes to
-- the underlying sets, and force-finished at workout completion so every
-- battle a workout touches always ends in a kill regardless of how many
-- sets/reps were actually logged against it.
CREATE TABLE exercise_battles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hp_max INTEGER NOT NULL DEFAULT 100,
  hp_current INTEGER NOT NULL DEFAULT 100,
  defeated BOOLEAN NOT NULL DEFAULT false,
  defeated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  UNIQUE (workout_id, exercise_id)
);

CREATE INDEX idx_exercise_battles_workout_id ON exercise_battles(workout_id);
CREATE INDEX idx_exercise_battles_user_id ON exercise_battles(user_id);
