-- Add missing columns to work_records if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'work_records' AND column_name = 'amount_paid') THEN
    ALTER TABLE work_records ADD COLUMN amount_paid DECIMAL(10, 2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'work_records' AND column_name = 'payment_status') THEN
    ALTER TABLE work_records ADD COLUMN payment_status TEXT DEFAULT 'pending'
      CHECK (payment_status IN ('pending', 'paid', 'cancelled'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'work_records' AND column_name = 'payment_date') THEN
    ALTER TABLE work_records ADD COLUMN payment_date DATE;
  END IF;
END $$;

-- Drop and recreate the view with correct column references
DROP VIEW IF EXISTS active_workers_summary;

CREATE OR REPLACE VIEW active_workers_summary AS
SELECT
  w.*,
  o.name as organization_name,
  f.name as farm_name,
  COALESCE(COUNT(DISTINCT wr.id), 0) as work_records_count,
  COALESCE(SUM(CASE WHEN wr.payment_status = 'paid' THEN wr.amount_paid ELSE 0 END), 0) as total_paid
FROM workers w
LEFT JOIN organizations o ON w.organization_id = o.id
LEFT JOIN farms f ON w.farm_id = f.id
LEFT JOIN work_records wr ON w.id = wr.worker_id
WHERE w.is_active = true
GROUP BY w.id, o.name, f.name;

-- Grant access to the view
GRANT SELECT ON active_workers_summary TO authenticated;
