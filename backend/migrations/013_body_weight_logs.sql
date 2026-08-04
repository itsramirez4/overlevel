-- users.body_weight only ever holds the current value. To chart progress
-- over time we need a history of every logged weigh-in.
CREATE TABLE body_weight_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weight DECIMAL(5,2) NOT NULL,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_body_weight_logs_user_id ON body_weight_logs(user_id);
CREATE INDEX idx_body_weight_logs_logged_at ON body_weight_logs(logged_at);
