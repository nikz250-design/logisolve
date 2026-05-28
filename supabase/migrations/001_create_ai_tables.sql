-- ============================================================
-- Logisolve AI Infrastructure — Supabase Migration 001
-- Creates tables: ai_requests, ai_logs, ai_feedback
-- Run via: supabase db push OR supabase migration up
-- ============================================================

-- ── ai_requests: every API call ──────────────────────────────

CREATE TABLE IF NOT EXISTS ai_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id         TEXT,
  provider        TEXT NOT NULL DEFAULT 'anthropic',
  model           TEXT NOT NULL,
  action          TEXT NOT NULL,
  input_tokens    INTEGER NOT NULL DEFAULT 0,
  output_tokens   INTEGER NOT NULL DEFAULT 0,
  duration_ms     INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL CHECK (status IN ('success', 'error', 'cancelled')),
  error_message   TEXT,
  metadata        JSONB,
  request_id      TEXT -- provider-assigned ID (e.g. Anthropic msg_xxx)
);

-- Index for daily cost queries per user
CREATE INDEX idx_ai_requests_user_date
  ON ai_requests (user_id, created_at DESC);

-- Index for status filtering
CREATE INDEX idx_ai_requests_status
  ON ai_requests (status, created_at DESC);

-- ── ai_logs: general operational logs ────────────────────────

CREATE TABLE IF NOT EXISTS ai_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  level       TEXT NOT NULL CHECK (level IN ('info', 'warn', 'error')),
  action      TEXT NOT NULL,
  user_id     TEXT,
  request_id  UUID REFERENCES ai_requests(id) ON DELETE SET NULL,
  message     TEXT,
  data        JSONB
);

CREATE INDEX idx_ai_logs_level_date
  ON ai_logs (level, created_at DESC);

-- ── ai_feedback: user ratings on AI responses ────────────────

CREATE TABLE IF NOT EXISTS ai_feedback (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  request_id  UUID REFERENCES ai_requests(id) ON DELETE CASCADE,
  user_id     TEXT,
  rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  context     JSONB -- optional: what was shown to the user
);

CREATE INDEX idx_ai_feedback_rating
  ON ai_feedback (rating, created_at DESC);

-- ── Row Level Security (RLS) ──────────────────────────────────
-- Enable after integrating Supabase Auth

-- ALTER TABLE ai_requests ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE ai_logs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;

-- Example RLS policy (uncomment when auth is ready):
-- CREATE POLICY "Users see own requests" ON ai_requests
--   FOR SELECT USING (auth.uid()::text = user_id);

-- ── Daily usage view ──────────────────────────────────────────

CREATE OR REPLACE VIEW ai_daily_usage AS
SELECT
  user_id,
  DATE(created_at) AS day,
  COUNT(*) AS total_requests,
  SUM(input_tokens + output_tokens) AS total_tokens,
  SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) AS error_count,
  ROUND(AVG(duration_ms)) AS avg_duration_ms
FROM ai_requests
GROUP BY user_id, DATE(created_at)
ORDER BY day DESC;

-- ── Comments ──────────────────────────────────────────────────

COMMENT ON TABLE ai_requests IS 'Every Anthropic API call — cost tracking and audit';
COMMENT ON TABLE ai_logs IS 'Operational logs from AI middleware';
COMMENT ON TABLE ai_feedback IS 'User ratings on AI-generated responses';
COMMENT ON VIEW ai_daily_usage IS 'Aggregated daily token usage per user';
