-- Replaces the "claim-then-act + resume" idempotency workaround from
-- migration 029 with real atomicity: marking the workout complete, awarding
-- XP, and finishing battles now happen inside a single Postgres function
-- executed as one transaction. If anything in here fails, Postgres rolls the
-- whole thing back — completed_at is never left set with XP/battles
-- unresolved, so there's nothing left to "resume" and workouts.xp_awarded_at
-- (029) is no longer needed.
--
-- No SECURITY DEFINER: this runs as whatever role calls it. The backend only
-- ever calls it via the service-role client, which already bypasses RLS on
-- every table it touches here — same as every other query in the app (see
-- migration 030's comment) — so this doesn't change who can do what.
--
-- Raises a distinct message per failure case (WORKOUT_NOT_FOUND vs.
-- WORKOUT_ALREADY_COMPLETED) so workoutService.complete() can still return
-- the right HTTP status (404 vs. 400) instead of collapsing both into one.
CREATE OR REPLACE FUNCTION complete_workout(
  p_workout_id UUID,
  p_user_id UUID,
  p_title TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_felt_like TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_started_at TIMESTAMPTZ;
  v_existing_completed_at TIMESTAMPTZ;
  v_completed_at TIMESTAMPTZ := now();
  v_duration_minutes INTEGER;
  v_workout JSONB;
  v_character_id UUID;
  v_character_xp INTEGER;
  v_volume NUMERIC := 0;
  v_set_count INTEGER := 0;
  v_pr_count INTEGER := 0;
  v_xp_gained INTEGER;
  v_previous_level INTEGER;
  v_new_level INTEGER;
  v_new_xp INTEGER;
  v_xp_award JSONB := NULL;
BEGIN
  -- FOR UPDATE: locks the row for the rest of this transaction, so two
  -- concurrent complete() calls for the same workout serialize instead of
  -- both reading "not yet completed" and racing each other.
  SELECT started_at, completed_at INTO v_started_at, v_existing_completed_at
  FROM workouts
  WHERE id = p_workout_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'WORKOUT_NOT_FOUND';
  END IF;

  IF v_existing_completed_at IS NOT NULL THEN
    RAISE EXCEPTION 'WORKOUT_ALREADY_COMPLETED';
  END IF;

  v_duration_minutes := ROUND(EXTRACT(EPOCH FROM (v_completed_at - v_started_at)) / 60);

  -- COALESCE(param, column): only overwrites a field the caller actually
  -- passed, same partial-update semantics the old PostgREST .update() call
  -- had for these Zod-optional fields (never explicitly nullable, so a
  -- missing param and "leave it alone" are the same thing).
  UPDATE workouts
  SET completed_at = v_completed_at,
      duration_minutes = v_duration_minutes,
      title = COALESCE(p_title, title),
      notes = COALESCE(p_notes, notes),
      felt_like = COALESCE(p_felt_like, felt_like)
  WHERE id = p_workout_id
  RETURNING to_jsonb(workouts.*) INTO v_workout;

  -- The kill guarantee: whatever HP any battle from this workout has left,
  -- finish it off now. Only touches battles still marked undefeated.
  UPDATE exercise_battles
  SET hp_current = 0, defeated = true, defeated_at = v_completed_at, updated_at = v_completed_at
  WHERE workout_id = p_workout_id AND user_id = p_user_id AND defeated = false;

  -- XP is additive/optional — a no-op if the user never created a character.
  SELECT id, xp INTO v_character_id, v_character_xp
  FROM characters
  WHERE user_id = p_user_id;

  IF v_character_id IS NOT NULL THEN
    -- Mirrors characterService's sumEffort/computeWorkoutXp: cardio sets use
    -- distance*100 (scaled to the same order of magnitude as a strength
    -- set's weight*reps), strength/isolation sets use weight*reps; warmups
    -- don't count toward volume, set count, or PRs.
    SELECT
      COALESCE(SUM(
        CASE WHEN e.category = 'cardio' THEN ROUND(COALESCE(s.distance_km, 0) * 100, 2)
             ELSE COALESCE(s.weight, 0) * COALESCE(s.reps, 0) END
      ), 0),
      COUNT(*),
      COUNT(*) FILTER (WHERE s.is_pr)
    INTO v_volume, v_set_count, v_pr_count
    FROM sets s
    JOIN exercises e ON e.id = s.exercise_id
    WHERE s.workout_id = p_workout_id AND s.is_warmup = false;

    v_xp_gained := 10 + ROUND(v_volume / 50) + v_set_count * 2 + v_pr_count * 25;
    v_previous_level := FLOOR(1 + SQRT(v_character_xp::NUMERIC / 50));
    v_new_xp := v_character_xp + v_xp_gained;
    v_new_level := FLOOR(1 + SQRT(v_new_xp::NUMERIC / 50));

    UPDATE characters
    SET xp = v_new_xp, level = v_new_level, updated_at = v_completed_at
    WHERE id = v_character_id;

    v_xp_award := jsonb_build_object(
      'xpGained', v_xp_gained,
      'leveledUp', v_new_level > v_previous_level,
      'previousLevel', v_previous_level,
      'newLevel', v_new_level
    );
  END IF;

  RETURN jsonb_build_object('workout', v_workout, 'xp_award', v_xp_award);
END;
$$;

-- Superseded by this function's own transaction boundary — see the header
-- comment above.
ALTER TABLE workouts DROP COLUMN xp_awarded_at;
