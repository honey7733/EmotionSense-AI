-- Create foundational chat tables for sessions and messages
-- Run this script inside Supabase SQL editor (or via psql) before using chat features

-- Ensure pgcrypto is available for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Chat sessions capture high level metadata for each conversation
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_title TEXT NOT NULL DEFAULT 'New Chat',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id
  ON public.chat_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at
  ON public.chat_sessions(updated_at DESC);

ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their chat sessions" ON public.chat_sessions;
CREATE POLICY "Users can view their chat sessions"
  ON public.chat_sessions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their chat sessions" ON public.chat_sessions;
CREATE POLICY "Users can insert their chat sessions"
  ON public.chat_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their chat sessions" ON public.chat_sessions;
CREATE POLICY "Users can update their chat sessions"
  ON public.chat_sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their chat sessions" ON public.chat_sessions;
CREATE POLICY "Users can delete their chat sessions"
  ON public.chat_sessions FOR DELETE
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  emotion TEXT,
  emotion_confidence NUMERIC,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  audio_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_messages_session_id
  ON public.messages(session_id);

CREATE INDEX IF NOT EXISTS idx_messages_user_id
  ON public.messages(user_id);

CREATE INDEX IF NOT EXISTS idx_messages_created_at
  ON public.messages(created_at);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their messages" ON public.messages;
CREATE POLICY "Users can view their messages"
  ON public.messages FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their messages" ON public.messages;
CREATE POLICY "Users can insert their messages"
  ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their messages" ON public.messages;
CREATE POLICY "Users can update their messages"
  ON public.messages FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their messages" ON public.messages;
CREATE POLICY "Users can delete their messages"
  ON public.messages FOR DELETE
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Automatically bump the session's updated_at timestamp when a message arrives
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.refresh_chat_session_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.chat_sessions
    SET updated_at = COALESCE(NEW.created_at, timezone('utc', now()))
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_refresh_chat_session_activity ON public.messages;
CREATE TRIGGER trg_refresh_chat_session_activity
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.refresh_chat_session_activity();
