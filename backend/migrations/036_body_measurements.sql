-- Body weight already has its own history (body_weight_logs) — this is the
-- same idea for the other numbers a lifter tracks over time (waist, chest,
-- arms, thighs, hips, neck, body fat %). One row per measuring session; any
-- subset of columns can be filled in (someone might only measure their
-- waist today), so everything but user_id/logged_at is nullable.
CREATE TABLE body_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  waist_cm DECIMAL(5,2),
  chest_cm DECIMAL(5,2),
  hips_cm DECIMAL(5,2),
  bicep_cm DECIMAL(5,2),
  thigh_cm DECIMAL(5,2),
  neck_cm DECIMAL(5,2),
  body_fat_pct DECIMAL(4,2),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_body_measurements_user_id ON body_measurements(user_id);
CREATE INDEX idx_body_measurements_logged_at ON body_measurements(logged_at);

ALTER TABLE body_measurements ENABLE ROW LEVEL SECURITY;
CREATE POLICY body_measurements_all_own ON body_measurements FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
