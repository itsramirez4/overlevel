-- Cardio exercises log duration + distance instead of weight + reps.
ALTER TABLE sets
  ALTER COLUMN reps DROP NOT NULL,
  ALTER COLUMN weight DROP NOT NULL,
  ADD COLUMN duration_seconds INTEGER,
  ADD COLUMN distance_km DECIMAL(6,2);

-- Re-created to surface category (so callers can tell strength stats from
-- cardio ones apart) plus cardio-specific aggregates. SUM/MAX already skip
-- NULLs, so a cardio exercise's weight-based columns (total_volume,
-- estimated_1rm, max_weight) come back NULL rather than garbage, and a
-- strength exercise's distance/duration columns do the same in reverse.
--
-- New columns are appended at the end, not inserted alongside the columns
-- they're conceptually related to (e.g. category next to name) — Postgres's
-- CREATE OR REPLACE VIEW only allows adding columns at the end; reordering
-- errors with "cannot change name of view column" because column position
-- is part of the view's identity.
CREATE OR REPLACE VIEW user_exercise_stats AS
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
  MAX(w.completed_at) AS last_workout_date,
  e.category,
  MAX(s.distance_km) AS max_distance_km,
  SUM(s.distance_km) AS total_distance_km,
  SUM(s.duration_seconds) AS total_duration_seconds
FROM exercises e
LEFT JOIN sets s ON e.id = s.exercise_id
LEFT JOIN workouts w ON s.workout_id = w.id
GROUP BY e.id, e.user_id, e.name, e.category;
