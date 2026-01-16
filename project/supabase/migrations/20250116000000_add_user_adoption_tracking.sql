-- ============================================================================
-- USER ADOPTION TRACKING: Database Migration
-- ============================================================================
-- Purpose: Track user progression through key feature adoption paths
-- and visualize drop-off points and time-to-adoption metrics

-- ============================================================================
-- ADOPTION MILESTONES TABLE
-- ============================================================================
-- Stores when users complete key adoption milestones

CREATE TABLE IF NOT EXISTS user_adoption_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  milestone_type VARCHAR(100) NOT NULL,
  milestone_data JSONB DEFAULT '{}',
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, milestone_type)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_adoption_milestones_user ON user_adoption_milestones(user_id);
CREATE INDEX IF NOT EXISTS idx_adoption_milestones_org ON user_adoption_milestones(organization_id);
CREATE INDEX IF NOT EXISTS idx_adoption_milestones_type ON user_adoption_milestones(milestone_type);
CREATE INDEX IF NOT EXISTS idx_adoption_milestones_completed ON user_adoption_milestones(completed_at);

COMMENT ON TABLE user_adoption_milestones IS 'Tracks when users complete key adoption milestones in their journey';
COMMENT ON COLUMN user_adoption_milestones.milestone_type IS 'Type of milestone: user_signup, profile_completed, first_farm_created, first_parcel_created, first_task_created, first_harvest_recorded, first_report_generated, etc.';

-- ============================================================================
-- ADOPTION FUNNEL DEFINITIONS
-- ============================================================================
-- Defines the funnel stages and their expected order

CREATE TABLE IF NOT EXISTS adoption_funnel_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_name VARCHAR(100) NOT NULL,
  stage_order INTEGER NOT NULL,
  milestone_type VARCHAR(100) NOT NULL,
  stage_name VARCHAR(200) NOT NULL,
  stage_description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(funnel_name, stage_order),
  UNIQUE(funnel_name, milestone_type)
);

CREATE INDEX IF NOT EXISTS idx_funnel_definitions_name ON adoption_funnel_definitions(funnel_name);
CREATE INDEX IF NOT EXISTS idx_funnel_definitions_active ON adoption_funnel_definitions(is_active);

COMMENT ON TABLE adoption_funnel_definitions IS 'Defines the stages of user adoption funnels';

-- ============================================================================
-- SEED DEFAULT FUNNEL DEFINITIONS
-- ============================================================================

INSERT INTO adoption_funnel_definitions (funnel_name, stage_order, milestone_type, stage_name, stage_description)
VALUES
  -- Main User Onboarding Funnel
  ('user_onboarding', 1, 'user_signup', 'Account Created', 'User completed registration'),
  ('user_onboarding', 2, 'profile_completed', 'Profile Completed', 'User filled out their profile information'),
  ('user_onboarding', 3, 'first_farm_created', 'First Farm Created', 'User created their first farm'),
  ('user_onboarding', 4, 'first_parcel_created', 'First Parcel Created', 'User created their first parcel/plot'),
  ('user_onboarding', 5, 'first_task_created', 'First Task Created', 'User created their first task'),
  ('user_onboarding', 6, 'first_harvest_recorded', 'First Harvest Recorded', 'User recorded their first harvest'),
  ('user_onboarding', 7, 'first_report_generated', 'First Report Generated', 'User generated their first report'),

  -- Feature Discovery Funnel
  ('feature_discovery', 1, 'user_signup', 'Signed Up', 'User completed registration'),
  ('feature_discovery', 2, 'dashboard_viewed', 'Dashboard Viewed', 'User viewed the main dashboard'),
  ('feature_discovery', 3, 'farms_module_accessed', 'Farms Module Used', 'User accessed the farms management module'),
  ('feature_discovery', 4, 'tasks_module_accessed', 'Tasks Module Used', 'User accessed the task management module'),
  ('feature_discovery', 5, 'reports_module_accessed', 'Reports Module Used', 'User accessed the reports module'),
  ('feature_discovery', 6, 'settings_configured', 'Settings Configured', 'User configured their organization settings')
