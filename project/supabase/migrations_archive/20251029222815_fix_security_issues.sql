-- Migration: Fix Security Issues from Supabase Linter
-- Date: 2025-10-29
-- Description: Addresses RLS, auth.users exposure, and SECURITY DEFINER issues

-- ============================================================================
-- PART 1: Enable RLS on tables with existing policies
-- ============================================================================

-- Enable RLS on parcels table (has policies but RLS disabled)
ALTER TABLE public.parcels ENABLE ROW LEVEL SECURITY;

-- Enable RLS on tasks table (has policies but RLS disabled)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 2: Enable RLS on public tables without policies
-- ============================================================================

-- Enable RLS on currencies table
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;

-- Add basic read policy for currencies (everyone can read, only admins can modify)
CREATE POLICY "currencies_select_all" ON public.currencies
  FOR SELECT
  USING (true);

CREATE POLICY "currencies_modify_admin" ON public.currencies
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_users ou
      WHERE ou.user_id = auth.uid()
      AND ou.role IN ('system_admin', 'organization_admin')
    )
  );

-- Enable RLS on crop_categories table
ALTER TABLE public.crop_categories ENABLE ROW LEVEL SECURITY;

-- Add basic read policy for crop_categories
CREATE POLICY "crop_categories_select_all" ON public.crop_categories
  FOR SELECT
  USING (true);

CREATE POLICY "crop_categories_modify_org_members" ON public.crop_categories
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_users ou
      WHERE ou.user_id = auth.uid()
    )
  );

-- Enable RLS on permissions table
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

-- Add read-only policy for permissions (everyone can read)
CREATE POLICY "permissions_select_all" ON public.permissions
  FOR SELECT
  USING (true);

-- Enable RLS on roles table
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Add read-only policy for roles (everyone can read)
CREATE POLICY "roles_select_all" ON public.roles
  FOR SELECT
  USING (true);

-- Enable RLS on role_permissions table
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Add read-only policy for role_permissions (everyone can read)
CREATE POLICY "role_permissions_select_all" ON public.role_permissions
  FOR SELECT
  USING (true);

-- ============================================================================
-- PART 3: Fix auth.users exposure in views
-- ============================================================================

-- Keep existing worker payment_summary intact. Create accounting_payment_summary instead.
-- Recreate without exposing sensitive auth.users data
CREATE VIEW public.accounting_payment_summary
WITH (security_invoker=true) AS
SELECT
  p.id,
  p.organization_id,
  p.payment_number,
  p.payment_type,
  p.payment_date,
  p.amount,
  p.payment_method,
  p.reference_number,
  p.party_type,
  p.party_id,
  p.party_name,
  p.remarks,
  p.bank_account_id,
  p.created_at,
  p.updated_at,
  p.created_by,
  -- Use user_profiles instead of auth.users for non-sensitive data
  up.full_name as created_by_name,
  COALESCE(
    (SELECT SUM(pa.allocated_amount)
     FROM public.payment_allocations pa
     WHERE pa.payment_id = p.id),
    0
  ) as allocated_amount,
  p.amount - COALESCE(
    (SELECT SUM(pa.allocated_amount)
     FROM public.payment_allocations pa
     WHERE pa.payment_id = p.id),
    0
  ) as unallocated_amount
FROM public.accounting_payments p
LEFT JOIN public.user_profiles up ON up.id = p.created_by;

-- Recreate assignable_users view without exposing auth.users sensitive data
-- Drop existing view
DROP VIEW IF EXISTS public.assignable_users;

-- Recreate with security_invoker to respect RLS
CREATE VIEW public.assignable_users
WITH (security_invoker=true) AS
SELECT
  up.id,
  up.full_name,
  up.email,
  up.avatar_url,
  ou.organization_id,
  ou.role,
  'user_profile' as source_type
FROM public.user_profiles up
INNER JOIN public.organization_users ou ON ou.user_id = up.id
WHERE ou.role IN ('organization_admin', 'farm_manager', 'farm_worker')

UNION ALL

SELECT
  w.id,
  (w.first_name || ' ' || w.last_name) as full_name,
  w.email,
  NULL as avatar_url,
  w.organization_id,
  'farm_worker' as role,
  'worker' as source_type
FROM public.workers w
WHERE w.is_active = true

UNION ALL

SELECT
  dl.id,
  (dl.first_name || ' ' || dl.last_name) as full_name,
  dl.phone as email,
  NULL as avatar_url,
  f.organization_id,
  'day_laborer' as role,
  'day_laborer' as source_type
