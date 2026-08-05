ALTER TABLE sets ADD COLUMN is_warmup BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE VIEW user_exercise_stats AS
SELECT
  e.id AS exercise_id,
  e.user_id,
  e.name,
  MAX(s.weight) AS max_weight,
  (SELECT reps FROM sets WHERE exercise_id = e.id AND weight = MAX(s.weight) AND is_warmup = false ORDER BY created_at DESC LIMIT 1) AS max_reps_at_max_weight,
  ROUND(MAX(s.weight) * (1 + COALESCE(AVG(s.reps), 1) / 30.0)::numeric, 2) AS estimated_1rm,
  SUM(s.weight * s.reps) AS total_volume,
  COUNT(s.id) AS set_count,
  ROUND(AVG(s.rpe)::numeric, 1) AS avg_rpe,
  MAX(w.completed_at) AS last_workout_date
FROM exercises e
LEFT JOIN sets s ON e.id = s.exercise_id AND s.is_warmup = false
LEFT JOIN workouts w ON s.workout_id = w.id
GROUP BY e.id, e.user_id, e.name;
