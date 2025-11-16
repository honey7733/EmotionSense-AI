-- Add metadata column to legacy chat_messages table (if still present)
ALTER TABLE IF EXISTS public.chat_messages 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Ensure the new messages table also exposes metadata with a default
ALTER TABLE IF EXISTS public.messages 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Create index on metadata for faster queries if needed
CREATE INDEX IF NOT EXISTS idx_chat_messages_metadata 
ON public.chat_messages USING gin(metadata);

CREATE INDEX IF NOT EXISTS idx_messages_metadata 
ON public.messages USING gin(metadata);