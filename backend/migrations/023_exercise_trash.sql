-- Soft-delete for exercises: "deleting" one now just marks it, instead of
-- hard-deleting it and cascading away every set/routine slot/battle that
-- references it (previously irreversible - migrations 010 and 021 made
-- those foreign keys ON DELETE CASCADE precisely so the row itself carries
-- that history, which is exactly what a real delete used to destroy).
ALTER TABLE exercises ADD COLUMN deleted_at TIMESTAMPTZ;

CREATE INDEX idx_exercises_deleted_at ON exercises(user_id, deleted_at);

-- The original UNIQUE(user_id, name) blocked creating a new exercise with
-- the same name as one sitting in the trash. Replaced with a partial
-- index so only ACTIVE exercises need unique names per user - a trashed
-- one's name no longer collides with a new (or restored) exercise.
ALTER TABLE exercises DROP CONSTRAINT exercises_user_id_name_key;
CREATE UNIQUE INDEX exercises_user_id_name_active_key ON exercises(user_id, name) WHERE deleted_at IS NULL;
