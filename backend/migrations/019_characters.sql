-- RPG layer: one predefined character per user. Stats stay derived live from
-- workouts/sets (same pattern as analytics), only level/xp are persisted
-- since those accumulate over time rather than being computable on demand.
CREATE TABLE characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  character_type TEXT NOT NULL CHECK (character_type IN ('powerlifter', 'bodybuilder', 'crossfitter', 'calisthenics')),
  name TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_characters_user_id ON characters(user_id);
