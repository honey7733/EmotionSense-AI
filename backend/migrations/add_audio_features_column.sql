-- Migration to add audio_features column to emotion_analysis table
-- This handles the case where the column doesn't exist in the database

-- Add audio_features column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'emotion_analysis' 
    AND column_name = 'audio_features'
  ) THEN
    ALTER TABLE emotion_analysis 
    ADD COLUMN audio_features JSONB;
    
    RAISE NOTICE 'Added audio_features column to emotion_analysis table';
  ELSE
    RAISE NOTICE 'audio_features column already exists in emotion_analysis table';
  END IF;
END $$;

-- Create index on audio_features for better query performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_emotion_analysis_audio_features 
ON emotion_analysis USING GIN (audio_features);

-- Verify the column exists
SELECT 
  column_name, 
  data_type, 
  is_nullable 
FROM information_schema.columns 
WHERE table_name = 'emotion_analysis' 
AND column_name = 'audio_features';
