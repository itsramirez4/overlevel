-- Two independent fixes to this view, both discovered while touching it:
--
-- 1. total_volume was a plain SUM(weight * reps), which is always NULL for
--    a cardio set (weight/reps are NULL by design for those — see
--    setService.log). That NULL fed characterService.computeStats'
--    "resistencia" stat and analyticsService.getExerciseStats/
--    getTrainedExercises, so a user who only does cardio showed 0 volume
--    everywhere downstream of this view even though the same session
--    correctly earned XP and dealt battle damage (those go through
--    calculateSetEffort, which is category-aware). Mirrors that same
--    cardio formula (distance_km * 100, rounded to 2 decimals) here.
--
-- 2. Migration 014 excluded warmup sets from every aggregate here via
--    `AND s.is_warmup = false` on the join (and on the max_reps_at_max_weight
--    subquery). Migration 026's CREATE OR REPLACE VIEW — rewritten to add
--    cardio columns — silently dropped both, so every warmup set has been
--    counting toward max_weight/estimated_1rm/total_volume/set_count/avg_rpe
--    since then. Restored here.
--
-- Rebuilt from migration 026's version (not 008's/014's — 026 is the most
-- recent full redefinition, with category/max_distance_km/total_distance_km/
-- total_duration_seconds already added), keeping every column in the exact
-- same order: CREATE OR REPLACE VIEW errors with "cannot drop columns from
-- view" if any existing column is missing or reordered.
CREATE OR REPLACE VIEW user_exercise_stats AS
SELECT
  e.id AS exercise_id,
  e.user_id,
  e.name,
  MAX(s.weight) AS max_weight,
  (SELECT reps FROM sets WHERE exercise_id = e.id AND weight = MAX(s.weight) AND is_warmup = false ORDER BY created_at DESC LIMIT 1) AS max_reps_at_max_weight,
  ROUND(MAX(s.weight) * (1 + COALESCE(AVG(s.reps), 1) / 30.0)::numeric, 2) AS estimated_1rm,
  SUM(
    CASE WHEN e.category = 'cardio' THEN ROUND(COALESCE(s.distance_km, 0) * 100, 2)
         ELSE s.weight * s.reps END
  ) AS total_volume,
  COUNT(s.id) AS set_count,
  ROUND(AVG(s.rpe)::numeric, 1) AS avg_rpe,
  MAX(w.completed_at) AS last_workout_date,
  e.category,
  MAX(s.distance_km) AS max_distance_km,
  SUM(s.distance_km) AS total_distance_km,
  SUM(s.duration_seconds) AS total_duration_seconds
FROM exercises e
LEFT JOIN sets s ON e.id = s.exercise_id AND s.is_warmup = false
LEFT JOIN workouts w ON s.workout_id = w.id
GROUP BY e.id, e.user_id, e.name, e.category;
