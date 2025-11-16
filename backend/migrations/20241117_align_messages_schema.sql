-- Align chat message persistence schema with new messages table structure
-- This migration is idempotent and can be re-run safely.

-- Step 1: Rename legacy chat_messages table to messages when needed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'chat_messages'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'messages'
  ) THEN
    ALTER TABLE public.chat_messages RENAME TO messages;
  END IF;
END $$;

-- Step 2: Ensure expected columns exist with consistent naming
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'message'
  ) THEN
    ALTER TABLE public.messages RENAME COLUMN message TO content;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'emotion_detected'
  ) THEN
    ALTER TABLE public.messages RENAME COLUMN emotion_detected TO emotion;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'confidence_score'
  ) THEN
    ALTER TABLE public.messages RENAME COLUMN confidence_score TO emotion_confidence;
  END IF;
END $$;

ALTER TABLE IF EXISTS public.messages
  ADD COLUMN IF NOT EXISTS emotion TEXT,
  ADD COLUMN IF NOT EXISTS emotion_confidence NUMERIC,
  ADD COLUMN IF NOT EXISTS audio_url TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Step 3: Normalise metadata defaults and nullability
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'messages'
  ) THEN
    UPDATE public.messages
    SET metadata = '{}'::jsonb
    WHERE metadata IS NULL;
  END IF;
END $$;

ALTER TABLE IF EXISTS public.messages
  ALTER COLUMN metadata SET DEFAULT '{}'::jsonb,
  ALTER COLUMN metadata SET NOT NULL;

-- Step 4: Recreate supporting indexes using the new table name
DROP INDEX IF EXISTS idx_chat_messages_session_id;
DROP INDEX IF EXISTS idx_chat_messages_user_id;
DROP INDEX IF EXISTS idx_chat_messages_created_at;
DROP INDEX IF EXISTS idx_chat_messages_metadata;

CREATE INDEX IF NOT EXISTS idx_messages_session_id ON public.messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON public.messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_metadata ON public.messages USING gin(metadata);

-- Step 5: Refresh row level security policies to reference the messages table
ALTER TABLE IF EXISTS public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their chat messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view their messages" ON public.messages;
CREATE POLICY "Users can view their messages"
  ON public.messages FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their chat messages" ON public.messages;
DROP POLICY IF EXISTS "Users can insert their messages" ON public.messages;
CREATE POLICY "Users can insert their messages"
  ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their chat messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update their messages" ON public.messages;
CREATE POLICY "Users can update their messages"
  ON public.messages FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their chat messages" ON public.messages;
DROP POLICY IF EXISTS "Users can delete their messages" ON public.messages;
CREATE POLICY "Users can delete their messages"
  ON public.messages FOR DELETE
  USING (auth.uid() = user_id);

-- Step 6: Ensure trigger for updating session activity targets the new table
DROP TRIGGER IF EXISTS trg_refresh_chat_session_activity ON public.chat_messages;
DROP TRIGGER IF EXISTS trg_refresh_chat_session_activity ON public.messages;
CREATE TRIGGER trg_refresh_chat_session_activity
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.refresh_chat_session_activity();