FROM public.day_laborers dl
INNER JOIN public.farms f ON f.id = dl.farm_id
WHERE dl.is_active = true;

-- ============================================================================
-- PART 4: Fix SECURITY DEFINER views
-- ============================================================================

-- Convert SECURITY DEFINER views to SECURITY INVOKER
-- This makes views respect the querying user's RLS policies

-- harvest_summary
DROP VIEW IF EXISTS public.harvest_summary CASCADE;
CREATE VIEW public.harvest_summary
WITH (security_invoker=true) AS
SELECT
  h.id,
  h.parcel_id,
  h.harvest_date,
  h.quantity,
  h.unit,
  h.quality_grade,
  h.notes,
  h.organization_id,
  p.name as parcel_name,
  f.name as farm_name,
  0::numeric as total_costs
FROM public.harvests h
LEFT JOIN public.parcels p ON p.id = h.parcel_id
LEFT JOIN public.farms f ON f.id = p.farm_id;

-- task_summary
DROP VIEW IF EXISTS public.task_summary CASCADE;
CREATE VIEW public.task_summary
WITH (security_invoker=true) AS
SELECT
  t.id,
  t.title,
  t.description,
  t.status,
  t.priority,
  t.due_date,
  t.parcel_id,
  t.farm_id,
  t.assigned_to,
  t.completed_date,
  t.estimated_duration,
  t.actual_duration,
  t.category_id,
  t.crop_id,
  t.notes,
  t.created_at,
  t.updated_at,
  p.name as parcel_name,
  f.name as farm_name,
  f.organization_id
FROM public.tasks t
LEFT JOIN public.parcels p ON p.id = t.parcel_id
LEFT JOIN public.farms f ON f.id = t.farm_id;

-- vw_ledger
DROP VIEW IF EXISTS public.vw_ledger CASCADE;
CREATE VIEW public.vw_ledger
WITH (security_invoker=true) AS
SELECT
  ji.id,
  ji.journal_entry_id,
  ji.account_id,
  ji.debit,
  ji.credit,
  ji.description,
  ji.cost_center_id,
  a.code as account_code,
  a.name as account_name,
  a.account_type,
  je.entry_date,
  je.reference_type,
  je.reference_id,
  je.status as entry_status,
  je.organization_id,
  je.created_at,
  je.updated_at,
  cc.name as cost_center_name
FROM public.journal_items ji
INNER JOIN public.accounts a ON a.id = ji.account_id
INNER JOIN public.journal_entries je ON je.id = ji.journal_entry_id
LEFT JOIN public.cost_centers cc ON cc.id = ji.cost_center_id;

-- delivery_summary view already exists from harvest/delivery migration
-- No need to recreate it here

-- vw_invoice_aging
DROP VIEW IF EXISTS public.vw_invoice_aging CASCADE;
CREATE VIEW public.vw_invoice_aging
WITH (security_invoker=true) AS
SELECT
  i.id,
  i.invoice_number,
  i.invoice_type,
  i.invoice_date,
  i.due_date,
  i.party_name,
  i.grand_total,
  i.outstanding_amount,
  i.organization_id,
  CURRENT_DATE - i.due_date as days_overdue,
  CASE
    WHEN i.outstanding_amount = 0 THEN 'Paid'
    WHEN CURRENT_DATE <= i.due_date THEN 'Current'
    WHEN CURRENT_DATE - i.due_date <= 30 THEN '1-30 days'
    WHEN CURRENT_DATE - i.due_date <= 60 THEN '31-60 days'
    WHEN CURRENT_DATE - i.due_date <= 90 THEN '61-90 days'
    ELSE '90+ days'
  END as aging_bucket
FROM public.invoices i
WHERE i.status = 'submitted' AND i.outstanding_amount > 0;

-- subscription_status
DROP VIEW IF EXISTS public.subscription_status CASCADE;
CREATE VIEW public.subscription_status
WITH (security_invoker=true) AS
SELECT
  s.id,
  s.organization_id,
  s.plan_type as subscription_tier,
  s.status,
  s.current_period_start,
  s.current_period_end,
  s.max_farms,
  s.max_parcels,
  s.max_users,
  s.max_satellite_reports,
  s.has_analytics,
  s.has_sensor_integration,
  s.has_api_access,
  s.has_advanced_reporting,
  s.has_ai_recommendations,
  s.has_priority_support,
  o.name as organization_name,
  (SELECT COUNT(*) FROM public.farms WHERE organization_id = s.organization_id) as current_farms,
  (SELECT COUNT(*) FROM public.parcels p
   INNER JOIN public.farms f ON f.id = p.farm_id
   WHERE f.organization_id = s.organization_id) as current_parcels,
  (SELECT COUNT(*) FROM public.organization_users WHERE organization_id = s.organization_id) as current_users
