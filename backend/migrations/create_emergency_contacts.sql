-- Create emergency_contacts table for emergency contact information
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  notify_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create safety_alerts table for tracking high-risk messages and alerts sent
CREATE TABLE IF NOT EXISTS safety_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  emergency_contact_id UUID REFERENCES emergency_contacts(id) ON DELETE SET NULL,
  detected_emotion TEXT NOT NULL,
  message_text TEXT,
  alert_sent BOOLEAN DEFAULT FALSE,
  alert_sent_at TIMESTAMP,
  alert_response TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security (RLS) for emergency_contacts
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own emergency contacts
DROP POLICY IF EXISTS "Users can view their own emergency contacts" ON emergency_contacts;
CREATE POLICY "Users can view their own emergency contacts"
  ON emergency_contacts FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can only insert their own emergency contacts
DROP POLICY IF EXISTS "Users can insert their own emergency contacts" ON emergency_contacts;
CREATE POLICY "Users can insert their own emergency contacts"
  ON emergency_contacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can only update their own emergency contacts
DROP POLICY IF EXISTS "Users can update their own emergency contacts" ON emergency_contacts;
CREATE POLICY "Users can update their own emergency contacts"
  ON emergency_contacts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can only delete their own emergency contacts
DROP POLICY IF EXISTS "Users can delete their own emergency contacts" ON emergency_contacts;
CREATE POLICY "Users can delete their own emergency contacts"
  ON emergency_contacts FOR DELETE
  USING (auth.uid() = user_id);

-- Enable RLS for safety_alerts
ALTER TABLE safety_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own safety alerts
DROP POLICY IF EXISTS "Users can view their own safety alerts" ON safety_alerts;
CREATE POLICY "Users can view their own safety alerts"
  ON safety_alerts FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: System can insert safety alerts (for service role)
DROP POLICY IF EXISTS "Service can insert safety alerts" ON safety_alerts;
CREATE POLICY "Service can insert safety alerts"
  ON safety_alerts FOR INSERT
  WITH CHECK (true);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_user_id ON emergency_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_safety_alerts_user_id ON safety_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_safety_alerts_created_at ON safety_alerts(created_at);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_emergency_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_emergency_contacts_updated_at ON emergency_contacts;

CREATE TRIGGER trigger_update_emergency_contacts_updated_at
  BEFORE UPDATE ON emergency_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_emergency_contacts_updated_at();
