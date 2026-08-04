-- Replace the target rep range (target_reps_min/target_reps_max) with a
-- concrete target weight + rep count per set, matching how actual sets are
-- logged (weight × reps, not a range).

ALTER TABLE routine_exercises DROP COLUMN target_reps_min;
ALTER TABLE routine_exercises DROP COLUMN target_reps_max;
ALTER TABLE routine_exercises ADD COLUMN target_weight DECIMAL(7,2);
ALTER TABLE routine_exercises ADD COLUMN target_reps INTEGER;
