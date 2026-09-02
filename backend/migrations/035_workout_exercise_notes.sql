-- A second, separate kind of note from sets.form_notes: this one covers the
-- whole exercise within a workout ("how did this exercise go overall"),
-- not one specific set. One row per (workout, exercise), same shape as
-- exercise_battles, but created lazily by the note itself rather than by
-- logging a set — a note can exist before any set does.
CREATE TABLE workout_exercise_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notes TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  UNIQUE (workout_id, exercise_id)
);

CREATE INDEX idx_workout_exercise_notes_workout_id ON workout_exercise_notes(workout_id);

ALTER TABLE workout_exercise_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY workout_exercise_notes_all_own ON workout_exercise_notes FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