ON CONFLICT (funnel_name, stage_order) DO NOTHING;

-- ============================================================================
-- ADOPTION METRICS DAILY AGGREGATE TABLE
-- ============================================================================
-- Pre-calculated daily metrics for faster dashboard queries

CREATE TABLE IF NOT EXISTS adoption_metrics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  funnel_name VARCHAR(100) NOT NULL,
  milestone_type VARCHAR(100) NOT NULL,
  total_users_reached INTEGER DEFAULT 0,
  new_users_reached INTEGER DEFAULT 0,
  avg_time_to_milestone_hours NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, funnel_name, milestone_type)
);

CREATE INDEX IF NOT EXISTS idx_adoption_metrics_date ON adoption_metrics_daily(date);
CREATE INDEX IF NOT EXISTS idx_adoption_metrics_funnel ON adoption_metrics_daily(funnel_name);

COMMENT ON TABLE adoption_metrics_daily IS 'Daily aggregated adoption metrics for trend analysis';

-- ============================================================================
-- VIEWS FOR ADOPTION ANALYTICS
-- ============================================================================

-- View: Current funnel status for all users
CREATE OR REPLACE VIEW admin_user_adoption_status AS
SELECT
  up.id as user_id,
  up.email,
  up.full_name,
  up.created_at as signup_date,
  ou.organization_id,
  o.name as organization_name,
  fd.funnel_name,
  fd.stage_order,
  fd.stage_name,
  fd.milestone_type,
  uam.completed_at as milestone_completed_at,
  CASE WHEN uam.id IS NOT NULL THEN true ELSE false END as milestone_reached,
  EXTRACT(EPOCH FROM (uam.completed_at - up.created_at))/3600 as hours_to_milestone
FROM user_profiles up
CROSS JOIN adoption_funnel_definitions fd
LEFT JOIN organization_users ou ON ou.user_id = up.id AND ou.is_active = true
LEFT JOIN organizations o ON o.id = ou.organization_id
LEFT JOIN user_adoption_milestones uam ON uam.user_id = up.id AND uam.milestone_type = fd.milestone_type
WHERE fd.is_active = true
ORDER BY up.created_at DESC, fd.funnel_name, fd.stage_order;

-- View: Funnel conversion rates
CREATE OR REPLACE VIEW admin_funnel_conversion_rates AS
WITH user_counts AS (
  SELECT
    fd.funnel_name,
    fd.stage_order,
    fd.stage_name,
    fd.milestone_type,
    COUNT(DISTINCT uam.user_id) as users_reached,
    COUNT(DISTINCT up.id) as total_users
  FROM adoption_funnel_definitions fd
  CROSS JOIN user_profiles up
  LEFT JOIN user_adoption_milestones uam ON uam.milestone_type = fd.milestone_type AND uam.user_id = up.id
  WHERE fd.is_active = true
  GROUP BY fd.funnel_name, fd.stage_order, fd.stage_name, fd.milestone_type
)
SELECT
  funnel_name,
  stage_order,
  stage_name,
  milestone_type,
  users_reached,
  total_users,
  CASE
    WHEN total_users > 0 THEN ROUND((users_reached::NUMERIC / total_users) * 100, 2)
    ELSE 0
  END as conversion_rate_percent,
  LAG(users_reached) OVER (PARTITION BY funnel_name ORDER BY stage_order) as previous_stage_users,
  CASE
    WHEN LAG(users_reached) OVER (PARTITION BY funnel_name ORDER BY stage_order) > 0
    THEN ROUND((users_reached::NUMERIC / LAG(users_reached) OVER (PARTITION BY funnel_name ORDER BY stage_order)) * 100, 2)
    ELSE 100
  END as stage_conversion_rate
FROM user_counts
ORDER BY funnel_name, stage_order;