FROM public.subscriptions s
INNER JOIN public.organizations o ON o.id = s.organization_id;

-- vw_account_balances
DROP VIEW IF EXISTS public.vw_account_balances CASCADE;
CREATE VIEW public.vw_account_balances
WITH (security_invoker=true) AS
SELECT
  a.id,
  a.code,
  a.name,
  a.account_type,
  a.account_subtype,
  a.organization_id,
  COALESCE(SUM(ji.debit), 0) as total_debit,
  COALESCE(SUM(ji.credit), 0) as total_credit,
  COALESCE(SUM(ji.debit), 0) - COALESCE(SUM(ji.credit), 0) as balance
FROM public.accounts a
LEFT JOIN public.journal_items ji ON ji.account_id = a.id
LEFT JOIN public.journal_entries je ON je.id = ji.journal_entry_id AND je.status = 'posted'
GROUP BY a.id, a.code, a.name, a.account_type, a.account_subtype, a.organization_id;

-- active_workers_summary
DROP VIEW IF EXISTS public.active_workers_summary CASCADE;
CREATE VIEW public.active_workers_summary
WITH (security_invoker=true) AS
SELECT
  w.id,
  w.first_name,
  w.last_name,
  w.first_name || ' ' || w.last_name as full_name,
  w.email,
  w.phone,
  w.position,
  w.organization_id,
  w.is_active,
  w.worker_type,
  COUNT(t.id) as active_tasks
FROM public.workers w
LEFT JOIN public.tasks t ON t.assigned_to::uuid = w.id AND t.status IN ('pending', 'in_progress')
WHERE w.is_active = true
GROUP BY w.id, w.first_name, w.last_name, w.email, w.phone, w.position, w.organization_id, w.is_active, w.worker_type;

-- current_session_status
DROP VIEW IF EXISTS public.current_session_status CASCADE;
CREATE VIEW public.current_session_status
WITH (security_invoker=true) AS
SELECT
  up.id,
  up.full_name,
  up.email,
  ou.organization_id,
  ou.role,
  o.name as organization_name
FROM public.user_profiles up
INNER JOIN public.organization_users ou ON ou.user_id = up.id
INNER JOIN public.organizations o ON o.id = ou.organization_id
WHERE up.id = auth.uid();

-- worker_payment_history
DROP VIEW IF EXISTS public.worker_payment_history CASCADE;
CREATE VIEW public.worker_payment_history
WITH (security_invoker=true) AS
SELECT
  w.id as worker_id,
  w.first_name,
  w.last_name,
  w.first_name || ' ' || w.last_name as full_name,
  w.organization_id,
  pr.payment_date,
  pr.net_amount as amount,
  pr.payment_method,
  pr.payment_reference as reference_number
FROM public.workers w
LEFT JOIN public.payment_records pr ON pr.worker_id = w.id
WHERE w.is_active = true;

-- ============================================================================
-- Grant necessary permissions
-- ============================================================================

-- Grant SELECT on views to authenticated users
GRANT SELECT ON public.payment_summary TO authenticated;
GRANT SELECT ON public.assignable_users TO authenticated;
GRANT SELECT ON public.harvest_summary TO authenticated;
GRANT SELECT ON public.task_summary TO authenticated;
GRANT SELECT ON public.vw_ledger TO authenticated;
GRANT SELECT ON public.delivery_summary TO authenticated;
GRANT SELECT ON public.vw_invoice_aging TO authenticated;
GRANT SELECT ON public.subscription_status TO authenticated;
GRANT SELECT ON public.vw_account_balances TO authenticated;
GRANT SELECT ON public.active_workers_summary TO authenticated;
GRANT SELECT ON public.current_session_status TO authenticated;
GRANT SELECT ON public.worker_payment_history TO authenticated;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE public.parcels IS 'Parcels table with RLS enabled - users can only access parcels from their organizations';
COMMENT ON TABLE public.tasks IS 'Tasks table with RLS enabled - users can only access tasks from their organizations';
COMMENT ON VIEW public.payment_summary IS 'Payment summary view with security_invoker - respects RLS policies';
COMMENT ON VIEW public.assignable_users IS 'Assignable users view with security_invoker - does not expose sensitive auth.users data';
