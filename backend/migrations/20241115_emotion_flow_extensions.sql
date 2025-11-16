-- Daily emotion summary enhancements
ALTER TABLE daily_emotion_summary
  ADD COLUMN IF NOT EXISTS mood_score DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS emotion_flow JSONB,
  ADD COLUMN IF NOT EXISTS ejournal_entry TEXT,
  ADD COLUMN IF NOT EXISTS segment_summary JSONB;

-- Weekly emotion summary enhancements
ALTER TABLE weekly_emotion_summary
  ADD COLUMN IF NOT EXISTS weekly_arc JSONB,
  ADD COLUMN IF NOT EXISTS weekly_moment_flow JSONB,
  ADD COLUMN IF NOT EXISTS weekly_reflection TEXT;

-- Emotion flow segment table
CREATE TABLE IF NOT EXISTS emotion_flow_segments (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  segment TEXT NOT NULL,
  dominant_emotion TEXT,
  intensity DOUBLE PRECISION,
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS emotion_flow_segments_user_date_segment_idx
  ON emotion_flow_segments (user_id, date, segment);
  
