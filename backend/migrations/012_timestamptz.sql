-- All TIMESTAMP columns were created without a time zone, so PostgREST
-- returns naive strings like "2026-08-04T09:21:35.878" with no UTC/offset
-- marker. JavaScript's `new Date(...)` then parses that as local time
-- instead of UTC, throwing every date/time display off by the client's
-- UTC offset (e.g. the in-workout session timer read 2h+ instead of a few
-- minutes). The values are already stored as UTC instants, so converting
-- with `AT TIME ZONE 'UTC'` reinterprets them correctly without shifting
-- the underlying instant.

-- user_exercise_stats reads workouts.completed_at, which blocks ALTER COLUMN
-- TYPE on that column until the view is dropped; recreated at the end.
DROP VIEW user_exercise_stats;

ALTER TABLE users
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE exercises
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

ALTER TABLE routines
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE routine_exercises
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

ALTER TABLE workouts
  ALTER COLUMN started_at TYPE TIMESTAMPTZ USING started_at AT TIME ZONE 'UTC',
  ALTER COLUMN completed_at TYPE TIMESTAMPTZ USING completed_at AT TIME ZONE 'UTC',
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

ALTER TABLE sets
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

ALTER TABLE workout_stats
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

CREATE VIEW user_exercise_stats AS
SELECT
  e.id AS exercise_id,
  e.user_id,
  e.name,
  MAX(s.weight) AS max_weight,
  (SELECT reps FROM sets WHERE exercise_id = e.id AND weight = MAX(s.weight) ORDER BY created_at DESC LIMIT 1) AS max_reps_at_max_weight,
  ROUND(MAX(s.weight) * (1 + COALESCE(AVG(s.reps), 1) / 30.0)::numeric, 2) AS estimated_1rm,
  SUM(s.weight * s.reps) AS total_volume,
  COUNT(s.id) AS set_count,
  ROUND(AVG(s.rpe)::numeric, 1) AS avg_rpe,
  MAX(w.completed_at) AS last_workout_date
FROM exercises e
LEFT JOIN sets s ON e.id = s.exercise_id
LEFT JOIN workouts w ON s.workout_id = w.id
GROUP BY e.id, e.user_id, e.name;
