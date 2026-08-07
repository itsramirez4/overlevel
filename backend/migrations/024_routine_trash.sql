-- Same reasoning as migration 023 for exercises: "deleting" a routine now
-- just marks it, instead of hard-deleting it and cascading away its
-- routine_exercises rows (migration 004's ON DELETE CASCADE) permanently.
-- No UNIQUE(user_id, name) exists on routines (unlike exercises), so no
-- partial-index workaround is needed here.
ALTER TABLE routines ADD COLUMN deleted_at TIMESTAMPTZ;

CREATE INDEX idx_routines_deleted_at ON routines(user_id, deleted_at);
