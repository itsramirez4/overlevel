-- battleService.applyDamage() used to read hp_current, subtract damage in
-- JS, then write the result back — a classic lost-update race: two sets
-- logged close together (e.g. a fast-paced superset) can both read the same
-- hp_current, and whichever write lands second overwrites the first's
-- damage instead of stacking with it.
--
-- Moving the arithmetic into the UPDATE statement itself makes it atomic:
-- within one SET clause, every right-hand-side expression reads the same
-- pre-update row, and the row lock held for the statement's duration means
-- a concurrent UPDATE on the same battle simply waits its turn instead of
-- racing. WHERE defeated = false doubles as the same one-way ratchet
-- applyDamage already relied on (a defeated battle never takes more damage).
--
-- Returns NULL (no row matched) if the battle was already defeated by a
-- concurrent hit between the caller's getOrCreate() and this call — the
-- caller re-fetches the battle's current state in that case rather than
-- treating it as a failure.
CREATE OR REPLACE FUNCTION apply_battle_damage(
  p_battle_id UUID,
  p_damage INTEGER
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_battle JSONB;
BEGIN
  UPDATE exercise_battles
  SET hp_current = GREATEST(hp_current - p_damage, 0),
      defeated = (hp_current - p_damage) <= 0,
      defeated_at = CASE WHEN (hp_current - p_damage) <= 0 THEN now() ELSE defeated_at END,
      updated_at = now()
  WHERE id = p_battle_id AND defeated = false
  RETURNING to_jsonb(exercise_battles.*) INTO v_battle;

  RETURN v_battle;
END;
$$;
