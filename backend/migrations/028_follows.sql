-- Social graph: who follows whom. Visibility itself is governed by
-- users.profile_public (added back in 001) — this table only tracks the
-- relationship, not who's allowed to see what; that's checked at query time
-- in userService.assertViewable so a user going private doesn't require
-- touching existing follow rows.
CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followed_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(follower_id, followed_id),
  CHECK (follower_id != followed_id)
);

CREATE INDEX idx_follows_follower_id ON follows(follower_id);
CREATE INDEX idx_follows_followed_id ON follows(followed_id);
