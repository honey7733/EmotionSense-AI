-- Create alert_logs table for tracking emergency alert events
-- This table logs all emergency notifications sent to emergency contacts
-- Created: 2024-11-11
--
-- NOTE: This migration uses auth.users (Supabase built-in) as the foreign key
-- If you have a custom users table, modify the foreign key constraint below
-- 
-- TROUBLESHOOTING:
-- Error "relation \"users\" does not exist"?
-- → Use auth.users instead (what we do here)
-- → OR use a custom users table if you have one
-- → OR remove the foreign key if using a different user ID format

CREATE TABLE IF NOT EXISTS alert_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  contact_email TEXT NOT NULL,
  alert_type TEXT NOT NULL DEFAULT 'emotional_distress',
  message_excerpt TEXT,
  additional_data JSONB DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint to auth.users (Supabase built-in users table)
-- This references the Supabase auth schema instead of a custom users table
ALTER TABLE alert_logs 
ADD CONSTRAINT fk_alert_logs_user_id 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_alert_logs_user_id ON alert_logs(user_id);

-- Create index on created_at for sorting by recency
CREATE INDEX IF NOT EXISTS idx_alert_logs_created_at ON alert_logs(created_at DESC);

-- Create index on user_id + created_at for efficient range queries
CREATE INDEX IF NOT EXISTS idx_alert_logs_user_created ON alert_logs(user_id, created_at DESC);

-- Add comment to table
COMMENT ON TABLE alert_logs IS 'Audit trail for emergency alert notifications sent to emergency contacts';
COMMENT ON COLUMN alert_logs.id IS 'Unique identifier for this alert log entry';
COMMENT ON COLUMN alert_logs.user_id IS 'User who triggered the alert (foreign key to users table)';
COMMENT ON COLUMN alert_logs.contact_email IS 'Email address of the emergency contact that was alerted';
COMMENT ON COLUMN alert_logs.alert_type IS 'Type of alert (e.g., emotional_distress, self_harm, suicide_risk)';
COMMENT ON COLUMN alert_logs.message_excerpt IS 'First 1000 characters of the message that triggered the alert';
COMMENT ON COLUMN alert_logs.additional_data IS 'Additional JSON data about the alert (risk_level, detected_emotion, etc.)';
COMMENT ON COLUMN alert_logs.created_at IS 'Timestamp when the alert was sent';
COMMENT ON COLUMN alert_logs.updated_at IS 'Timestamp of last update';

-- Enable Row Level Security (RLS) for security
ALTER TABLE alert_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own alert logs
CREATE POLICY "Users can view their own alert logs" ON alert_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Service role can insert alert logs (for backend service)
CREATE POLICY "Service role can insert alert logs" ON alert_logs
  FOR INSERT
  WITH CHECK (true);

-- Policy: Users can view their own alert history
CREATE POLICY "Users can query their alert history" ON alert_logs
  FOR SELECT
  USING (user_id = auth.uid());

-- Create a view for recent alerts (last 24 hours)
CREATE OR REPLACE VIEW recent_alerts_24h AS
  SELECT 
    id,
    user_id,
    contact_email,
    alert_type,
    message_excerpt,
    created_at
  FROM alert_logs
  WHERE created_at > NOW() - INTERVAL '24 hours'
  ORDER BY created_at DESC;

-- Create a view for alert statistics
CREATE OR REPLACE VIEW alert_statistics AS
  SELECT 
    user_id,
    COUNT(*) as total_alerts,
    COUNT(DISTINCT contact_email) as unique_contacts_alerted,
    MAX(created_at) as last_alert_time,
    COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as alerts_last_24h,
    COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as alerts_last_7days
  FROM alert_logs
  GROUP BY user_id;
