-- Every table so far has had zero database-level access control: the API
-- relies entirely on supabaseAdmin (the service-role key) plus each service
-- method remembering its own `.eq('user_id', userId)` filter. One forgotten
-- filter in any future endpoint is a full cross-user data leak or mutation,
-- with nothing at the database layer to catch it.
--
-- The service-role key bypasses RLS entirely (that's what makes it a service
-- key), so none of this changes how the backend itself behaves — every
-- existing supabaseAdmin.from(...) call keeps working exactly as before.
-- What this adds is a backstop: if the anon/authenticated Supabase key
-- (`supabase`, currently only used for supabase.auth.signInWithPassword) is
-- ever used to query a table directly — by a future feature, a debugging
-- session, or a bug — these policies are what stands between that and a
-- cross-user leak instead of nothing.
--
-- Policies key off auth.uid(), which for a request made with the anon key
-- plus a Supabase Auth JWT resolves to the same id used as `users.id` /
-- every table's `user_id` (see authController: `id: data.user.id`).

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_select_own ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY users_update_own ON users FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
-- No insert/delete policy: profile rows are only ever created by the backend
-- (service role, on first login) and never deleted by user action.

ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY exercises_all_own ON exercises FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE routines ENABLE ROW LEVEL SECURITY;
CREATE POLICY routines_all_own ON routines FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- routine_exercises and sets have no user_id column of their own — ownership
-- is inherited through the routine/workout they belong to.
ALTER TABLE routine_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY routine_exercises_all_own ON routine_exercises FOR ALL
  USING (EXISTS (
    SELECT 1 FROM routines WHERE routines.id = routine_exercises.routine_id AND routines.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM routines WHERE routines.id = routine_exercises.routine_id AND routines.user_id = auth.uid()
  ));

ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY workouts_all_own ON workouts FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY sets_all_own ON sets FOR ALL
  USING (EXISTS (
    SELECT 1 FROM workouts WHERE workouts.id = sets.workout_id AND workouts.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM workouts WHERE workouts.id = sets.workout_id AND workouts.user_id = auth.uid()
  ));

ALTER TABLE workout_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY workout_stats_select_own ON workout_stats FOR SELECT USING (auth.uid() = user_id);
-- No write policy: only the daily cron (service role) writes this table.

ALTER TABLE body_weight_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY body_weight_logs_all_own ON body_weight_logs FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
CREATE POLICY characters_all_own ON characters FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE exercise_battles ENABLE ROW LEVEL SECURITY;
CREATE POLICY exercise_battles_all_own ON exercise_battles FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- refresh_tokens: no policies at all — only the backend (service role) ever
-- reads or writes this table, so RLS with zero policies denies every
-- authenticated/anon-key access outright, which is exactly what we want.
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY follows_select_involved ON follows FOR SELECT
  USING (auth.uid() = follower_id OR auth.uid() = followed_id);
CREATE POLICY follows_insert_own ON follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);
CREATE POLICY follows_delete_own ON follows FOR DELETE
  USING (auth.uid() = follower_id);
