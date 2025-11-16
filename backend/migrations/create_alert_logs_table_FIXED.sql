-- ============================================================================
-- ALERT_LOGS TABLE MIGRATION - SUPABASE COMPATIBLE
-- ============================================================================
-- Create alert_logs table for tracking emergency alert events
-- This table logs all emergency notifications sent to emergency contacts
-- Created: 2024-11-11
--
-- ⚠️ IMPORTANT: Choose ONE of the three options below based on your setup
-- ============================================================================

-- ============================================================================
-- ✅ OPTION 1: Using Supabase Built-in auth.users (RECOMMENDED)
-- ============================================================================
-- Use this if you're using Supabase Authentication (which auto-creates auth.users)

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

-- Add foreign key to Supabase auth.users table
ALTER TABLE alert_logs 
ADD CONSTRAINT fk_alert_logs_user_id 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- ============================================================================
-- ALTERNATIVE OPTION 2: Using Custom users Table
-- ============================================================================
-- If you have your own users table, comment out the above and uncomment this:
--
-- ALTER TABLE alert_logs 
-- ADD CONSTRAINT fk_alert_logs_user_id 
-- FOREIGN KEY (user_id) 
-- REFERENCES public.users(id) 
-- ON DELETE CASCADE;

-- ============================================================================
-- ALTERNATIVE OPTION 3: No Foreign Key (If user_id format is different)
-- ============================================================================
-- If you don't have a users table or use a different ID format, skip the FK:
-- (The above is already created without the constraint initially)

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_alert_logs_user_id ON alert_logs(user_id);

-- Create index on created_at for sorting by recency
CREATE INDEX IF NOT EXISTS idx_alert_logs_created_at ON alert_logs(created_at DESC);

-- Create index on user_id + created_at for efficient range queries
CREATE INDEX IF NOT EXISTS idx_alert_logs_user_created ON alert_logs(user_id, created_at DESC);

-- Create index on alert_type for filtering
CREATE INDEX IF NOT EXISTS idx_alert_logs_type ON alert_logs(alert_type);

-- ============================================================================
-- ADD TABLE AND COLUMN DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE alert_logs IS 'Audit trail for emergency alert notifications sent to emergency contacts';
COMMENT ON COLUMN alert_logs.id IS 'Unique identifier for this alert log entry';
COMMENT ON COLUMN alert_logs.user_id IS 'User who triggered the alert (FK to auth.users or custom users table)';
COMMENT ON COLUMN alert_logs.contact_email IS 'Email address of the emergency contact that was alerted';
COMMENT ON COLUMN alert_logs.alert_type IS 'Type of alert (e.g., emotional_distress, self_harm, suicide_risk)';
COMMENT ON COLUMN alert_logs.message_excerpt IS 'First 1000 characters of the message that triggered the alert';
COMMENT ON COLUMN alert_logs.additional_data IS 'Additional JSON data about the alert (risk_level, detected_emotion, etc.)';
COMMENT ON COLUMN alert_logs.created_at IS 'Timestamp when the alert was sent';
COMMENT ON COLUMN alert_logs.updated_at IS 'Timestamp of last update';

-- ============================================================================
-- ENABLE ROW-LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE alert_logs ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view their own alert logs
CREATE POLICY "Users can view their own alert logs" ON alert_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy 2: Service role can insert alert logs (for backend)
CREATE POLICY "Service role can insert alert logs" ON alert_logs
  FOR INSERT
  WITH CHECK (true);

-- Policy 3: Users can view their alert history
CREATE POLICY "Users can query their alert history" ON alert_logs
  FOR SELECT
  USING (user_id = auth.uid());

-- ============================================================================
-- CREATE VIEWS FOR ANALYTICS
-- ============================================================================

-- View: Recent alerts from last 24 hours
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

-- View: Alert statistics per user
CREATE OR REPLACE VIEW alert_statistics AS
  SELECT 
    user_id,
    COUNT(*) as total_alerts,
    COUNT(DISTINCT contact_email) as unique_contacts_alerted,
    MAX(created_at) as last_alert_time,
    COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as alerts_last_24h,
    COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as alerts_last_7days,
    COUNT(CASE WHEN alert_type = 'emotional_distress' THEN 1 END) as emotional_distress_count
  FROM alert_logs
  GROUP BY user_id;

-- View: Top alert triggers (most common messages)
CREATE OR REPLACE VIEW alert_triggers_summary AS
  SELECT 
    message_excerpt,
    alert_type,
    COUNT(*) as trigger_count,
    COUNT(DISTINCT user_id) as affected_users,
    MAX(created_at) as last_triggered
  FROM alert_logs
  GROUP BY message_excerpt, alert_type
  ORDER BY trigger_count DESC;

-- ============================================================================
-- VERIFICATION QUERIES (Run after migration)
-- ============================================================================

-- Check if table was created
-- SELECT * FROM alert_logs LIMIT 0;

-- Check table structure
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'alert_logs';

-- Check indexes
-- SELECT * FROM pg_indexes WHERE tablename = 'alert_logs';

-- Check RLS policies
-- SELECT * FROM pg_policies WHERE tablename = 'alert_logs';

-- ============================================================================
-- TROUBLESHOOTING
-- ============================================================================

-- ❌ Error: "relation \"users\" does not exist"
-- ✅ Solution: Make sure to use auth.users (line with REFERENCES auth.users)
--    The auth.users table is automatically created by Supabase

-- ❌ Error: "Permission denied for schema auth"
-- ✅ Solution: Run this query as a service role (not anon role)

-- ❌ Table created but RLS prevents inserting
-- ✅ Solution: Make sure backend service role has insert permissions
--    Or adjust RLS policies for your use case

-- ❌ Foreign key constraint fails
-- ✅ Solution: Use Option 2 or 3 above if auth.users doesn't work

-- ============================================================================
