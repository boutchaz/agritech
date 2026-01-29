-- Fix Security Definer Views
-- Migration Date: 2026-01-29
-- Description: Changes views from SECURITY DEFINER to SECURITY INVOKER for better security

-- Drop and recreate views with SECURITY INVOKER instead of SECURITY DEFINER

-- accounting_summary view
DROP VIEW IF EXISTS accounting_summary;
CREATE VIEW accounting_summary WITH (security_invoker = true) AS
SELECT
  o.id AS organization_id,
  (SELECT COUNT(*) FROM sales_orders WHERE organization_id = o.id) AS sales_orders_count,
  (SELECT COUNT(*) FROM purchase_orders WHERE organization_id = o.id) AS purchase_orders_count,
  (SELECT COUNT(*) FROM invoices WHERE organization_id = o.id) AS invoices_count,
  (SELECT COALESCE(SUM(total_amount), 0) FROM invoices WHERE organization_id = o.id AND status != 'paid') AS outstanding_invoices,
  (SELECT COALESCE(SUM(total_amount), 0) FROM accounting_payments WHERE organization_id = o.id) AS total_payments
FROM organizations o;

-- dashboard_summary view
DROP VIEW IF EXISTS dashboard_summary;
CREATE VIEW dashboard_summary WITH (security_invoker = true) AS
SELECT
  o.id AS organization_id,
  (SELECT COUNT(*) FROM farms WHERE organization_id = o.id AND is_active = true) AS active_farms,
  (SELECT COUNT(*) FROM parcels WHERE organization_id = o.id AND is_active = true) AS active_parcels,
  (SELECT COUNT(*) FROM crops WHERE organization_id = o.id AND status = 'active') AS active_crops,
  (SELECT COUNT(*) FROM workers WHERE organization_id = o.id AND is_active = true) AS active_workers,
  (SELECT COUNT(DISTINCT customer_id) FROM sales_orders WHERE organization_id = o.id) AS customer_count,
  (SELECT COUNT(DISTINCT supplier_id) FROM purchase_orders WHERE organization_id = o.id) AS supplier_count
FROM organizations o;

-- financial_metrics view
DROP VIEW IF EXISTS financial_metrics;
CREATE VIEW financial_metrics WITH (security_invoker = true) AS
SELECT
  o.id AS organization_id,
  (SELECT COALESCE(SUM(j.quantity * j.unit_price), 0)
   FROM sales_order_items j
   JOIN sales_orders so ON j.sales_order_id = so.id
   WHERE so.organization_id = o.id) AS total_revenue,
  (SELECT COALESCE(SUM(j.quantity * j.unit_cost), 0)
   FROM purchase_order_items j
   JOIN purchase_orders po ON j.purchase_order_id = po.id
   WHERE po.organization_id = o.id) AS total_purchases,
  (SELECT COALESCE(SUM(amount), 0)
   FROM costs
   WHERE organization_id = o.id) AS total_costs,
  (SELECT COALESCE(SUM(amount), 0)
   FROM revenues
   WHERE organization_id = o.id) AS total_revenues_recorded
FROM organizations o;

-- inventory_status view
DROP VIEW IF EXISTS inventory_status;
CREATE VIEW inventory_status WITH (security_invoker = true) AS
SELECT
  i.id AS inventory_item_id,
  i.item_id,
  i.item_name,
  i.warehouse_id,
  w.name AS warehouse_name,
  i.quantity_on_hand,
  i.quantity_reserved,
  i.quantity_available,
  i.reorder_level,
  i.quantity_on_hand <= i.reorder_level AS needs_reorder,
  i.last_stock_update,
  i.organization_id
FROM inventory i
JOIN warehouses w ON i.warehouse_id = w.id;

-- pending_tasks view
DROP VIEW IF EXISTS pending_tasks;
CREATE VIEW pending_tasks WITH (security_invoker = true) AS
SELECT
  t.id,
  t.organization_id,
  t.title,
  t.description,
  t.status,
  t.priority,
  t.due_date,
  t.assigned_to_id,
  u.first_name || ' ' || u.last_name AS assigned_to_name,
  t.farm_id,
  f.name AS farm_name,
  t.created_at
FROM tasks t
LEFT JOIN users u ON t.assigned_to_id = u.id
LEFT JOIN farms f ON t.farm_id = f.id
WHERE t.status IN ('pending', 'in_progress')
ORDER BY t.due_date ASC NULLS LAST, t.priority DESC;

-- production_metrics view
DROP VIEW IF EXISTS production_metrics;
CREATE VIEW production_metrics WITH (security_invoker = true) AS
SELECT
  o.id AS organization_id,
  (SELECT COUNT(*) FROM crops WHERE organization_id = o.id AND status = 'active') AS active_crops_count,
  (SELECT COUNT(*) FROM trees WHERE organization_id = o.id AND status = 'active') AS active_trees_count,
  (SELECT COALESCE(SUM(hr.quantity_kg), 0)
   FROM harvest_records hr
   JOIN crops c ON hr.crop_id = c.id
   WHERE c.organization_id = o.id
   AND hr.harvest_date >= CURRENT_DATE - INTERVAL '30 days') AS harvest_last_30_days_kg,
  (SELECT COALESCE(AVG(hr.quantity_kg), 0)
   FROM harvest_records hr
   JOIN crops c ON hr.crop_id = c.id
   WHERE c.organization_id = o.id
   AND hr.harvest_date >= CURRENT_DATE - INTERVAL '30 days') AS avg_harvest_last_30_days_kg
