-- Refresh tokens were purely stateless JWTs: /auth/refresh always minted a
-- new pair without invalidating the old one, and /auth/logout never revoked
-- anything server-side (the frontend just cleared local storage). A leaked
-- refresh token stayed valid for its full 7-day lifetime no matter what the
-- legitimate user did — no logout, no re-login, nothing could kill it.
--
-- This table backs rotation + reuse detection: each refresh token gets a row
-- (hashed, never the raw token) that's marked revoked the moment it's used
-- to mint a new pair. A second use of an already-revoked token is a strong
-- signal of theft, not normal operation — that's the trigger to revoke
-- every token this user has outstanding, forcing a full re-login everywhere.
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
