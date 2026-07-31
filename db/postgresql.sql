-- PostgreSQL production schema
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  display_name VARCHAR(80) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS calendar_days (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_date DATE NOT NULL,
  is_class_day BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (user_id, plan_date)
);

CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_date DATE NOT NULL,
  title VARCHAR(160) NOT NULL,
  starts_at TIME NOT NULL,
  ends_at TIME,
  activity_type VARCHAR(20) NOT NULL CHECK (activity_type IN ('class', 'fixed', 'free')),
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  mood VARCHAR(20),
  experience TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS activities_user_date_idx ON activities(user_id, plan_date);

-- Compact synchronized state used by the current family planner UI.
CREATE TABLE IF NOT EXISTS user_plan_state (
  user_id TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