FROM organizations o;

-- sales_analytics view
DROP VIEW IF EXISTS sales_analytics;
CREATE VIEW sales_analytics WITH (security_invoker = true) AS
SELECT
  o.id AS organization_id,
  (SELECT COUNT(*) FROM sales_orders WHERE organization_id = o.id) AS total_orders,
  (SELECT COALESCE(SUM(total_amount), 0) FROM sales_orders WHERE organization_id = o.id) AS total_sales_amount,
  (SELECT COALESCE(AVG(total_amount), 0) FROM sales_orders WHERE organization_id = o.id) AS average_order_value,
  (SELECT COUNT(DISTINCT customer_id) FROM sales_orders WHERE organization_id = o.id) AS unique_customers
FROM organizations o;

-- task_completion view
DROP VIEW IF EXISTS task_completion;
CREATE VIEW task_completion WITH (security_invoker = true) AS
SELECT
  o.id AS organization_id,
  (SELECT COUNT(*) FROM tasks WHERE organization_id = o.id AND status = 'completed') AS completed_tasks,
  (SELECT COUNT(*) FROM tasks WHERE organization_id = o.id AND status IN ('pending', 'in_progress')) AS pending_tasks,
  (SELECT COUNT(*) FROM tasks WHERE organization_id = o.id AND status = 'overdue') AS overdue_tasks,
  CASE
    WHEN (SELECT COUNT(*) FROM tasks WHERE organization_id = o.id) > 0 THEN
      ROUND((SELECT COUNT(*)::NUMERIC FROM tasks WHERE organization_id = o.id AND status = 'completed') /
            (SELECT COUNT(*)::NUMERIC FROM tasks WHERE organization_id = o.id) * 100, 2)
    ELSE 0
  END AS completion_percentage
FROM organizations o;

-- worker_assignments view
DROP VIEW IF EXISTS worker_assignments;
CREATE VIEW worker_assignments WITH (security_invoker = true) AS
SELECT
  w.id AS worker_id,
  w.user_id,
  u.first_name || ' ' || u.last_name AS worker_name,
  w.organization_id,
  w.employee_id,
  COUNT(DISTINCT t.id) AS assigned_tasks_count,
  COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) AS completed_tasks_count
FROM workers w
LEFT JOIN users u ON w.user_id = u.id
LEFT JOIN tasks t ON t.assigned_to_id = w.id
WHERE w.is_active = true
GROUP BY w.id, w.user_id, u.first_name, u.last_name, w.organization_id, w.employee_id;

-- workforce_summary view
DROP VIEW IF EXISTS workforce_summary;
CREATE VIEW workforce_summary WITH (security_invoker = true) AS
SELECT
  o.id AS organization_id,
  (SELECT COUNT(*) FROM workers WHERE organization_id = o.id AND worker_type = 'employee' AND is_active = true) AS active_employees,
  (SELECT COUNT(*) FROM workers WHERE organization_id = o.id AND worker_type = 'day_laborer' AND is_active = true) AS active_day_laborers,
  (SELECT COUNT(*) FROM work_units WHERE organization_id = o.id AND is_active = true) AS active_work_units,
  (SELECT COUNT(*) FROM tasks WHERE organization_id = o.id AND status = 'in_progress') AS tasks_in_progress
FROM organizations o;

-- subscription_details view
DROP VIEW IF EXISTS subscription_details;
CREATE VIEW subscription_details WITH (security_invoker = true) AS
SELECT
  s.id AS subscription_id,
  s.organization_id,
  o.name AS organization_name,
  s.plan_type,
  s.status,
  s.current_period_start,
  s.current_period_end,
  s.cancel_at_period_end,
  s.included_addon_slots,
  s.additional_addon_slots,
  (SELECT COUNT(*) FROM organization_addons WHERE organization_id = s.id AND status IN ('active', 'trialing')) AS active_addons_count
FROM subscriptions s
JOIN organizations o ON s.organization_id = o.id;

-- Add comments for documentation
COMMENT ON VIEW accounting_summary IS 'Accounting summary per organization (SECURITY INVOKER)';
COMMENT ON VIEW dashboard_summary IS 'Dashboard summary metrics (SECURITY INVOKER)';
COMMENT ON VIEW financial_metrics IS 'Financial metrics per organization (SECURITY INVOKER)';
COMMENT ON VIEW inventory_status IS 'Current inventory status with reorder indicators (SECURITY INVOKER)';
COMMENT ON VIEW pending_tasks IS 'Pending and in-progress tasks with assignment info (SECURITY INVOKER)';
COMMENT ON VIEW production_metrics IS 'Production metrics per organization (SECURITY INVOKER)';
COMMENT ON VIEW sales_analytics IS 'Sales analytics per organization (SECURITY INVOKER)';
COMMENT ON VIEW task_completion IS 'Task completion statistics per organization (SECURITY INVOKER)';
COMMENT ON VIEW worker_assignments IS 'Worker assignments with task counts (SECURITY INVOKER)';
COMMENT ON VIEW workforce_summary IS 'Workforce summary statistics (SECURITY INVOKER)';
COMMENT ON VIEW subscription_details IS 'Subscription details with addon counts (SECURITY INVOKER)';
