-- Create notifications table for in-app real-time notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- Flexible: validated at application level
  title VARCHAR(255) NOT NULL,
  message TEXT,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

-- Create index for fetching unread notifications efficiently
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- Create index for organization-based queries
CREATE INDEX idx_notifications_org ON notifications(organization_id, created_at DESC);

-- Create index for user + organization queries (most common access pattern)
CREATE INDEX idx_notifications_user_org ON notifications(user_id, organization_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see their own notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role can insert notifications (for backend service)
CREATE POLICY "Service role can insert notifications"
  ON notifications
  FOR INSERT
  WITH CHECK (true);

-- Service role can do everything
CREATE POLICY "Service role has full access"
  ON notifications
  FOR ALL
  USING (auth.role() = 'service_role');

-- Add comment for documentation
COMMENT ON TABLE notifications IS 'In-app real-time notifications for users';
COMMENT ON COLUMN notifications.type IS 'Notification type: task_assigned, order_status_changed, quote_received, etc.';
COMMENT ON COLUMN notifications.data IS 'Additional context data (task_id, order_id, etc.) as JSONB';
