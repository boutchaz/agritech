-- Task reminders tracking table
CREATE TABLE IF NOT EXISTS task_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('due_soon', 'due_today', 'overdue_1d', 'overdue_3d')),
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  notification_id UUID REFERENCES notifications(id),
  email_sent BOOLEAN DEFAULT false,
  push_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_task_reminders_scheduled ON task_reminders(scheduled_for) WHERE sent_at IS NULL;
CREATE INDEX idx_task_reminders_task ON task_reminders(task_id);
CREATE INDEX idx_task_reminders_type ON task_reminders(reminder_type);

-- User notification preferences
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  task_reminders_enabled BOOLEAN DEFAULT true,
  task_reminder_1d_before BOOLEAN DEFAULT true,
  task_reminder_on_due_date BOOLEAN DEFAULT true,
  task_overdue_alerts BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, organization_id)
);

-- RLS Policies
ALTER TABLE task_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their task reminders"
  ON task_reminders FOR SELECT
  USING (
    task_id IN (
      SELECT t.id FROM tasks t
      INNER JOIN organization_users ou ON ou.organization_id = t.organization_id
      WHERE ou.user_id = auth.uid() AND ou.is_active = true
    )
  );

CREATE POLICY "Users can manage their notification preferences"
  ON user_notification_preferences FOR ALL
  USING (user_id = auth.uid());

-- Comments
COMMENT ON TABLE task_reminders IS 'Tracks scheduled and sent task reminders';
COMMENT ON TABLE user_notification_preferences IS 'User preferences for notification delivery';
