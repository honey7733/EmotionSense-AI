-- Daily Emotion Summary Table
CREATE TABLE IF NOT EXISTS public.daily_emotion_summary (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  date date NOT NULL,
  dominant_emotion text,
  emotion_distribution jsonb DEFAULT '{}'::jsonb,
  mood_score numeric,
  total_entries integer DEFAULT 0,
  time_segments jsonb DEFAULT '[]'::jsonb,
  trend_points jsonb DEFAULT '[]'::jsonb,
  compass_points jsonb DEFAULT '[]'::jsonb,
  key_moments jsonb,
  summary_text text,
  created_at timestamptz DEFAULT timezone('utc', now()),
  updated_at timestamptz DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX IF NOT EXISTS daily_emotion_summary_user_date_idx
  ON public.daily_emotion_summary (user_id, date);
