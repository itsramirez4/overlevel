-- Personal-records lookups filter sets by is_pr = true (see
-- analyticsService.getPersonalRecords), run on every visit to that screen.
-- is_pr is true for only a small fraction of rows, so a partial index keeps
-- this fast without the overhead of indexing every set.
CREATE INDEX idx_sets_is_pr ON sets(exercise_id, is_pr) WHERE is_pr = true;
