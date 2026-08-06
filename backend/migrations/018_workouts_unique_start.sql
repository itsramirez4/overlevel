-- Prevents duplicate workouts from a re-submitted or concurrently-running
-- import (the Hevy importer already checks in-memory, but that can't catch
-- two overlapping requests racing each other — this makes it impossible at
-- the database level instead).
ALTER TABLE workouts ADD CONSTRAINT workouts_user_started_at_unique UNIQUE (user_id, started_at);