-- View: Time to milestone statistics
CREATE OR REPLACE VIEW admin_time_to_milestone AS
SELECT
  fd.funnel_name,
  fd.stage_order,
  fd.stage_name,
  fd.milestone_type,
  COUNT(uam.id) as users_completed,
  ROUND(AVG(EXTRACT(EPOCH FROM (uam.completed_at - up.created_at))/3600)::NUMERIC, 2) as avg_hours_to_complete,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (uam.completed_at - up.created_at))/3600)::NUMERIC, 2) as median_hours_to_complete,
  ROUND(MIN(EXTRACT(EPOCH FROM (uam.completed_at - up.created_at))/3600)::NUMERIC, 2) as min_hours_to_complete,
  ROUND(MAX(EXTRACT(EPOCH FROM (uam.completed_at - up.created_at))/3600)::NUMERIC, 2) as max_hours_to_complete
FROM adoption_funnel_definitions fd
LEFT JOIN user_adoption_milestones uam ON uam.milestone_type = fd.milestone_type
LEFT JOIN user_profiles up ON up.id = uam.user_id
WHERE fd.is_active = true
GROUP BY fd.funnel_name, fd.stage_order, fd.stage_name, fd.milestone_type
ORDER BY fd.funnel_name, fd.stage_order;

-- View: Cohort analysis (users by signup month)
CREATE OR REPLACE VIEW admin_adoption_cohorts AS
SELECT
  DATE_TRUNC('month', up.created_at) as cohort_month,
  fd.funnel_name,
  fd.stage_order,
  fd.stage_name,
  fd.milestone_type,
  COUNT(DISTINCT up.id) as cohort_size,
  COUNT(DISTINCT uam.user_id) as users_reached,
  CASE
    WHEN COUNT(DISTINCT up.id) > 0
    THEN ROUND((COUNT(DISTINCT uam.user_id)::NUMERIC / COUNT(DISTINCT up.id)) * 100, 2)
    ELSE 0
  END as conversion_rate
FROM user_profiles up
CROSS JOIN adoption_funnel_definitions fd
LEFT JOIN user_adoption_milestones uam ON uam.user_id = up.id AND uam.milestone_type = fd.milestone_type
WHERE fd.is_active = true
GROUP BY DATE_TRUNC('month', up.created_at), fd.funnel_name, fd.stage_order, fd.stage_name, fd.milestone_type
ORDER BY cohort_month DESC, fd.funnel_name, fd.stage_order;

-- View: Drop-off analysis
CREATE OR REPLACE VIEW admin_funnel_dropoffs AS
WITH stage_users AS (
  SELECT
    fd.funnel_name,
    fd.stage_order,
    fd.stage_name,
    fd.milestone_type,
    COUNT(DISTINCT uam.user_id) as users_at_stage
  FROM adoption_funnel_definitions fd
  LEFT JOIN user_adoption_milestones uam ON uam.milestone_type = fd.milestone_type
  WHERE fd.is_active = true
  GROUP BY fd.funnel_name, fd.stage_order, fd.stage_name, fd.milestone_type
)
SELECT
  funnel_name,
  stage_order,
  stage_name,
  milestone_type,
  users_at_stage,
  LAG(users_at_stage) OVER (PARTITION BY funnel_name ORDER BY stage_order) as previous_stage_users,
  COALESCE(LAG(users_at_stage) OVER (PARTITION BY funnel_name ORDER BY stage_order), 0) - users_at_stage as dropoff_count,
  CASE
    WHEN LAG(users_at_stage) OVER (PARTITION BY funnel_name ORDER BY stage_order) > 0
    THEN ROUND(((LAG(users_at_stage) OVER (PARTITION BY funnel_name ORDER BY stage_order) - users_at_stage)::NUMERIC /
                LAG(users_at_stage) OVER (PARTITION BY funnel_name ORDER BY stage_order)) * 100, 2)
    ELSE 0
  END as dropoff_rate
FROM stage_users
ORDER BY funnel_name, stage_order;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE user_adoption_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE adoption_funnel_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE adoption_metrics_daily ENABLE ROW LEVEL SECURITY;

-- User adoption milestones: internal_admin sees all, users see their own
DROP POLICY IF EXISTS "adoption_milestones_read_policy" ON user_adoption_milestones;
CREATE POLICY "adoption_milestones_read_policy" ON user_adoption_milestones
  FOR SELECT USING (
    is_internal_admin()
    OR user_id = auth.uid()
    OR current_setting('role', true) = 'service_role'
  );

