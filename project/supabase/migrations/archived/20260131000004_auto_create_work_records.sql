-- Auto-create work records when tasks are completed
-- Migration: 20260131000004_auto_create_work_records.sql

-- Note: The actual work record creation logic is in NestJS (tasks.service.ts)
-- This migration only adds the database function that can be called for backfilling

-- Function to manually create work record from a task (for backfilling existing completed tasks)
-- This is a SECURITY DEFINER function that can be called via RPC for admin purposes
CREATE OR REPLACE FUNCTION create_work_record_from_existing_task(p_task_id UUID)
RETURNS UUID AS $$
DECLARE
  v_work_record_id UUID;
  v_worker_id UUID;
  v_hours_worked NUMERIC;
  v_hourly_rate NUMERIC;
  v_total_payment NUMERIC;
  v_payment_type TEXT;
  v_task_type TEXT;
  v_farm_id UUID;
  v_org_id UUID;
  v_work_date DATE;
  v_task_title TEXT;
  v_parcel_id UUID;
BEGIN
  -- Get task and worker information
  SELECT
    t.assigned_to,
    EXTRACT(EPOCH FROM (t.end_date - t.start_date)) / 3600,
    t.task_type,
    t.farm_id,
    t.organization_id,
    COALESCE(t.due_date::date, t.end_date::date, t.created_at::date, CURRENT_DATE),
    t.title,
    t.parcel_id
  INTO v_worker_id, v_hours_worked, v_task_type, v_farm_id, v_org_id, v_work_date, v_task_title, v_parcel_id
  FROM tasks t
  WHERE t.id = p_task_id AND t.status = 'completed';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found or not completed';
  END IF;

  IF v_worker_id IS NULL THEN
    RAISE EXCEPTION 'Task has no assigned worker';
  END IF;

  -- Get worker payment information
  SELECT
    w.payment_type,
    w.hourly_rate,
    w.daily_rate
  INTO v_payment_type, v_hourly_rate, v_total_payment
  FROM workers w
  WHERE w.id = v_worker_id;

  -- Calculate payment
  IF v_payment_type = 'hourly' AND v_hourly_rate IS NOT NULL AND v_hours_worked > 0 THEN
    v_total_payment := v_hourly_rate * v_hours_worked;
  END IF;

  -- Create work record
  INSERT INTO work_records (
    farm_id,
    organization_id,
    worker_id,
    worker_type,
    work_date,
    hours_worked,
    task_description,
    hourly_rate,
    total_payment,
    payment_status,
    notes,
    created_at,
    updated_at
  ) VALUES (
    v_farm_id,
    v_org_id,
    v_worker_id,
    v_payment_type,
    v_work_date,
    COALESCE(v_hours_worked, 0),
    COALESCE(v_task_title, 'Task completed'),
    v_hourly_rate,
    COALESCE(v_total_payment, 0),
    CASE
      WHEN v_total_payment > 0 THEN 'pending'
      ELSE 'not_applicable'
    END,
    jsonb_build_object(
      'task_id', p_task_id,
      'task_title', v_task_title,
      'task_type', v_task_type,
      'parcel_id', v_parcel_id,
      'completed_at', NOW()
    )::text,
    NOW(),
    NOW()
  ) RETURNING id INTO v_work_record_id;

  RETURN v_work_record_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission to execute the function
GRANT EXECUTE ON FUNCTION create_work_record_from_existing_task TO authenticated;

COMMENT ON FUNCTION create_work_record_from_existing_task(p_task_id UUID) IS 'Backfill function: Creates a work record from an existing completed task. The main auto-creation logic is in NestJS tasks.service.ts';

-- Index for work records with task reference (for querying work records by task)
CREATE INDEX IF NOT EXISTS idx_work_records_task_ref ON work_records USING GIN ((notes::jsonb) jsonb_path_ops) WHERE notes ? 'task_id';
