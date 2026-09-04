-- One row per device that has granted push permission and registered its
-- Expo push token. A user can have several (phone + tablet); a token is
-- unique across the whole table (not per user) because re-registering the
-- same device under a different account must stop the OLD account from
-- being pushed to on it — upserting on token, not (user_id, token), is what
-- makes that reassignment work (see pushTokenService.register()).
CREATE TABLE push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  platform TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_push_tokens_user_id ON push_tokens(user_id);

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY push_tokens_all_own ON push_tokens FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
