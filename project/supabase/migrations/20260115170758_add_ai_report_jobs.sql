-- AI Report Jobs table for async report generation
CREATE TABLE IF NOT EXISTS ai_report_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
  
  -- Job configuration
  provider VARCHAR(50) NOT NULL,
  model VARCHAR(100),
  language VARCHAR(10) DEFAULT 'fr',
  data_start_date DATE,
  data_end_date DATE,
  
  -- Job status
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  error_message TEXT,
  
  -- Result
  report_id UUID REFERENCES parcel_reports(id) ON DELETE SET NULL,
  result JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Indexes for common queries
  CONSTRAINT ai_report_jobs_org_idx UNIQUE (id, organization_id)
);

-- Index for polling by user
CREATE INDEX idx_ai_report_jobs_user_status ON ai_report_jobs(user_id, status, created_at DESC);

-- Index for organization queries
CREATE INDEX idx_ai_report_jobs_org_status ON ai_report_jobs(organization_id, status, created_at DESC);

-- RLS policies
ALTER TABLE ai_report_jobs ENABLE ROW LEVEL SECURITY;

-- Users can view their own organization's jobs
CREATE POLICY "Users can view own organization ai report jobs"
  ON ai_report_jobs FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
  ));

-- Users can create jobs for their organization
CREATE POLICY "Users can create ai report jobs"
  ON ai_report_jobs FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
  ));

-- Service role can update jobs (for background processing)
CREATE POLICY "Service role can update ai report jobs"
  ON ai_report_jobs FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE ai_report_jobs IS 'Tracks async AI report generation jobs for background processing';
