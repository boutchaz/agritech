-- =====================================================
-- RLS VERIFICATION SCRIPT
-- Check which tables have RLS enabled but no policies
-- =====================================================

-- List all tables with RLS enabled
WITH rls_enabled_tables AS (
  SELECT
    schemaname,
    tablename
  FROM pg_tables
  WHERE schemaname = 'public'
    AND rowsecurity = true
),
-- List all tables with at least one policy
tables_with_policies AS (
  SELECT DISTINCT
    schemaname,
    tablename
  FROM pg_policies
  WHERE schemaname = 'public'
)
-- Find tables with RLS enabled but NO policies
SELECT
  r.tablename AS "Table Name",
  'RLS ENABLED but NO POLICIES - WILL BLOCK ALL ACCESS!' AS "Status"
FROM rls_enabled_tables r
LEFT JOIN tables_with_policies p
  ON r.tablename = p.tablename
WHERE p.tablename IS NULL
ORDER BY r.tablename;

-- Summary count
SELECT
  COUNT(DISTINCT r.tablename) AS "Tables with RLS but NO policies"
FROM rls_enabled_tables r
LEFT JOIN tables_with_policies p
  ON r.tablename = p.tablename
WHERE p.tablename IS NULL;

-- Also show tables that DO have policies (for comparison)
SELECT
  tablename AS "Table Name",
  COUNT(*) AS "Number of Policies"
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