DROP POLICY IF EXISTS "adoption_milestones_insert_policy" ON user_adoption_milestones;
CREATE POLICY "adoption_milestones_insert_policy" ON user_adoption_milestones
  FOR INSERT WITH CHECK (
    current_setting('role', true) = 'service_role'
    OR is_internal_admin()
  );

-- Funnel definitions: internal_admin can manage, all can read
DROP POLICY IF EXISTS "funnel_definitions_read_policy" ON adoption_funnel_definitions;
CREATE POLICY "funnel_definitions_read_policy" ON adoption_funnel_definitions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "funnel_definitions_write_policy" ON adoption_funnel_definitions;
CREATE POLICY "funnel_definitions_write_policy" ON adoption_funnel_definitions
  FOR ALL USING (
    is_internal_admin()
    OR current_setting('role', true) = 'service_role'
  );

-- Adoption metrics: internal_admin sees all
DROP POLICY IF EXISTS "adoption_metrics_read_policy" ON adoption_metrics_daily;
CREATE POLICY "adoption_metrics_read_policy" ON adoption_metrics_daily
  FOR SELECT USING (
    is_internal_admin()
    OR current_setting('role', true) = 'service_role'
  );

DROP POLICY IF EXISTS "adoption_metrics_write_policy" ON adoption_metrics_daily;
CREATE POLICY "adoption_metrics_write_policy" ON adoption_metrics_daily
  FOR ALL USING (
    is_internal_admin()
    OR current_setting('role', true) = 'service_role'
  );

-- ============================================================================
-- FUNCTION: Record adoption milestone
-- ============================================================================

CREATE OR REPLACE FUNCTION record_adoption_milestone(
  p_user_id UUID,
  p_milestone_type VARCHAR(100),
  p_organization_id UUID DEFAULT NULL,
  p_milestone_data JSONB DEFAULT '{}'
) RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO user_adoption_milestones (user_id, organization_id, milestone_type, milestone_data, completed_at)
  VALUES (p_user_id, p_organization_id, p_milestone_type, p_milestone_data, NOW())
  ON CONFLICT (user_id, milestone_type) DO NOTHING;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION record_adoption_milestone IS 'Records a user adoption milestone. Returns true if milestone was newly recorded, false if already existed.';

-- ============================================================================
-- FUNCTION: Calculate daily adoption metrics
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_daily_adoption_metrics(p_date DATE DEFAULT CURRENT_DATE)
RETURNS void AS $$
BEGIN
  INSERT INTO adoption_metrics_daily (date, funnel_name, milestone_type, total_users_reached, new_users_reached, avg_time_to_milestone_hours)
  SELECT
    p_date,
    fd.funnel_name,
    fd.milestone_type,
    COUNT(DISTINCT uam.user_id) as total_users_reached,
    COUNT(DISTINCT CASE WHEN DATE(uam.completed_at) = p_date THEN uam.user_id END) as new_users_reached,
    AVG(EXTRACT(EPOCH FROM (uam.completed_at - up.created_at))/3600)
  FROM adoption_funnel_definitions fd
  LEFT JOIN user_adoption_milestones uam ON uam.milestone_type = fd.milestone_type
  LEFT JOIN user_profiles up ON up.id = uam.user_id
  WHERE fd.is_active = true
  GROUP BY fd.funnel_name, fd.milestone_type
  ON CONFLICT (date, funnel_name, milestone_type) DO UPDATE SET
    total_users_reached = EXCLUDED.total_users_reached,
    new_users_reached = EXCLUDED.new_users_reached,
    avg_time_to_milestone_hours = EXCLUDED.avg_time_to_milestone_hours;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION calculate_daily_adoption_metrics IS 'Calculates and stores daily adoption metrics for a given date';

-- Grant execute on functions to authenticated users (service role will be primary caller)
GRANT EXECUTE ON FUNCTION record_adoption_milestone TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_daily_adoption_metrics TO authenticated;
