-- ============================================================================
-- COMPLIANCE DOCUMENTS STORAGE BUCKET
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'compliance-documents',
  'compliance-documents',
  false,
  10485760,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/tiff',
    'text/plain',
    'text/csv'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/tiff',
    'text/plain',
    'text/csv'
  ];

-- Storage RLS Policies
DROP POLICY IF EXISTS "Org members can read compliance documents" ON storage.objects;
DROP POLICY IF EXISTS "Org members can upload compliance documents" ON storage.objects;
DROP POLICY IF EXISTS "Org members can update compliance documents" ON storage.objects;
DROP POLICY IF EXISTS "Org admins can delete compliance documents" ON storage.objects;

CREATE POLICY "Org members can read compliance documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'compliance-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text 
    FROM organization_users 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Org members can upload compliance documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'compliance-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text 
    FROM organization_users 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Org members can update compliance documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'compliance-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text 
    FROM organization_users 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'compliance-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text 
    FROM organization_users 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Org admins can delete compliance documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'compliance-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT ou.organization_id::text 
    FROM organization_users ou
    JOIN roles r ON r.id = ou.role_id
    WHERE ou.user_id = auth.uid()
    AND r.name IN ('organization_admin', 'farm_manager', 'system_admin')
  )
);

-- ============================================================================
-- AUDIT REMINDERS TABLE (data only - logic handled in NestJS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certification_id UUID NOT NULL REFERENCES certifications(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('30_days', '14_days', '7_days', '1_day', 'overdue')),
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  notification_id UUID REFERENCES notifications(id),
  email_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(certification_id, reminder_type)
);

CREATE INDEX IF NOT EXISTS idx_audit_reminders_scheduled ON audit_reminders(scheduled_for) WHERE sent_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_audit_reminders_certification ON audit_reminders(certification_id);
CREATE INDEX IF NOT EXISTS idx_audit_reminders_org ON audit_reminders(organization_id);

ALTER TABLE audit_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their org audit reminders" ON audit_reminders;
CREATE POLICY "Users can view their org audit reminders"
ON audit_reminders FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Service role can manage audit reminders" ON audit_reminders;
CREATE POLICY "Service role can manage audit reminders"
ON audit_reminders FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- USER NOTIFICATION PREFERENCES (add columns for audit reminders)
-- ============================================================================

ALTER TABLE user_notification_preferences 
ADD COLUMN IF NOT EXISTS audit_reminders_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS audit_reminder_30d_before BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS audit_reminder_14d_before BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS audit_reminder_7d_before BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS audit_reminder_1d_before BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS certification_expiry_reminders BOOLEAN DEFAULT true;
