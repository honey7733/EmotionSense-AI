-- Weekly Emotion Summary Table
CREATE TABLE IF NOT EXISTS public.weekly_emotion_summary (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  week_start date NOT NULL,
  week_end date NOT NULL,
  dominant_emotion text,
  weekly_arc jsonb DEFAULT '[]'::jsonb,
  average_mood_score numeric,
  key_highlights jsonb DEFAULT '[]'::jsonb,
  weekly_summary_text text,
  created_at timestamptz DEFAULT timezone('utc', now()),
  updated_at timestamptz DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX IF NOT EXISTS weekly_emotion_summary_user_week_idx
  ON public.weekly_emotion_summary (user_id, week_start, week_end);
