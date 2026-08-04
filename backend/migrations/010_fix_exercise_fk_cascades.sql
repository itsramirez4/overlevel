-- routine_exercises.exercise_id and sets.exercise_id were created without
-- ON DELETE CASCADE, so deleting a user (which cascades to their exercises)
-- fails with a foreign key violation whenever those exercises are still
-- referenced by a routine or a logged set. Re-create both constraints with
-- ON DELETE CASCADE to match 002/003's user_id cascades.

ALTER TABLE routine_exercises DROP CONSTRAINT routine_exercises_exercise_id_fkey;
ALTER TABLE routine_exercises
  ADD CONSTRAINT routine_exercises_exercise_id_fkey
  FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE;

ALTER TABLE sets DROP CONSTRAINT sets_exercise_id_fkey;
ALTER TABLE sets
  ADD CONSTRAINT sets_exercise_id_fkey
  FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE;
