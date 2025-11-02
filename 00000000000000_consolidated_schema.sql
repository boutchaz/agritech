


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."accounting_payment_method" AS ENUM (
    'cash',
    'bank_transfer',
    'check',
    'card',
    'mobile_money'
);


ALTER TYPE "public"."accounting_payment_method" OWNER TO "postgres";


CREATE TYPE "public"."accounting_payment_status" AS ENUM (
    'draft',
    'submitted',
    'reconciled',
    'cancelled'
);


ALTER TYPE "public"."accounting_payment_status" OWNER TO "postgres";


CREATE TYPE "public"."accounting_payment_type" AS ENUM (
    'receive',
    'pay',
    'received',
    'paid'
);


ALTER TYPE "public"."accounting_payment_type" OWNER TO "postgres";


CREATE TYPE "public"."analysis_type" AS ENUM (
    'soil',
    'plant',
    'water'
);


ALTER TYPE "public"."analysis_type" OWNER TO "postgres";


COMMENT ON TYPE "public"."analysis_type" IS 'Type of analysis: soil, plant, or water';



CREATE TYPE "public"."calculation_basis" AS ENUM (
    'gross_revenue',
    'net_revenue'
);


ALTER TYPE "public"."calculation_basis" OWNER TO "postgres";


COMMENT ON TYPE "public"."calculation_basis" IS 'Basis for metayage calculations: gross or net revenue';



CREATE TYPE "public"."invoice_status" AS ENUM (
    'draft',
    'submitted',
    'paid',
    'partially_paid',
    'overdue',
    'cancelled'
);


ALTER TYPE "public"."invoice_status" OWNER TO "postgres";


CREATE TYPE "public"."invoice_type" AS ENUM (
    'sales',
    'purchase'
);


ALTER TYPE "public"."invoice_type" OWNER TO "postgres";


CREATE TYPE "public"."journal_entry_status" AS ENUM (
    'draft',
    'submitted',
    'posted',
    'cancelled'
);


ALTER TYPE "public"."journal_entry_status" OWNER TO "postgres";


CREATE TYPE "public"."metayage_type" AS ENUM (
    'khammass',
    'rebaa',
    'tholth',
    'custom'
);


ALTER TYPE "public"."metayage_type" OWNER TO "postgres";


COMMENT ON TYPE "public"."metayage_type" IS 'Type of metayage arrangement';



CREATE TYPE "public"."payment_frequency" AS ENUM (
    'monthly',
    'daily',
    'per_task',
    'harvest_share'
);


ALTER TYPE "public"."payment_frequency" OWNER TO "postgres";


COMMENT ON TYPE "public"."payment_frequency" IS 'How often workers are paid';



CREATE TYPE "public"."purchase_order_status" AS ENUM (
    'draft',
    'submitted',
    'confirmed',
    'partially_received',
    'received',
    'partially_billed',
    'billed',
    'cancelled'
);


ALTER TYPE "public"."purchase_order_status" OWNER TO "postgres";


CREATE TYPE "public"."quote_status" AS ENUM (
    'draft',
    'sent',
    'accepted',
    'rejected',
    'expired',
    'converted',
    'cancelled'
);


ALTER TYPE "public"."quote_status" OWNER TO "postgres";


CREATE TYPE "public"."sales_order_status" AS ENUM (
    'draft',
    'confirmed',
    'processing',
    'partially_delivered',
    'delivered',
    'partially_invoiced',
    'invoiced',
    'cancelled'
);


ALTER TYPE "public"."sales_order_status" OWNER TO "postgres";


CREATE TYPE "public"."tax_type" AS ENUM (
    'sales',
    'purchase',
    'both'
);


ALTER TYPE "public"."tax_type" OWNER TO "postgres";


CREATE TYPE "public"."worker_type" AS ENUM (
    'fixed_salary',
    'daily_worker',
    'metayage'
);


ALTER TYPE "public"."worker_type" OWNER TO "postgres";


COMMENT ON TYPE "public"."worker_type" IS 'Type of worker employment';



CREATE OR REPLACE FUNCTION "public"."add_subscription_check_to_table"("table_name" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $_$
DECLARE
  policy_name TEXT;
BEGIN
  -- Policy names for each operation
  policy_name := 'subscription_required_' || table_name;

  -- Drop existing policies if they exist
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name || '_select', table_name);
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name || '_insert', table_name);
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name || '_update', table_name);
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name || '_delete', table_name);

  -- SELECT: Check subscription before allowing reads
  EXECUTE format($SQL$
    CREATE POLICY %I ON public.%I
    FOR SELECT TO authenticated
    USING (
      -- Allow if subscription valid OR accessing subscription tables themselves
      CASE
        WHEN '%I' IN ('subscriptions', 'organizations', 'organization_users') THEN true
        ELSE EXISTS (
          SELECT 1 FROM organization_users ou
          WHERE ou.user_id = auth.uid()
            AND ou.is_active = true
            AND has_valid_subscription(ou.organization_id)
        )
      END
    )
  $SQL$, policy_name || '_select', table_name, table_name);

  -- INSERT/UPDATE/DELETE: Require valid subscription
  EXECUTE format($SQL$
    CREATE POLICY %I ON public.%I
    FOR INSERT TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM organization_users ou
        WHERE ou.user_id = auth.uid()
          AND ou.is_active = true
          AND has_valid_subscription(ou.organization_id)
      )
    )
  $SQL$, policy_name || '_insert', table_name);

  RAISE NOTICE 'Added subscription check to table: %', table_name;
END;
$_$;


ALTER FUNCTION "public"."add_subscription_check_to_table"("table_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assign_owner_admin_role"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  admin_role_id uuid;
  is_owner boolean;
BEGIN
  -- Check if this user is the organization owner
  SELECT EXISTS(
    SELECT 1 FROM organizations 
    WHERE id = NEW.organization_id 
    AND owner_id = NEW.user_id
  ) INTO is_owner;

  -- If user is the owner and doesn't have a role assigned
  IF is_owner AND NEW.role_id IS NULL THEN
    -- Get the admin role ID
    SELECT id INTO admin_role_id 
    FROM roles 
    WHERE name = 'organization_admin' 
    LIMIT 1;

    IF admin_role_id IS NOT NULL THEN
      NEW.role_id := admin_role_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."assign_owner_admin_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assign_role_with_audit"("target_user_id" "uuid", "target_org_id" "uuid", "new_role_id" "uuid", "reason" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    old_role_id UUID;
    current_user_role_level INTEGER;
    new_role_level INTEGER;
BEGIN
    -- Check if current user has permission to assign roles
    IF NOT public.user_has_permission_for_org(auth.uid(), target_org_id, 'users.manage') THEN
        RAISE EXCEPTION 'Insufficient permissions to assign roles';
    END IF;

    -- Get current user's role level
    current_user_role_level := public.get_user_role_level(auth.uid(), target_org_id);
    
    -- Get new role level
    SELECT level INTO new_role_level FROM public.roles WHERE id = new_role_id;
    
    -- Check if user can assign this role level
    IF new_role_level < current_user_role_level THEN
        RAISE EXCEPTION 'Cannot assign role with higher privileges than your own';
    END IF;

    -- Get old role
    SELECT role_id INTO old_role_id 
    FROM public.organization_users 
    WHERE user_id = target_user_id AND organization_id = target_org_id;

    -- Update role
    UPDATE public.organization_users 
    SET role_id = new_role_id, updated_at = NOW()
    WHERE user_id = target_user_id AND organization_id = target_org_id;

    -- Create audit record
    INSERT INTO public.role_assignments_audit (
        user_id, organization_id, old_role_id, new_role_id, 
        assigned_by, reason
    ) VALUES (
        target_user_id, target_org_id, old_role_id, new_role_id,
        auth.uid(), reason
    );

    RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."assign_role_with_audit"("target_user_id" "uuid", "target_org_id" "uuid", "new_role_id" "uuid", "reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_role_assignment"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.role_id != NEW.role_id THEN
        INSERT INTO public.role_assignments_audit (
            user_id, organization_id, old_role_id, new_role_id, assigned_by
        ) VALUES (
            NEW.user_id, NEW.organization_id, OLD.role_id, NEW.role_id, auth.uid()
        );
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."audit_role_assignment"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
    INSERT INTO public.audit_logs (
        table_name,
        record_id,
        action,
        user_id,
        old_values,
        new_values
    ) VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        auth.uid(),
        CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."audit_trigger"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_create_yield_from_harvest"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_parcel RECORD;
  v_benchmark RECORD;
  v_currency TEXT;
BEGIN
  -- Get parcel details
  SELECT p.*, f.organization_id, f.id as farm_id
  INTO v_parcel
  FROM parcels p
  JOIN farms f ON p.farm_id = f.id
  WHERE p.id = NEW.parcel_id;

  -- Get organization currency
  SELECT currency INTO v_currency
  FROM organizations
  WHERE id = v_parcel.organization_id;

  -- Get active benchmark for this crop if exists
  SELECT * INTO v_benchmark
  FROM yield_benchmarks
  WHERE organization_id = v_parcel.organization_id
    AND crop_type = NEW.crop_type
    AND is_active = true
    AND (parcel_id IS NULL OR parcel_id = NEW.parcel_id)
    AND (farm_id IS NULL OR farm_id = v_parcel.farm_id)
  ORDER BY
    CASE
      WHEN parcel_id = NEW.parcel_id THEN 1
      WHEN farm_id = v_parcel.farm_id THEN 2
      ELSE 3
    END
  LIMIT 1;

  -- Create yield history record
  INSERT INTO yield_history (
    organization_id,
    farm_id,
    parcel_id,
    harvest_id,
    crop_type,
    variety,
    harvest_date,
    harvest_season,
    actual_yield_quantity,
    actual_yield_per_hectare,
    unit_of_measure,
    quality_grade,
    target_yield_quantity,
    target_yield_per_hectare,
    revenue_amount,
    cost_amount,
    profit_amount,
    price_per_unit,
    currency_code,
    notes
  ) VALUES (
    v_parcel.organization_id,
    v_parcel.farm_id,
    NEW.parcel_id,
    NEW.id,
    NEW.crop_type,
    NEW.variety,
    NEW.harvest_date,
    CASE
      WHEN EXTRACT(MONTH FROM NEW.harvest_date) IN (3, 4, 5) THEN 'Spring ' || EXTRACT(YEAR FROM NEW.harvest_date)
      WHEN EXTRACT(MONTH FROM NEW.harvest_date) IN (6, 7, 8) THEN 'Summer ' || EXTRACT(YEAR FROM NEW.harvest_date)
      WHEN EXTRACT(MONTH FROM NEW.harvest_date) IN (9, 10, 11) THEN 'Fall ' || EXTRACT(YEAR FROM NEW.harvest_date)
      ELSE 'Winter ' || EXTRACT(YEAR FROM NEW.harvest_date)
    END,
    NEW.quantity,
    CASE
      WHEN v_parcel.area > 0 THEN NEW.quantity / v_parcel.area
      ELSE NULL
    END,
    COALESCE(NEW.unit_of_measure, 'kg'),
    NEW.quality,
    -- Use benchmark if available
    CASE
      WHEN v_benchmark.id IS NOT NULL AND v_parcel.area > 0
      THEN v_benchmark.target_yield_per_hectare * v_parcel.area
      ELSE NULL
    END,
    v_benchmark.target_yield_per_hectare,
    -- Financial data from harvest
    NEW.revenue,
    NEW.total_cost,
    COALESCE(NEW.revenue, 0) - COALESCE(NEW.total_cost, 0),
    CASE
      WHEN NEW.quantity > 0 THEN NEW.revenue / NEW.quantity
      ELSE NULL
    END,
    COALESCE(v_currency, 'MAD'),
    'Auto-created from harvest #' || NEW.id
  );

  -- Check if yield is underperforming and create alert
  IF v_benchmark.id IS NOT NULL THEN
    DECLARE
      v_yield_per_ha NUMERIC;
      v_variance_percent NUMERIC;
    BEGIN
      -- Calculate yield per hectare
      v_yield_per_ha := CASE
        WHEN v_parcel.area > 0 THEN NEW.quantity / v_parcel.area
        ELSE 0
      END;

      -- Calculate variance
      IF v_benchmark.target_yield_per_hectare > 0 THEN
        v_variance_percent := ((v_yield_per_ha - v_benchmark.target_yield_per_hectare)
                               / v_benchmark.target_yield_per_hectare * 100);

        -- Create alert if underperforming (below -20%)
        IF v_variance_percent < -20 THEN
          INSERT INTO performance_alerts (
            organization_id,
            farm_id,
            parcel_id,
            alert_type,
            severity,
            title,
            message,
            harvest_id,
            metric_name,
            actual_value,
            target_value,
            variance_percent,
            status
          ) VALUES (
            v_parcel.organization_id,
            v_parcel.farm_id,
            NEW.parcel_id,
            'underperforming_yield',
            CASE
              WHEN v_variance_percent < -35 THEN 'critical'
              ELSE 'warning'
            END,
            'Underperforming Parcel: ' || v_parcel.name,
            'Parcel "' || v_parcel.name || '" yielded ' || v_yield_per_ha::TEXT || ' kg/ha, ' ||
            ABS(v_variance_percent)::TEXT || '% below target of ' ||
            v_benchmark.target_yield_per_hectare::TEXT || ' kg/ha for ' || NEW.crop_type || '.',
            NEW.id,
            'yield_per_hectare',
            v_yield_per_ha,
            v_benchmark.target_yield_per_hectare,
            v_variance_percent,
            'active'
          );
        END IF;
      END IF;
    END;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_create_yield_from_harvest"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."auto_create_yield_from_harvest"() IS 'Automatically creates yield_history and performance_alerts when a harvest is recorded';



CREATE OR REPLACE FUNCTION "public"."auto_seed_chart_of_accounts"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  -- Seed chart of accounts for the new organization
  PERFORM seed_chart_of_accounts(NEW.id, COALESCE(NEW.currency, 'MAD'));
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_seed_chart_of_accounts"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."auto_seed_chart_of_accounts"() IS 'Trigger function that automatically seeds chart of accounts when a new organization is created.';



CREATE OR REPLACE FUNCTION "public"."block_write_without_subscription"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  user_org_id UUID;
  is_valid BOOLEAN;
BEGIN
  -- Get current user's organization
  SELECT organization_id INTO user_org_id
  FROM public.organization_users
  WHERE user_id = auth.uid()
    AND is_active = true
  LIMIT 1;

  -- No organization membership = block
  IF user_org_id IS NULL THEN
    RAISE EXCEPTION 'User is not a member of any organization';
  END IF;

  -- Check if organization has valid subscription
  is_valid := public.has_valid_subscription(user_org_id);

  -- Block if subscription invalid
  IF NOT is_valid THEN
    RAISE EXCEPTION 'Organization does not have a valid subscription. Please upgrade to continue.';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."block_write_without_subscription"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."block_write_without_subscription"() IS 'Trigger function that blocks INSERT/UPDATE/DELETE operations on tables if user organization does not have valid subscription.';



CREATE OR REPLACE FUNCTION "public"."calculate_daily_worker_payment"("p_worker_id" "uuid", "p_period_start" "date", "p_period_end" "date") RETURNS TABLE("base_amount" numeric, "days_worked" integer, "hours_worked" numeric, "tasks_completed" integer, "overtime_amount" numeric)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_daily_rate DECIMAL;
  v_base_amount DECIMAL := 0;
  v_days_worked INTEGER := 0;
  v_hours_worked DECIMAL := 0;
  v_tasks_completed INTEGER := 0;
  v_overtime_amount DECIMAL := 0;
BEGIN
  -- Get worker's daily rate
  SELECT w.daily_rate INTO v_daily_rate
  FROM workers w
  WHERE w.id = p_worker_id;
  
  IF v_daily_rate IS NULL THEN
    RAISE EXCEPTION 'Worker does not have a daily rate configured';
  END IF;
  
  -- Count days worked from work_records
  SELECT 
    COUNT(DISTINCT wr.work_date),
    COALESCE(SUM(wr.hours_worked), 0)
  INTO v_days_worked, v_hours_worked
  FROM work_records wr
  WHERE wr.worker_id = p_worker_id
    AND wr.work_date BETWEEN p_period_start AND p_period_end;
  
  -- Count completed tasks
  SELECT COUNT(*)
  INTO v_tasks_completed
  FROM tasks t
  WHERE t.assigned_to = p_worker_id
    AND t.status = 'completed'
    AND t.completed_date BETWEEN p_period_start AND p_period_end;
  
  -- Calculate base amount
  v_base_amount := v_days_worked * v_daily_rate;
  
  -- Calculate overtime (hours > 8 per day at 1.5x rate)
  IF v_hours_worked > (v_days_worked * 8) THEN
    v_overtime_amount := (v_hours_worked - (v_days_worked * 8)) * (v_daily_rate / 8) * 1.5;
  END IF;
  
  RETURN QUERY SELECT 
    v_base_amount,
    v_days_worked,
    v_hours_worked,
    v_tasks_completed,
    v_overtime_amount;
END;
$$;


ALTER FUNCTION "public"."calculate_daily_worker_payment"("p_worker_id" "uuid", "p_period_start" "date", "p_period_end" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_fixed_salary_payment"("p_worker_id" "uuid", "p_period_start" "date", "p_period_end" "date") RETURNS TABLE("base_amount" numeric, "days_worked" integer, "hours_worked" numeric, "tasks_completed" integer, "overtime_amount" numeric)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_monthly_salary DECIMAL;
  v_base_amount DECIMAL := 0;
  v_days_worked INTEGER := 0;
  v_hours_worked DECIMAL := 0;
  v_tasks_completed INTEGER := 0;
  v_overtime_amount DECIMAL := 0;
  v_hourly_rate DECIMAL;
BEGIN
  -- Get worker's monthly salary
  SELECT w.monthly_salary INTO v_monthly_salary
  FROM workers w
  WHERE w.id = p_worker_id;
  
  IF v_monthly_salary IS NULL THEN
    RAISE EXCEPTION 'Worker does not have a monthly salary configured';
  END IF;
  
  -- Base amount is monthly salary
  v_base_amount := v_monthly_salary;
  
  -- Calculate hourly rate (based on 176 hours/month)
  v_hourly_rate := v_monthly_salary / 176;
  
  -- Get work hours from time logs
  SELECT 
    COUNT(DISTINCT DATE(ttl.start_time)),
    COALESCE(SUM(ttl.total_hours), 0)
  INTO v_days_worked, v_hours_worked
  FROM task_time_logs ttl
  WHERE ttl.worker_id = p_worker_id
    AND DATE(ttl.start_time) BETWEEN p_period_start AND p_period_end;
  
  -- Count completed tasks
  SELECT COUNT(*)
  INTO v_tasks_completed
  FROM tasks t
  WHERE t.assigned_to = p_worker_id
    AND t.status = 'completed'
    AND t.completed_date BETWEEN p_period_start AND p_period_end;
  
  -- Calculate overtime (hours > 176 per month at 1.5x rate)
  IF v_hours_worked > 176 THEN
    v_overtime_amount := (v_hours_worked - 176) * v_hourly_rate * 1.5;
  END IF;
  
  RETURN QUERY SELECT 
    v_base_amount,
    v_days_worked,
    v_hours_worked,
    v_tasks_completed,
    v_overtime_amount;
END;
$$;


ALTER FUNCTION "public"."calculate_fixed_salary_payment"("p_worker_id" "uuid", "p_period_start" "date", "p_period_end" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_metayage_share"("p_worker_id" "uuid", "p_gross_revenue" numeric, "p_total_charges" numeric DEFAULT 0) RETURNS numeric
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_worker RECORD;
  v_base_amount DECIMAL;
  v_share DECIMAL;
BEGIN
  -- Get worker details
  SELECT * INTO v_worker FROM workers WHERE id = p_worker_id;

  IF v_worker.worker_type != 'metayage' THEN
    RAISE EXCEPTION 'Worker is not a métayage worker';
  END IF;

  -- Calculate base amount based on calculation basis
  IF v_worker.calculation_basis = 'gross_revenue' THEN
    v_base_amount := p_gross_revenue;
  ELSE
    v_base_amount := p_gross_revenue - p_total_charges;
  END IF;

  -- Calculate worker's share
  v_share := v_base_amount * (v_worker.metayage_percentage / 100.0);

  RETURN v_share;
END;
$$;


ALTER FUNCTION "public"."calculate_metayage_share"("p_worker_id" "uuid", "p_gross_revenue" numeric, "p_total_charges" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_parcel_area_from_boundary"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  i integer;
  area_sum numeric := 0;
  x1 numeric;
  y1 numeric;
  x2 numeric;
  y2 numeric;
  points_count integer;
  first_coord_x numeric;
  first_coord_y numeric;
BEGIN
  -- Only calculate if boundary exists
  IF NEW.boundary IS NOT NULL THEN
    points_count := jsonb_array_length(NEW.boundary);

    -- Get first coordinate to detect coordinate system
    first_coord_x := (NEW.boundary->0->0)::numeric;
    first_coord_y := (NEW.boundary->0->1)::numeric;

    -- Use Shoelace formula to calculate area
    FOR i IN 0..(points_count - 2) LOOP
      x1 := (NEW.boundary->i->0)::numeric;
      y1 := (NEW.boundary->i->1)::numeric;
      x2 := (NEW.boundary->(i+1)->0)::numeric;
      y2 := (NEW.boundary->(i+1)->1)::numeric;

      area_sum := area_sum + (x1 * y2 - x2 * y1);
    END LOOP;

    -- Check if coordinates are in EPSG:3857 (Web Mercator) or geographic
    IF ABS(first_coord_x) > 20000 OR ABS(first_coord_y) > 20000 THEN
      -- Coordinates are in EPSG:3857 (meters), convert directly to hectares
      NEW.calculated_area := ABS(area_sum / 2) / 10000;
    ELSE
      -- Coordinates are geographic (degrees), use the old conversion
      NEW.calculated_area := ABS(area_sum / 2) * 111.32 * 111.32 / 10000;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."calculate_parcel_area_from_boundary"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_performance_rating"("variance_percent" numeric) RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
BEGIN
  IF variance_percent >= 10 THEN
    RETURN 'excellent';
  ELSIF variance_percent >= -5 THEN
    RETURN 'good';
  ELSIF variance_percent >= -20 THEN
    RETURN 'average';
  ELSIF variance_percent >= -35 THEN
    RETURN 'below_average';
  ELSE
    RETURN 'poor';
  END IF;
END;
$$;


ALTER FUNCTION "public"."calculate_performance_rating"("variance_percent" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_piece_work_payment"("p_worker_id" "uuid", "p_period_start" "date", "p_period_end" "date") RETURNS TABLE("base_amount" numeric, "units_completed" numeric, "piece_work_count" integer, "piece_work_ids" "uuid"[])
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_base_amount DECIMAL := 0;
  v_units_completed DECIMAL := 0;
  v_piece_work_count INTEGER := 0;
  v_piece_work_ids UUID[];
BEGIN
  -- Calculate total from piece_work_records
  SELECT
    COALESCE(SUM(pwr.total_amount), 0),
    COALESCE(SUM(pwr.units_completed), 0),
    COUNT(*),
    ARRAY_AGG(pwr.id)
  INTO
    v_base_amount,
    v_units_completed,
    v_piece_work_count,
    v_piece_work_ids
  FROM piece_work_records pwr
  WHERE pwr.worker_id = p_worker_id
    AND pwr.work_date BETWEEN p_period_start AND p_period_end
    AND pwr.payment_status = 'pending';

  RETURN QUERY SELECT v_base_amount, v_units_completed, v_piece_work_count, v_piece_work_ids;
END;
$$;


ALTER FUNCTION "public"."calculate_piece_work_payment"("p_worker_id" "uuid", "p_period_start" "date", "p_period_end" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_plant_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- If area and density are both set, auto-calculate plant_count
  IF NEW.area IS NOT NULL AND NEW.density_per_hectare IS NOT NULL THEN
    NEW.plant_count := ROUND(NEW.area * NEW.density_per_hectare);
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."calculate_plant_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_profitability"("p_organization_id" "uuid", "p_parcel_id" "uuid" DEFAULT NULL::"uuid", "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date") RETURNS TABLE("parcel_id" "uuid", "parcel_name" "text", "total_costs" numeric, "total_revenue" numeric, "net_profit" numeric, "profit_margin" numeric, "cost_breakdown" "jsonb", "revenue_breakdown" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
    RETURN QUERY
    WITH cost_summary AS (
        SELECT
            c.parcel_id,
            SUM(c.amount) as total_cost,
            jsonb_object_agg(c.cost_type, SUM(c.amount)) as costs_by_type
        FROM public.costs c
        WHERE c.organization_id = p_organization_id
        AND (p_parcel_id IS NULL OR c.parcel_id = p_parcel_id)
        AND (p_start_date IS NULL OR c.date >= p_start_date)
        AND (p_end_date IS NULL OR c.date <= p_end_date)
        GROUP BY c.parcel_id
    ),
    revenue_summary AS (
        SELECT
            r.parcel_id,
            SUM(r.amount) as total_rev,
            jsonb_object_agg(r.revenue_type, SUM(r.amount)) as revenue_by_type
        FROM public.revenues r
        WHERE r.organization_id = p_organization_id
        AND (p_parcel_id IS NULL OR r.parcel_id = p_parcel_id)
        AND (p_start_date IS NULL OR r.date >= p_start_date)
        AND (p_end_date IS NULL OR r.date <= p_end_date)
        GROUP BY r.parcel_id
    )
    SELECT
        COALESCE(cs.parcel_id, rs.parcel_id) as parcel_id,
        p.name as parcel_name,
        COALESCE(cs.total_cost, 0) as total_costs,
        COALESCE(rs.total_rev, 0) as total_revenue,
        COALESCE(rs.total_rev, 0) - COALESCE(cs.total_cost, 0) as net_profit,
        CASE
            WHEN COALESCE(rs.total_rev, 0) > 0
            THEN ((COALESCE(rs.total_rev, 0) - COALESCE(cs.total_cost, 0)) / rs.total_rev * 100)
            ELSE NULL
        END as profit_margin,
        COALESCE(cs.costs_by_type, '{}'::jsonb) as cost_breakdown,
        COALESCE(rs.revenue_by_type, '{}'::jsonb) as revenue_breakdown
    FROM cost_summary cs
    FULL OUTER JOIN revenue_summary rs ON cs.parcel_id = rs.parcel_id
    LEFT JOIN public.parcels p ON p.id = COALESCE(cs.parcel_id, rs.parcel_id);
END;
$$;


ALTER FUNCTION "public"."calculate_profitability"("p_organization_id" "uuid", "p_parcel_id" "uuid", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_task_payment"("p_task_id" "uuid") RETURNS TABLE("total_cost" numeric, "labor_cost" numeric, "material_cost" numeric, "units_completed" numeric, "payment_pending" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(total_amount), 0) as total_cost,
    COALESCE(SUM(CASE WHEN cost_type = 'labor' THEN total_amount ELSE 0 END), 0) as labor_cost,
    COALESCE(SUM(CASE WHEN cost_type = 'material' THEN total_amount ELSE 0 END), 0) as material_cost,
    COALESCE(SUM(units_completed), 0) as units_completed,
    COALESCE(SUM(CASE WHEN payment_status = 'pending' THEN total_amount ELSE 0 END), 0) as payment_pending
  FROM task_costs
  WHERE task_id = p_task_id;
END;
$$;


ALTER FUNCTION "public"."calculate_task_payment"("p_task_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_add_user"("org_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  sub_record RECORD;
  current_count INTEGER;
BEGIN
  -- Check subscription validity
  IF NOT public.has_valid_subscription(org_id) THEN
    RETURN FALSE;
  END IF;

  -- Get subscription limits
  SELECT * INTO sub_record
  FROM public.subscriptions
  WHERE organization_id = org_id
  LIMIT 1;

  -- Count current active users
  SELECT COUNT(*) INTO current_count
  FROM public.organization_users
  WHERE organization_id = org_id AND is_active = true;

  -- Check limit
  RETURN current_count < sub_record.max_users;
END;
$$;


ALTER FUNCTION "public"."can_add_user"("org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."can_add_user"("org_id" "uuid") IS 'Checks if organization can add more users based on subscription limits';



CREATE OR REPLACE FUNCTION "public"."can_create_farm"("org_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  sub_record RECORD;
  current_count INTEGER;
BEGIN
  -- Check subscription validity
  IF NOT public.has_valid_subscription(org_id) THEN
    RETURN FALSE;
  END IF;

  -- Get subscription limits
  SELECT * INTO sub_record
  FROM public.subscriptions
  WHERE organization_id = org_id
  LIMIT 1;

  -- Count current farms
  SELECT COUNT(*) INTO current_count
  FROM public.farms
  WHERE organization_id = org_id;

  -- Check limit
  RETURN current_count < sub_record.max_farms;
END;
$$;


ALTER FUNCTION "public"."can_create_farm"("org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."can_create_farm"("org_id" "uuid") IS 'Checks if organization can create more farms based on subscription limits';



CREATE OR REPLACE FUNCTION "public"."can_create_parcel"("org_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  sub_record RECORD;
  current_count INTEGER;
BEGIN
  -- Check subscription validity
  IF NOT public.has_valid_subscription(org_id) THEN
    RETURN FALSE;
  END IF;

  -- Get subscription limits
  SELECT * INTO sub_record
  FROM public.subscriptions
  WHERE organization_id = org_id
  LIMIT 1;

  -- Count current parcels
  SELECT COUNT(*) INTO current_count
  FROM public.parcels p
  JOIN public.farms f ON p.farm_id = f.id
  WHERE f.organization_id = org_id;

  -- Check limit
  RETURN current_count < sub_record.max_parcels;
END;
$$;


ALTER FUNCTION "public"."can_create_parcel"("org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."can_create_parcel"("org_id" "uuid") IS 'Checks if organization can create more parcels based on subscription limits';



CREATE OR REPLACE FUNCTION "public"."can_create_resource"("p_organization_id" "uuid", "p_resource_type" "text") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_subscription RECORD;
  v_resource_count INTEGER;
  v_max_allowed INTEGER;
BEGIN
  -- Get subscription
  SELECT * INTO v_subscription
  FROM public.subscriptions
  WHERE organization_id = p_organization_id
    AND status IN ('active', 'trialing')
    AND (current_period_end IS NULL OR current_period_end > NOW())
  LIMIT 1;

  IF v_subscription IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check resource limits based on type
  CASE p_resource_type
    WHEN 'farm' THEN
      SELECT COUNT(*) INTO v_resource_count
      FROM public.farms
      WHERE organization_id = p_organization_id;
      
      v_max_allowed := COALESCE(v_subscription.max_farms, 999999);
      
    WHEN 'parcel' THEN
      -- This would need farm_id parameter, simplified for now
      v_max_allowed := COALESCE(v_subscription.max_parcels, 999999);
      
    ELSE
      RETURN TRUE; -- Unknown resource type, allow
  END CASE;

  RETURN v_resource_count < v_max_allowed;
END;
$$;


ALTER FUNCTION "public"."can_create_resource"("p_organization_id" "uuid", "p_resource_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_user_perform_action"("user_id" "uuid", "org_id" "uuid", "resource_name" "text", "action_name" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.organization_users ou
        JOIN public.role_permissions rp ON rp.role_id = ou.role_id
        JOIN public.permissions p ON p.id = rp.permission_id
        WHERE ou.user_id = $1 
        AND ou.organization_id = $2
        AND ou.is_active = true
        AND p.resource = $3
        AND (p.action = $4 OR p.action = 'manage')
    );
END;
$_$;


ALTER FUNCTION "public"."can_user_perform_action"("user_id" "uuid", "org_id" "uuid", "resource_name" "text", "action_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_overdue_tasks"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE tasks
  SET status = 'overdue'
  WHERE status IN ('pending', 'assigned')
    AND due_date < CURRENT_DATE
    AND status != 'overdue';
END;
$$;


ALTER FUNCTION "public"."check_overdue_tasks"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_system_admin_for_reference_tables"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    is_admin BOOLEAN;
BEGIN
    -- Check if current user is system admin
    SELECT EXISTS (
        SELECT 1
        FROM public.organization_users ou
        WHERE ou.user_id = auth.uid()
            AND ou.is_active = true
            AND ou.role_id IN (
                SELECT id FROM public.roles WHERE name = 'system_admin'
            )
    ) INTO is_admin;

    IF NOT is_admin THEN
        RAISE EXCEPTION 'Only system administrators can modify reference tables';
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_system_admin_for_reference_tables"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."complete_task_with_payment"("p_task_id" "uuid", "p_units_completed" numeric DEFAULT NULL::numeric, "p_quality_rating" integer DEFAULT NULL::integer, "p_notes" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_task RECORD;
  v_worker RECORD;
  v_piece_work_id UUID;
  v_task_cost_id UUID;
  v_payment_amount DECIMAL;
BEGIN
  -- Get task details
  SELECT * INTO v_task
  FROM tasks
  WHERE id = p_task_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found: %', p_task_id;
  END IF;

  -- Update task completion
  UPDATE tasks
  SET
    status = 'completed',
    completed_date = NOW(),
    actual_end = NOW(),
    units_completed = COALESCE(p_units_completed, units_required, units_completed),
    completion_percentage = 100,
    updated_at = NOW()
  WHERE id = p_task_id;

  -- If payment is per_unit and worker is assigned, create piece-work record
  IF v_task.payment_type = 'per_unit' AND v_task.assigned_to IS NOT NULL AND v_task.work_unit_id IS NOT NULL THEN

    -- Get worker details
    SELECT * INTO v_worker
    FROM workers
    WHERE id = v_task.assigned_to;

    IF FOUND THEN
      -- Calculate payment amount
      v_payment_amount := COALESCE(p_units_completed, v_task.units_required, v_task.units_completed, 0)
                         * COALESCE(v_task.rate_per_unit, v_worker.rate_per_unit, 0);

      -- Create piece-work record
      INSERT INTO piece_work_records (
        organization_id,
        worker_id,
        work_unit_id,
        task_id,
        work_date,
        units_completed,
        rate_per_unit,
        quality_rating,
        notes,
        payment_status
      ) VALUES (
        v_task.organization_id,
        v_task.assigned_to,
        v_task.work_unit_id,
        p_task_id,
        v_task.completed_date::DATE,
        COALESCE(p_units_completed, v_task.units_required, v_task.units_completed),
        COALESCE(v_task.rate_per_unit, v_worker.rate_per_unit),
        p_quality_rating,
        p_notes,
        'pending'
      )
      RETURNING id INTO v_piece_work_id;

      -- Create task cost entry for labor
      INSERT INTO task_costs (
        task_id,
        organization_id,
        cost_type,
        description,
        quantity,
        unit_price,
        total_amount,
        payment_status,
        work_unit_id,
        units_completed,
        rate_per_unit,
        worker_id,
        piece_work_record_id
      ) VALUES (
        p_task_id,
        v_task.organization_id,
        'labor',
        'Piece-work payment: ' || v_task.title,
        COALESCE(p_units_completed, v_task.units_required, v_task.units_completed),
        COALESCE(v_task.rate_per_unit, v_worker.rate_per_unit),
        v_payment_amount,
        'pending',
        v_task.work_unit_id,
        COALESCE(p_units_completed, v_task.units_required, v_task.units_completed),
        COALESCE(v_task.rate_per_unit, v_worker.rate_per_unit),
        v_task.assigned_to,
        v_piece_work_id
      )
      RETURNING id INTO v_task_cost_id;

      RETURN v_task_cost_id;
    END IF;
  END IF;

  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."complete_task_with_payment"("p_task_id" "uuid", "p_units_completed" numeric, "p_quality_rating" integer, "p_notes" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."complete_task_with_payment"("p_task_id" "uuid", "p_units_completed" numeric, "p_quality_rating" integer, "p_notes" "text") IS 'Complete a task and automatically create piece-work records and payment entries';



CREATE OR REPLACE FUNCTION "public"."create_default_subscription_for_org"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  -- Set a flag to indicate this is our trusted trigger
  PERFORM set_config('app.creating_org_subscription', 'true', true);

  INSERT INTO subscriptions (
    organization_id, plan_type, status,
    max_farms, max_parcels, max_users, max_satellite_reports,
    has_analytics, has_sensor_integration, has_ai_recommendations,
    has_advanced_reporting, has_api_access, has_priority_support
  ) VALUES (
    NEW.id, 'essential', 'active',
    1, 10, 1, 0,
    false, false, false,
    false, false, false
  );

  -- Clear the flag
  PERFORM set_config('app.creating_org_subscription', NULL, true);

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Clear flag even on error
    PERFORM set_config('app.creating_org_subscription', NULL, true);
    RAISE WARNING 'Failed to create subscription for org %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_default_subscription_for_org"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_default_subscription_for_org"() IS 'Auto-creates essential subscription when a new organization is created. Uses session flag to bypass enforcement.';



CREATE OR REPLACE FUNCTION "public"."create_material_issue_from_so"("p_sales_order_id" "uuid", "p_warehouse_id" "uuid", "p_issue_date" "date" DEFAULT CURRENT_DATE) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_so RECORD;
  v_entry_id UUID;
  v_entry_number TEXT;
  v_so_item RECORD;
BEGIN
  -- Get sales order details
  SELECT * INTO v_so
  FROM sales_orders
  WHERE id = p_sales_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sales order not found';
  END IF;

  -- Check if already issued
  IF v_so.stock_issued THEN
    RAISE EXCEPTION 'Stock already issued for this sales order';
  END IF;

  -- Generate entry number
  SELECT generate_stock_entry_number(v_so.organization_id) INTO v_entry_number;

  -- Create stock entry
  INSERT INTO stock_entries (
    organization_id,
    entry_number,
    entry_type,
    entry_date,
    from_warehouse_id,
    reference_type,
    reference_id,
    reference_number,
    purpose,
    status,
    created_by
  ) VALUES (
    v_so.organization_id,
    v_entry_number,
    'Material Issue',
    p_issue_date,
    p_warehouse_id,
    'Sales Order',
    p_sales_order_id,
    v_so.order_number,
    'Material issue for Sales Order ' || v_so.order_number,
    'Draft',
    auth.uid()
  )
  RETURNING id INTO v_entry_id;

  -- Create stock entry items from sales order items
  FOR v_so_item IN
    SELECT * FROM sales_order_items WHERE sales_order_id = p_sales_order_id
  LOOP
    INSERT INTO stock_entry_items (
      stock_entry_id,
      line_number,
      item_id,
      item_name,
      quantity,
      unit,
      source_warehouse_id,
      notes
    ) VALUES (
      v_entry_id,
      v_so_item.line_number,
      v_so_item.item_id,
      v_so_item.item_name,
      v_so_item.quantity,
      v_so_item.unit_of_measure,
      p_warehouse_id,
      'From SO line ' || v_so_item.line_number
    );
  END LOOP;

  -- Update sales order
  UPDATE sales_orders
  SET stock_entry_id = v_entry_id
  WHERE id = p_sales_order_id;

  RETURN v_entry_id;
END;
$$;


ALTER FUNCTION "public"."create_material_issue_from_so"("p_sales_order_id" "uuid", "p_warehouse_id" "uuid", "p_issue_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_material_issue_from_so"("p_sales_order_id" "uuid", "p_warehouse_id" "uuid", "p_issue_date" "date") IS 'Create Material Issue stock entry from Sales Order';



CREATE OR REPLACE FUNCTION "public"."create_material_receipt_from_po"("p_purchase_order_id" "uuid", "p_warehouse_id" "uuid", "p_receipt_date" "date" DEFAULT CURRENT_DATE) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_po RECORD;
  v_entry_id UUID;
  v_entry_number TEXT;
  v_po_item RECORD;
BEGIN
  -- Get purchase order details
  SELECT * INTO v_po
  FROM purchase_orders
  WHERE id = p_purchase_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase order not found';
  END IF;

  -- Check if already received
  IF v_po.stock_received THEN
    RAISE EXCEPTION 'Stock already received for this purchase order';
  END IF;

  -- Generate entry number
  SELECT generate_stock_entry_number(v_po.organization_id) INTO v_entry_number;

  -- Create stock entry
  INSERT INTO stock_entries (
    organization_id,
    entry_number,
    entry_type,
    entry_date,
    to_warehouse_id,
    reference_type,
    reference_id,
    reference_number,
    purpose,
    status,
    created_by
  ) VALUES (
    v_po.organization_id,
    v_entry_number,
    'Material Receipt',
    p_receipt_date,
    p_warehouse_id,
    'Purchase Order',
    p_purchase_order_id,
    v_po.order_number,
    'Material receipt from Purchase Order ' || v_po.order_number,
    'Draft',
    auth.uid()
  )
  RETURNING id INTO v_entry_id;

  -- Create stock entry items from purchase order items
  FOR v_po_item IN
    SELECT * FROM purchase_order_items WHERE purchase_order_id = p_purchase_order_id
  LOOP
    INSERT INTO stock_entry_items (
      stock_entry_id,
      line_number,
      item_id,
      item_name,
      quantity,
      unit,
      target_warehouse_id,
      cost_per_unit,
      batch_number,
      notes
    ) VALUES (
      v_entry_id,
      v_po_item.line_number,
      v_po_item.item_id,
      v_po_item.item_name,
      v_po_item.quantity,
      v_po_item.unit_of_measure,
      p_warehouse_id,
      v_po_item.unit_price,
      NULL, -- Batch number to be added manually if needed
      'From PO line ' || v_po_item.line_number
    );
  END LOOP;

  -- Update purchase order
  UPDATE purchase_orders
  SET stock_entry_id = v_entry_id
  WHERE id = p_purchase_order_id;

  RETURN v_entry_id;
END;
$$;


ALTER FUNCTION "public"."create_material_receipt_from_po"("p_purchase_order_id" "uuid", "p_warehouse_id" "uuid", "p_receipt_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_material_receipt_from_po"("p_purchase_order_id" "uuid", "p_warehouse_id" "uuid", "p_receipt_date" "date") IS 'Create Material Receipt stock entry from Purchase Order';



CREATE OR REPLACE FUNCTION "public"."create_metayage_settlement_from_harvest"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_worker RECORD;
  v_worker_data JSONB;
  v_metayage_worker_ids UUID[];
BEGIN
  -- Only proceed if harvest is sold/delivered
  IF NEW.status = 'delivered' OR NEW.status = 'sold' THEN
    -- Extract metayage worker IDs from workers JSONB
    SELECT ARRAY_AGG(DISTINCT (worker->>'worker_id')::UUID)
    INTO v_metayage_worker_ids
    FROM harvest_records hr,
         LATERAL jsonb_array_elements(hr.workers) AS worker
    WHERE hr.id = NEW.id
      AND (worker->>'worker_id')::UUID IN (
        SELECT id FROM workers WHERE worker_type = 'metayage'
      );
    
    -- Create settlement for each metayage worker
    IF v_metayage_worker_ids IS NOT NULL THEN
      FOR v_worker IN 
        SELECT 
          w.*,
          (SELECT worker->>'hours_worked' 
           FROM jsonb_array_elements(NEW.workers) AS worker 
           WHERE (worker->>'worker_id')::UUID = w.id
          )::DECIMAL AS hours_worked
        FROM workers w
        WHERE w.id = ANY(v_metayage_worker_ids)
      LOOP
        -- Get actual revenue from delivery
        DECLARE
          v_actual_revenue DECIMAL;
        BEGIN
          SELECT SUM(di.total_amount)
          INTO v_actual_revenue
          FROM delivery_items di
          WHERE di.harvest_record_id = NEW.id;
          
          -- Create settlement if revenue exists
          IF v_actual_revenue IS NOT NULL AND v_actual_revenue > 0 THEN
            INSERT INTO metayage_settlements (
              worker_id,
              farm_id,
              parcel_id,
              period_start,
              period_end,
              harvest_date,
              gross_revenue,
              worker_percentage,
              worker_share_amount,
              calculation_basis,
              notes
            ) VALUES (
              v_worker.id,
              NEW.farm_id,
              NEW.parcel_id,
              NEW.harvest_date,
              NEW.harvest_date,
              NEW.harvest_date,
              v_actual_revenue,
              v_worker.metayage_percentage,
              v_actual_revenue * (v_worker.metayage_percentage / 100),
              v_worker.calculation_basis,
              'Auto-generated from harvest: ' || NEW.id
            )
            ON CONFLICT DO NOTHING;
          END IF;
        END;
      END LOOP;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_metayage_settlement_from_harvest"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_payment_journal_entry"("p_payment_record_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_journal_entry_id UUID;
  v_organization_id UUID;
  v_farm_id UUID;
  v_worker_id UUID;
  v_net_amount DECIMAL;
  v_payment_date DATE;
  v_payment_method TEXT;
  v_payment_type TEXT;
  v_reference TEXT;

  -- Account IDs (need to be looked up)
  v_labor_expense_account_id UUID;
  v_cash_account_id UUID;
  v_bank_account_id UUID;
  v_payable_account_id UUID;
  v_target_account_id UUID;

  -- Cost center
  v_cost_center_id UUID;
BEGIN
  -- Get payment record details
  SELECT
    pr.organization_id,
    pr.farm_id,
    pr.worker_id,
    pr.net_amount,
    pr.payment_date,
    pr.payment_method,
    pr.payment_type,
    pr.payment_reference
  INTO
    v_organization_id,
    v_farm_id,
    v_worker_id,
    v_net_amount,
    v_payment_date,
    v_payment_method,
    v_payment_type,
    v_reference
  FROM payment_records pr
  WHERE pr.id = p_payment_record_id;

  -- Look up labor expense account (e.g., code 6200)
  SELECT id INTO v_labor_expense_account_id
  FROM accounts
  WHERE organization_id = v_organization_id
    AND account_type = 'Expense'
    AND account_subtype ILIKE '%labor%'
  LIMIT 1;

  -- Look up payment account based on payment method
  IF v_payment_method = 'cash' THEN
    SELECT id INTO v_cash_account_id
    FROM accounts
    WHERE organization_id = v_organization_id
      AND account_type = 'Asset'
      AND account_subtype ILIKE '%cash%'
    LIMIT 1;
    v_target_account_id := v_cash_account_id;

  ELSIF v_payment_method IN ('bank_transfer', 'check') THEN
    SELECT id INTO v_bank_account_id
    FROM accounts
    WHERE organization_id = v_organization_id
      AND account_type = 'Asset'
      AND account_subtype ILIKE '%bank%'
    LIMIT 1;
    v_target_account_id := v_bank_account_id;

  ELSE
    -- For other methods or pending payments, use accounts payable
    SELECT id INTO v_payable_account_id
    FROM accounts
    WHERE organization_id = v_organization_id
      AND account_type = 'Liability'
      AND account_subtype ILIKE '%payable%'
    LIMIT 1;
    v_target_account_id := v_payable_account_id;
  END IF;

  -- Get cost center for farm
  SELECT id INTO v_cost_center_id
  FROM cost_centers
  WHERE organization_id = v_organization_id
    AND farm_id = v_farm_id
  LIMIT 1;

  -- Skip if accounts not found
  IF v_labor_expense_account_id IS NULL OR v_target_account_id IS NULL THEN
    RAISE NOTICE 'Required accounts not found for organization %. Skipping journal entry.', v_organization_id;
    RETURN NULL;
  END IF;

  -- Create journal entry
  INSERT INTO journal_entries (
    organization_id,
    entry_date,
    entry_type,
    reference,
    description,
    source_document_type,
    source_document_id,
    status,
    created_by
  ) VALUES (
    v_organization_id,
    COALESCE(v_payment_date, CURRENT_DATE),
    'payment',
    COALESCE(v_reference, 'PAY-' || p_payment_record_id::TEXT),
    'Labor payment - ' || v_payment_type,
    'payment_record',
    p_payment_record_id,
    'posted',
    auth.uid()
  )
  RETURNING id INTO v_journal_entry_id;

  -- Create debit line (Labor Expense)
  INSERT INTO journal_items (
    journal_entry_id,
    account_id,
    cost_center_id,
    debit,
    credit,
    description
  ) VALUES (
    v_journal_entry_id,
    v_labor_expense_account_id,
    v_cost_center_id,
    v_net_amount,
    0,
    'Labor expense'
  );

  -- Create credit line (Cash/Bank/Payable)
  INSERT INTO journal_items (
    journal_entry_id,
    account_id,
    debit,
    credit,
    description
  ) VALUES (
    v_journal_entry_id,
    v_target_account_id,
    0,
    v_net_amount,
    'Payment to worker - ' || v_payment_method
  );

  RETURN v_journal_entry_id;
END;
$$;


ALTER FUNCTION "public"."create_payment_journal_entry"("p_payment_record_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_role_from_template"("template_id" "uuid", "org_id" "uuid", "custom_name" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    new_role_id UUID;
    template_data RECORD;
BEGIN
    -- Check permissions
    IF NOT public.user_has_permission_for_org(auth.uid(), org_id, 'users.manage') THEN
        RAISE EXCEPTION 'Insufficient permissions to create roles';
    END IF;

    -- Get template data
    SELECT * INTO template_data FROM public.role_templates WHERE id = template_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Template not found';
    END IF;

    -- Create new role
    INSERT INTO public.roles (name, display_name, description, level, is_active)
    VALUES (
        COALESCE(custom_name, template_data.name || '_' || org_id::text),
        template_data.display_name,
        template_data.description,
        3, -- Default to farm_manager level
        true
    ) RETURNING id INTO new_role_id;

    -- Assign permissions from template
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT new_role_id, p.id
    FROM public.permissions p
    WHERE p.name = ANY(template_data.permissions);

    RETURN new_role_id;
END;
$$;


ALTER FUNCTION "public"."create_role_from_template"("template_id" "uuid", "org_id" "uuid", "custom_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_sales_order_from_reception_batch"("p_reception_batch_id" "uuid", "p_customer_id" "uuid", "p_item_id" "uuid", "p_unit_price" numeric) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_batch reception_batches%ROWTYPE;
  v_sales_order_id UUID;
  v_order_number TEXT;
  v_quantity DECIMAL(10, 2);
  v_unit TEXT;
BEGIN
  -- Get reception batch
  SELECT * INTO v_batch
  FROM reception_batches
  WHERE id = p_reception_batch_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reception batch not found';
  END IF;

  IF v_batch.status = 'processed' THEN
    RAISE EXCEPTION 'Reception batch already processed';
  END IF;

  -- Determine quantity and unit
  v_quantity := COALESCE(v_batch.quantity, v_batch.weight);
  v_unit := COALESCE(v_batch.quantity_unit, v_batch.weight_unit);

  -- Generate order number
  SELECT 'SO-RCP-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' ||
         LPAD((
           SELECT COALESCE(MAX(
             CAST(NULLIF(REGEXP_REPLACE(SPLIT_PART(order_number, '-', 4), '[^0-9]', '', 'g'), '') AS INTEGER)
           ), 0) + 1
           FROM sales_orders
           WHERE organization_id = v_batch.organization_id
             AND order_number LIKE 'SO-RCP-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-%'
         )::TEXT, 4, '0')
  INTO v_order_number;

  -- Create sales order
  INSERT INTO sales_orders (
    organization_id,
    customer_id,
    order_number,
    order_date,
    status,
    notes,
    created_by
  ) VALUES (
    v_batch.organization_id,
    p_customer_id,
    v_order_number,
    v_batch.reception_date,
    'draft',
    'Direct sale from reception batch ' || v_batch.batch_code,
    v_batch.created_by
  ) RETURNING id INTO v_sales_order_id;

  -- Create sales order item
  INSERT INTO sales_order_items (
    sales_order_id,
    item_name,
    description,
    quantity,
    unit,
    rate
  ) VALUES (
    v_sales_order_id,
    COALESCE(v_batch.culture_type, 'Product') || ' - ' || v_batch.batch_code,
    'Quality: ' || COALESCE(v_batch.quality_grade, 'N/A'),
    v_quantity,
    v_unit,
    p_unit_price
  );

  -- Update reception batch
  UPDATE reception_batches
  SET
    sales_order_id = v_sales_order_id,
    decision = 'direct_sale',
    status = 'decision_made',
    updated_at = NOW(),
    updated_by = auth.uid()
  WHERE id = p_reception_batch_id;

  RETURN v_sales_order_id;
END;
$$;


ALTER FUNCTION "public"."create_sales_order_from_reception_batch"("p_reception_batch_id" "uuid", "p_customer_id" "uuid", "p_item_id" "uuid", "p_unit_price" numeric) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_sales_order_from_reception_batch"("p_reception_batch_id" "uuid", "p_customer_id" "uuid", "p_item_id" "uuid", "p_unit_price" numeric) IS 'Create Sales Order from reception batch for direct sale';



CREATE OR REPLACE FUNCTION "public"."create_stock_entry_from_reception_batch"("p_reception_batch_id" "uuid", "p_destination_warehouse_id" "uuid", "p_item_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_batch reception_batches%ROWTYPE;
  v_stock_entry_id UUID;
  v_entry_number TEXT;
  v_quantity DECIMAL(10, 2);
  v_unit TEXT;
BEGIN
  -- Get reception batch
  SELECT * INTO v_batch
  FROM reception_batches
  WHERE id = p_reception_batch_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reception batch not found';
  END IF;

  IF v_batch.status = 'processed' THEN
    RAISE EXCEPTION 'Reception batch already processed';
  END IF;

  -- Determine quantity and unit
  v_quantity := COALESCE(v_batch.quantity, v_batch.weight);
  v_unit := COALESCE(v_batch.quantity_unit, v_batch.weight_unit);

  -- Generate entry number
  SELECT 'MR-RCP-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' ||
         LPAD((
           SELECT COALESCE(MAX(
             CAST(NULLIF(REGEXP_REPLACE(SPLIT_PART(entry_number, '-', 4), '[^0-9]', '', 'g'), '') AS INTEGER)
           ), 0) + 1
           FROM stock_entries
           WHERE organization_id = v_batch.organization_id
             AND entry_number LIKE 'MR-RCP-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-%'
         )::TEXT, 4, '0')
  INTO v_entry_number;

  -- Determine if it's a transfer or receipt
  -- If destination is same as reception warehouse, it's just a receipt (stays in place)
  -- If destination is different, it's a transfer
  IF p_destination_warehouse_id = v_batch.warehouse_id THEN
    -- Material Receipt (stays at reception warehouse)
    INSERT INTO stock_entries (
      organization_id,
      entry_type,
      entry_number,
      entry_date,
      to_warehouse_id,
      reference_type,
      reference_id,
      reference_number,
      reception_batch_id,
      purpose,
      status,
      created_by
    ) VALUES (
      v_batch.organization_id,
      'Material Receipt',
      v_entry_number,
      v_batch.reception_date,
      p_destination_warehouse_id,
      'reception_batch',
      v_batch.id,
      v_batch.batch_code,
      p_reception_batch_id,
      'Reception from ' || v_batch.batch_code,
      'Draft',
      v_batch.created_by
    ) RETURNING id INTO v_stock_entry_id;
  ELSE
    -- Stock Transfer (move to different warehouse)
    INSERT INTO stock_entries (
      organization_id,
      entry_type,
      entry_number,
      entry_date,
      from_warehouse_id,
      to_warehouse_id,
      reference_type,
      reference_id,
      reference_number,
      reception_batch_id,
      purpose,
      status,
      created_by
    ) VALUES (
      v_batch.organization_id,
      'Stock Transfer',
      REPLACE(v_entry_number, 'MR-RCP', 'ST-RCP'),
      v_batch.reception_date,
      v_batch.warehouse_id,
      p_destination_warehouse_id,
      'reception_batch',
      v_batch.id,
      v_batch.batch_code,
      p_reception_batch_id,
      'Transfer from reception ' || v_batch.batch_code,
      'Draft',
      v_batch.created_by
    ) RETURNING id INTO v_stock_entry_id;
  END IF;

  -- Create stock entry item
  INSERT INTO stock_entry_items (
    stock_entry_id,
    item_id,
    quantity,
    unit,
    batch_number,
    notes
  ) VALUES (
    v_stock_entry_id,
    p_item_id,
    v_quantity,
    v_unit,
    v_batch.batch_code,
    'Quality: ' || COALESCE(v_batch.quality_grade, 'N/A') ||
    ', Score: ' || COALESCE(v_batch.quality_score::TEXT, 'N/A')
  );

  -- Update reception batch
  UPDATE reception_batches
  SET
    stock_entry_id = v_stock_entry_id,
    destination_warehouse_id = p_destination_warehouse_id,
    decision = 'storage',
    status = 'decision_made',
    updated_at = NOW(),
    updated_by = auth.uid()
  WHERE id = p_reception_batch_id;

  RETURN v_stock_entry_id;
END;
$$;


ALTER FUNCTION "public"."create_stock_entry_from_reception_batch"("p_reception_batch_id" "uuid", "p_destination_warehouse_id" "uuid", "p_item_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_stock_entry_from_reception_batch"("p_reception_batch_id" "uuid", "p_destination_warehouse_id" "uuid", "p_item_id" "uuid") IS 'Create Material Receipt or Stock Transfer from reception batch depending on destination';



CREATE OR REPLACE FUNCTION "public"."create_stock_journal_entry"("p_stock_entry_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_entry stock_entries%ROWTYPE;
  v_mapping stock_account_mappings%ROWTYPE;
  v_journal_entry_id UUID;
  v_total_value DECIMAL(12, 2);
  v_item_record RECORD;
BEGIN
  -- Get stock entry
  SELECT * INTO v_entry FROM stock_entries WHERE id = p_stock_entry_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stock entry not found';
  END IF;

  IF v_entry.status != 'Posted' THEN
    RAISE EXCEPTION 'Stock entry must be posted before creating journal entry';
  END IF;

  IF v_entry.journal_entry_id IS NOT NULL THEN
    RAISE EXCEPTION 'Journal entry already exists for this stock entry';
  END IF;

  -- Calculate total value from stock entry items
  SELECT SUM(quantity * COALESCE(cost_per_unit, 0)) INTO v_total_value
  FROM stock_entry_items
  WHERE stock_entry_id = p_stock_entry_id;

  IF v_total_value IS NULL OR v_total_value = 0 THEN
    -- No value to post, skip journal entry
    RETURN NULL;
  END IF;

  -- Get account mapping
  SELECT * INTO v_mapping
  FROM stock_account_mappings
  WHERE organization_id = v_entry.organization_id
    AND entry_type = v_entry.entry_type
    AND item_category IS NULL
  LIMIT 1;

  IF NOT FOUND THEN
    -- No mapping found, skip journal entry
    RETURN NULL;
  END IF;

  -- Create journal entry
  INSERT INTO journal_entries (
    organization_id,
    entry_date,
    reference_type,
    reference_id,
    description,
    total_debit,
    total_credit,
    status,
    posted_at,
    posted_by,
    created_by
  ) VALUES (
    v_entry.organization_id,
    v_entry.entry_date,
    'stock_entry',
    v_entry.id,
    v_entry.entry_type || ' - ' || v_entry.entry_number,
    v_total_value,
    v_total_value,
    'posted',
    NOW(),
    v_entry.created_by,
    v_entry.created_by
  ) RETURNING id INTO v_journal_entry_id;

  -- Create journal items based on entry type
  IF v_entry.entry_type = 'Material Receipt' THEN
    -- Debit: Stock Asset, Credit: Stock Received (or Payables if from PO)
    INSERT INTO journal_items (journal_entry_id, account_id, description, debit, credit)
    VALUES
      (v_journal_entry_id, v_mapping.debit_account_id, 'Material Receipt', v_total_value, 0),
      (v_journal_entry_id, v_mapping.credit_account_id, 'Material Receipt', 0, v_total_value);

  ELSIF v_entry.entry_type = 'Material Issue' THEN
    -- Debit: Cost of Goods (or appropriate expense), Credit: Stock Asset
    INSERT INTO journal_items (journal_entry_id, account_id, description, debit, credit)
    VALUES
      (v_journal_entry_id, v_mapping.debit_account_id, 'Material Issue', v_total_value, 0),
      (v_journal_entry_id, v_mapping.credit_account_id, 'Material Issue', 0, v_total_value);

  ELSIF v_entry.entry_type = 'Stock Reconciliation' THEN
    -- Debit/Credit: Stock Adjustment Account
    INSERT INTO journal_items (journal_entry_id, account_id, description, debit, credit)
    VALUES
      (v_journal_entry_id, v_mapping.debit_account_id, 'Stock Adjustment', v_total_value, 0),
      (v_journal_entry_id, v_mapping.credit_account_id, 'Stock Adjustment', 0, v_total_value);
  END IF;

  -- Update stock entry with journal reference
  UPDATE stock_entries
  SET journal_entry_id = v_journal_entry_id
  WHERE id = p_stock_entry_id;

  RETURN v_journal_entry_id;
END;
$$;


ALTER FUNCTION "public"."create_stock_journal_entry"("p_stock_entry_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_stock_journal_entry"("p_stock_entry_id" "uuid") IS 'Create journal entry for posted stock entry';



CREATE OR REPLACE FUNCTION "public"."create_task_cost_journal_entry"("p_task_cost_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_task_cost RECORD;
  v_journal_id UUID;
  v_expense_account UUID;
  v_accounts_payable UUID;
  v_cash_account UUID;
  v_cost_center_id UUID;
BEGIN
  -- Get task cost details
  SELECT tc.*, t.farm_id, t.parcel_id
  INTO v_task_cost
  FROM task_costs tc
  JOIN tasks t ON tc.task_id = t.id
  WHERE tc.id = p_task_cost_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task cost not found: %', p_task_cost_id;
  END IF;

  -- Skip if journal already created
  IF v_task_cost.journal_entry_id IS NOT NULL THEN
    RETURN v_task_cost.journal_entry_id;
  END IF;

  -- Skip if not paid
  IF v_task_cost.payment_status != 'paid' THEN
    RETURN NULL;
  END IF;

  -- Get or create cost center for the parcel/farm
  IF v_task_cost.parcel_id IS NOT NULL THEN
    SELECT id INTO v_cost_center_id
    FROM cost_centers
    WHERE entity_type = 'parcel'
    AND entity_id = v_task_cost.parcel_id
    AND organization_id = v_task_cost.organization_id;
  ELSIF v_task_cost.farm_id IS NOT NULL THEN
    SELECT id INTO v_cost_center_id
    FROM cost_centers
    WHERE entity_type = 'farm'
    AND entity_id = v_task_cost.farm_id
    AND organization_id = v_task_cost.organization_id;
  END IF;

  -- Get account IDs based on cost type
  SELECT id INTO v_expense_account
  FROM accounts
  WHERE organization_id = v_task_cost.organization_id
  AND account_type = 'expense'
  AND code = CASE v_task_cost.cost_type
    WHEN 'labor' THEN '6211'      -- Labor Expense
    WHEN 'material' THEN '6213'   -- Materials Expense
    WHEN 'equipment' THEN '6214'  -- Equipment Rental
    WHEN 'utility' THEN '6215'    -- Utilities
    ELSE '6290'                    -- Other Operating Expenses
  END
  LIMIT 1;

  -- Get Accounts Payable or Cash account
  IF v_task_cost.payment_date IS NULL THEN
    -- Not yet paid - use Accounts Payable
    SELECT id INTO v_accounts_payable
    FROM accounts
    WHERE organization_id = v_task_cost.organization_id
    AND account_type = 'liability'
    AND code = '2100'  -- Accounts Payable
    LIMIT 1;
  ELSE
    -- Paid - use Cash account
    SELECT id INTO v_cash_account
    FROM accounts
    WHERE organization_id = v_task_cost.organization_id
    AND account_type = 'asset'
    AND code = '1010'  -- Cash
    LIMIT 1;
  END IF;

  -- Create journal entry
  INSERT INTO journal_entries (
    organization_id,
    entry_date,
    entry_type,
    reference,
    description,
    status
  ) VALUES (
    v_task_cost.organization_id,
    COALESCE(v_task_cost.payment_date, v_task_cost.created_at::DATE),
    'expense',
    'TASK-' || LEFT(v_task_cost.task_id::TEXT, 8),
    v_task_cost.description || ' (Task Cost)',
    'posted'
  )
  RETURNING id INTO v_journal_id;

  -- Debit: Expense Account
  IF v_expense_account IS NOT NULL THEN
    INSERT INTO journal_items (
      journal_entry_id,
      account_id,
      debit_amount,
      credit_amount,
      description,
      cost_center_id
    ) VALUES (
      v_journal_id,
      v_expense_account,
      v_task_cost.total_amount,
      0,
      v_task_cost.description,
      v_cost_center_id
    );
  END IF;

  -- Credit: Accounts Payable or Cash
  IF v_cash_account IS NOT NULL THEN
    INSERT INTO journal_items (
      journal_entry_id,
      account_id,
      debit_amount,
      credit_amount,
      description
    ) VALUES (
      v_journal_id,
      v_cash_account,
      0,
      v_task_cost.total_amount,
      'Payment for ' || v_task_cost.description
    );
  ELSIF v_accounts_payable IS NOT NULL THEN
    INSERT INTO journal_items (
      journal_entry_id,
      account_id,
      debit_amount,
      credit_amount,
      description
    ) VALUES (
      v_journal_id,
      v_accounts_payable,
      0,
      v_task_cost.total_amount,
      'Accrued expense for ' || v_task_cost.description
    );
  END IF;

  -- Link journal entry to task cost
  UPDATE task_costs
  SET journal_entry_id = v_journal_id,
      updated_at = NOW()
  WHERE id = p_task_cost_id;

  RETURN v_journal_id;
END;
$$;


ALTER FUNCTION "public"."create_task_cost_journal_entry"("p_task_cost_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_task_cost_journal_entry"("p_task_cost_id" "uuid") IS 'Create accounting journal entry when a task cost is paid';



CREATE OR REPLACE FUNCTION "public"."debug_parcel_access"("test_user_id" "uuid", "test_org_id" "uuid") RETURNS TABLE("can_see_farms" boolean, "is_org_member" boolean, "farm_count" integer, "parcel_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        EXISTS (
            SELECT 1 FROM public.farms f
            INNER JOIN public.organization_users ou ON ou.organization_id = f.organization_id
            WHERE ou.user_id = test_user_id AND ou.organization_id = test_org_id AND ou.is_active = true
        ) as can_see_farms,
        EXISTS (
            SELECT 1 FROM public.organization_users ou
            WHERE ou.user_id = test_user_id AND ou.organization_id = test_org_id AND ou.is_active = true
        ) as is_org_member,
        (SELECT COUNT(*)::INTEGER FROM public.farms f WHERE f.organization_id = test_org_id) as farm_count,
        (SELECT COUNT(*)::INTEGER FROM public.parcels p
         INNER JOIN public.farms f ON f.id = p.farm_id
         WHERE f.organization_id = test_org_id) as parcel_count;
END;
$$;


ALTER FUNCTION "public"."debug_parcel_access"("test_user_id" "uuid", "test_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_all_users"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT id FROM auth.users LOOP
    PERFORM delete_user_cascade(user_record.id);
  END LOOP;
  RAISE NOTICE 'All users deleted successfully';
END;
$$;


ALTER FUNCTION "public"."delete_all_users"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."delete_all_users"() IS 'Deletes all users and their data - USE WITH CAUTION!';



CREATE OR REPLACE FUNCTION "public"."delete_user_cascade"("user_uuid" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  -- Delete from public schema tables first
  DELETE FROM user_profiles WHERE id = user_uuid;
  DELETE FROM organization_users WHERE user_id = user_uuid;
  DELETE FROM dashboard_settings WHERE user_id = user_uuid;
  DELETE FROM farm_management_roles WHERE user_id = user_uuid;
  DELETE FROM role_assignments_audit WHERE user_id = user_uuid OR assigned_by = user_uuid;
  DELETE FROM audit_logs WHERE user_id = user_uuid;
  DELETE FROM workers WHERE created_by = user_uuid;
  DELETE FROM costs WHERE created_by = user_uuid;
  DELETE FROM revenues WHERE created_by = user_uuid;
  DELETE FROM metayage_settlements WHERE created_by = user_uuid;
  DELETE FROM parcel_reports WHERE generated_by = user_uuid;
  DELETE FROM role_templates WHERE created_by = user_uuid;
  
  -- Delete organizations owned by user
  DELETE FROM organizations WHERE owner_id = user_uuid;
  
  -- Finally delete from auth schema
  DELETE FROM auth.users WHERE id = user_uuid;
  
  RAISE NOTICE 'User % and all related data deleted successfully', user_uuid;
END;
$$;


ALTER FUNCTION "public"."delete_user_cascade"("user_uuid" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."delete_user_cascade"("user_uuid" "uuid") IS 'Deletes a user and all their associated data across all tables';



CREATE OR REPLACE FUNCTION "public"."enforce_subscription_on_session"() RETURNS "void"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  user_org_id UUID;
  is_valid BOOLEAN;
  current_path TEXT;
BEGIN
  -- Get current user's organization
  -- Try to get from request headers first (set by frontend)
  BEGIN
    user_org_id := current_setting('request.jwt.claims', true)::json->>'organization_id';
  EXCEPTION WHEN OTHERS THEN
    user_org_id := NULL;
  END;

  -- If no org ID in JWT, try to get from organization_users table
  IF user_org_id IS NULL THEN
    SELECT organization_id INTO user_org_id
    FROM organization_users
    WHERE user_id = auth.uid()
      AND is_active = true
    LIMIT 1;
  END IF;

  -- Skip check if:
  -- 1. No organization (not logged in or no org assigned)
  -- 2. Service role (internal operations)
  -- 3. Auth operations
  IF user_org_id IS NULL OR
     current_setting('role', true) = 'service_role' OR
     current_setting('request.path', true) LIKE '/auth/%' THEN
    RETURN;
  END IF;

  -- Check if organization has valid subscription
  is_valid := has_valid_subscription(user_org_id);

  -- If not valid, block the request
  IF NOT is_valid THEN
    RAISE EXCEPTION
      'SUBSCRIPTION_REQUIRED: Organization does not have an active subscription. Visit /settings/subscription to subscribe.'
      USING ERRCODE = 'P0001', -- Custom error code
            HINT = 'Please subscribe to continue using the application';
  END IF;
END;
$$;


ALTER FUNCTION "public"."enforce_subscription_on_session"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."enforce_subscription_on_session"() IS 'Session-level subscription enforcement. Blocks ALL database queries if organization lacks valid subscription.';



CREATE OR REPLACE FUNCTION "public"."ensure_single_default_template"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.is_default = true THEN
    -- Unset other default templates of the same type
    UPDATE document_templates
    SET is_default = false
    WHERE organization_id = NEW.organization_id
      AND document_type = NEW.document_type
      AND id != NEW.id
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."ensure_single_default_template"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_delivery_note_number"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $_$
DECLARE
  v_year TEXT;
  v_month TEXT;
  v_sequence INTEGER;
  v_note_number TEXT;
BEGIN
  -- Get current year and month
  v_year := TO_CHAR(NEW.delivery_date, 'YYYY');
  v_month := TO_CHAR(NEW.delivery_date, 'MM');
  
  -- Get next sequence number for this month
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(delivery_note_number FROM '[0-9]+$') AS INTEGER)
  ), 0) + 1
  INTO v_sequence
  FROM deliveries
  WHERE delivery_note_number LIKE 'DN-' || v_year || v_month || '-%'
    AND organization_id = NEW.organization_id;
  
  -- Generate note number: DN-YYYYMM-0001
  v_note_number := 'DN-' || v_year || v_month || '-' || LPAD(v_sequence::TEXT, 4, '0');
  
  NEW.delivery_note_number := v_note_number;
  RETURN NEW;
END;
$_$;


ALTER FUNCTION "public"."generate_delivery_note_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_invoice_number"("p_organization_id" "uuid", "p_invoice_type" "public"."invoice_type") RETURNS character varying
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_prefix VARCHAR(10);
  v_sequence INT;
  v_year VARCHAR(4);
BEGIN
  v_year := EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR;

  IF p_invoice_type = 'sales' THEN
    v_prefix := 'INV';
  ELSE
    v_prefix := 'BILL';
  END IF;

  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM LENGTH(v_prefix || '-' || v_year || '-') + 1) AS INT)), 0) + 1
  INTO v_sequence
  FROM invoices
  WHERE organization_id = p_organization_id
    AND invoice_type = p_invoice_type
    AND invoice_number LIKE v_prefix || '-' || v_year || '-%';

  RETURN v_prefix || '-' || v_year || '-' || LPAD(v_sequence::VARCHAR, 5, '0');
END;
$$;


ALTER FUNCTION "public"."generate_invoice_number"("p_organization_id" "uuid", "p_invoice_type" "public"."invoice_type") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_item_code"("p_organization_id" "uuid", "p_item_group_id" "uuid", "p_prefix" "text" DEFAULT NULL::"text") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $_$
DECLARE
  v_prefix TEXT;
  v_sequence INTEGER;
  v_item_code TEXT;
  v_group_code TEXT;
BEGIN
  -- Get group code if available
  SELECT code INTO v_group_code
  FROM item_groups
  WHERE id = p_item_group_id;
  
  -- Use provided prefix or group code or default
  v_prefix := COALESCE(p_prefix, v_group_code, 'ITEM');
  
  -- Get next sequence number
  SELECT COALESCE(MAX(CAST(SUBSTRING(item_code FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO v_sequence
  FROM items
  WHERE organization_id = p_organization_id
    AND item_code ~ (v_prefix || '-[0-9]+$');
  
  -- Format: PREFIX-0001
  v_item_code := v_prefix || '-' || LPAD(v_sequence::TEXT, 4, '0');
  
  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM items WHERE organization_id = p_organization_id AND item_code = v_item_code) LOOP
    v_sequence := v_sequence + 1;
    v_item_code := v_prefix || '-' || LPAD(v_sequence::TEXT, 4, '0');
  END LOOP;
  
  RETURN v_item_code;
END;
$_$;


ALTER FUNCTION "public"."generate_item_code"("p_organization_id" "uuid", "p_item_group_id" "uuid", "p_prefix" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_journal_entry_number"("p_organization_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
DECLARE
  v_next_number INTEGER;
  v_entry_number TEXT;
BEGIN
  -- Get next number
  SELECT COALESCE(MAX(CAST(SUBSTRING(entry_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO v_next_number
  FROM public.journal_entries
  WHERE organization_id = p_organization_id
  AND entry_number LIKE 'JE-%';

  -- Format as JE-XXXXXX
  v_entry_number := 'JE-' || LPAD(v_next_number::TEXT, 6, '0');

  RETURN v_entry_number;
END;
$_$;


ALTER FUNCTION "public"."generate_journal_entry_number"("p_organization_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."generate_journal_entry_number"("p_organization_id" "uuid") IS 'Generates the next sequential journal entry number for an organization';



CREATE OR REPLACE FUNCTION "public"."generate_lab_order_number"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  new_number TEXT;
  year_part TEXT;
  sequence_part INTEGER;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');

  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 9) AS INTEGER)), 0) + 1
  INTO sequence_part
  FROM lab_service_orders
  WHERE order_number LIKE 'LAB-' || year_part || '-%';

  new_number := 'LAB-' || year_part || '-' || LPAD(sequence_part::TEXT, 6, '0');

  RETURN new_number;
END;
$$;


ALTER FUNCTION "public"."generate_lab_order_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_payment_number"("p_organization_id" "uuid", "p_payment_type" "public"."accounting_payment_type") RETURNS character varying
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_prefix VARCHAR(10);
  v_sequence INT;
  v_year VARCHAR(4);
BEGIN
  v_year := EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR;

  IF p_payment_type = 'receive' THEN
    v_prefix := 'PAY-IN';
  ELSE
    v_prefix := 'PAY-OUT';
  END IF;

  SELECT COALESCE(MAX(CAST(SUBSTRING(payment_number FROM LENGTH(v_prefix || '-' || v_year || '-') + 1) AS INT)), 0) + 1
  INTO v_sequence
  FROM accounting_payments
  WHERE organization_id = p_organization_id
    AND payment_type = p_payment_type
    AND payment_number LIKE v_prefix || '-' || v_year || '-%';

  RETURN v_prefix || '-' || v_year || '-' || LPAD(v_sequence::VARCHAR, 5, '0');
END;
$$;


ALTER FUNCTION "public"."generate_payment_number"("p_organization_id" "uuid", "p_payment_type" "public"."accounting_payment_type") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_purchase_order_number"("p_organization_id" "uuid") RETURNS character varying
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_count INTEGER;
  v_year VARCHAR(4);
  v_number VARCHAR(100);
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');

  SELECT COUNT(*) INTO v_count
  FROM purchase_orders
  WHERE organization_id = p_organization_id
    AND EXTRACT(YEAR FROM po_date) = EXTRACT(YEAR FROM NOW());

  v_number := 'PO-' || v_year || '-' || LPAD((v_count + 1)::TEXT, 5, '0');

  RETURN v_number;
END;
$$;


ALTER FUNCTION "public"."generate_purchase_order_number"("p_organization_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_quote_number"("p_organization_id" "uuid") RETURNS character varying
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_count INTEGER;
  v_year VARCHAR(4);
  v_number VARCHAR(100);
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');

  SELECT COUNT(*) INTO v_count
  FROM quotes
  WHERE organization_id = p_organization_id
    AND EXTRACT(YEAR FROM quote_date) = EXTRACT(YEAR FROM NOW());

  v_number := 'QT-' || v_year || '-' || LPAD((v_count + 1)::TEXT, 5, '0');

  RETURN v_number;
END;
$$;


ALTER FUNCTION "public"."generate_quote_number"("p_organization_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_reception_batch_code"("p_organization_id" "uuid", "p_warehouse_id" "uuid", "p_culture_type" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_year TEXT;
  v_warehouse_name TEXT;
  v_culture_prefix TEXT;
  v_sequence_number INTEGER;
  v_batch_code TEXT;
  v_warehouse_code TEXT;
BEGIN
  -- Get current year
  v_year := TO_CHAR(CURRENT_DATE, 'YYYY');

  -- Get warehouse name
  SELECT name INTO v_warehouse_name
  FROM warehouses
  WHERE id = p_warehouse_id;

  IF v_warehouse_name IS NULL THEN
    RAISE EXCEPTION 'Warehouse not found';
  END IF;

  -- Create warehouse code from first 2 letters of name
  v_warehouse_code := UPPER(LEFT(REGEXP_REPLACE(v_warehouse_name, '[^A-Za-z]', '', 'g'), 2));
  IF LENGTH(v_warehouse_code) < 2 THEN
    v_warehouse_code := LPAD(v_warehouse_code, 2, 'X');
  END IF;

  -- Get culture prefix (first 4 chars, uppercase)
  v_culture_prefix := UPPER(LEFT(COALESCE(p_culture_type, 'GENE'), 4));

  -- Get next sequence number for this org/warehouse/culture/year
  SELECT COALESCE(MAX(
    CAST(NULLIF(REGEXP_REPLACE(SPLIT_PART(batch_code, '-', 5), '[^0-9]', '', 'g'), '') AS INTEGER)
  ), 0) + 1
  INTO v_sequence_number
  FROM reception_batches
  WHERE organization_id = p_organization_id
    AND warehouse_id = p_warehouse_id
    AND batch_code LIKE 'LOT-' || v_year || '-' || v_culture_prefix || '-%'
    AND EXTRACT(YEAR FROM reception_date) = EXTRACT(YEAR FROM CURRENT_DATE);

  -- Format: LOT-YYYY-CULTURE-WH-NNNN
  -- Example: LOT-2025-OLIV-MA-0035
  v_batch_code := 'LOT-' || v_year || '-' || v_culture_prefix || '-' ||
                  v_warehouse_code || '-' ||
                  LPAD(v_sequence_number::TEXT, 4, '0');

  RETURN v_batch_code;
END;
$$;


ALTER FUNCTION "public"."generate_reception_batch_code"("p_organization_id" "uuid", "p_warehouse_id" "uuid", "p_culture_type" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."generate_reception_batch_code"("p_organization_id" "uuid", "p_warehouse_id" "uuid", "p_culture_type" "text") IS 'Generate unique batch code in format LOT-YYYY-CULTURE-WH-NNNN';



CREATE OR REPLACE FUNCTION "public"."generate_sales_order_number"("p_organization_id" "uuid") RETURNS character varying
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_count INTEGER;
  v_year VARCHAR(4);
  v_number VARCHAR(100);
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');

  SELECT COUNT(*) INTO v_count
  FROM sales_orders
  WHERE organization_id = p_organization_id
    AND EXTRACT(YEAR FROM order_date) = EXTRACT(YEAR FROM NOW());

  v_number := 'SO-' || v_year || '-' || LPAD((v_count + 1)::TEXT, 5, '0');

  RETURN v_number;
END;
$$;


ALTER FUNCTION "public"."generate_sales_order_number"("p_organization_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_stock_entry_number"("p_organization_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_year TEXT;
  v_count INTEGER;
  v_number TEXT;
BEGIN
  v_year := TO_CHAR(CURRENT_DATE, 'YYYY');

  SELECT COUNT(*) + 1 INTO v_count
  FROM stock_entries
  WHERE organization_id = p_organization_id
    AND entry_number LIKE 'SE-' || v_year || '-%';

  v_number := 'SE-' || v_year || '-' || LPAD(v_count::TEXT, 4, '0');

  RETURN v_number;
END;
$$;


ALTER FUNCTION "public"."generate_stock_entry_number"("p_organization_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_account_balance"("p_account_id" "uuid", "p_as_of_date" "date" DEFAULT CURRENT_DATE, "p_organization_id" "uuid" DEFAULT NULL::"uuid") RETURNS numeric
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_balance DECIMAL(15,2);
  v_account_type TEXT;
BEGIN
  -- Get account type
  SELECT account_type INTO v_account_type
  FROM public.accounts
  WHERE id = p_account_id;

  -- Calculate balance based on account type
  -- Debit balance accounts: Asset, Expense (debit increases balance)
  -- Credit balance accounts: Liability, Equity, Revenue (credit increases balance)

  IF v_account_type IN ('Asset', 'Expense') THEN
    SELECT COALESCE(SUM(ji.debit - ji.credit), 0)
    INTO v_balance
    FROM public.journal_items ji
    INNER JOIN public.journal_entries je ON je.id = ji.journal_entry_id
    WHERE ji.account_id = p_account_id
      AND je.entry_date <= p_as_of_date
      AND je.status = 'posted'
      AND (p_organization_id IS NULL OR je.organization_id = p_organization_id);
  ELSE
    -- Liability, Equity, Revenue
    SELECT COALESCE(SUM(ji.credit - ji.debit), 0)
    INTO v_balance
    FROM public.journal_items ji
    INNER JOIN public.journal_entries je ON je.id = ji.journal_entry_id
    WHERE ji.account_id = p_account_id
      AND je.entry_date <= p_as_of_date
      AND je.status = 'posted'
      AND (p_organization_id IS NULL OR je.organization_id = p_organization_id);
  END IF;

  RETURN v_balance;
END;
$$;


ALTER FUNCTION "public"."get_account_balance"("p_account_id" "uuid", "p_as_of_date" "date", "p_organization_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_account_balance"("p_account_id" "uuid", "p_as_of_date" "date", "p_organization_id" "uuid") IS 'Returns the account balance as of a specific date, respecting debit/credit nature';



CREATE OR REPLACE FUNCTION "public"."get_account_balance_period"("p_account_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_organization_id" "uuid" DEFAULT NULL::"uuid") RETURNS numeric
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_balance DECIMAL(15,2);
  v_account_type TEXT;
BEGIN
  SELECT account_type INTO v_account_type
  FROM public.accounts
  WHERE id = p_account_id;

  IF v_account_type IN ('Asset', 'Expense') THEN
    SELECT COALESCE(SUM(ji.debit - ji.credit), 0)
    INTO v_balance
    FROM public.journal_items ji
    INNER JOIN public.journal_entries je ON je.id = ji.journal_entry_id
    WHERE ji.account_id = p_account_id
      AND je.entry_date BETWEEN p_start_date AND p_end_date
      AND je.status = 'posted'
      AND (p_organization_id IS NULL OR je.organization_id = p_organization_id);
  ELSE
    SELECT COALESCE(SUM(ji.credit - ji.debit), 0)
    INTO v_balance
    FROM public.journal_items ji
    INNER JOIN public.journal_entries je ON je.id = ji.journal_entry_id
    WHERE ji.account_id = p_account_id
      AND je.entry_date BETWEEN p_start_date AND p_end_date
      AND je.status = 'posted'
      AND (p_organization_id IS NULL OR je.organization_id = p_organization_id);
  END IF;

  RETURN v_balance;
END;
$$;


ALTER FUNCTION "public"."get_account_balance_period"("p_account_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_organization_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_account_balance_period"("p_account_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_organization_id" "uuid") IS 'Returns the account balance for a specific date range';



CREATE OR REPLACE FUNCTION "public"."get_current_user_profile"() RETURNS TABLE("id" "uuid", "email" "text", "full_name" "text", "first_name" "text", "last_name" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    auth.uid() as id,
    auth.email() as email,
    COALESCE(up.full_name, '') as full_name,
    COALESCE(up.first_name, '') as first_name,
    COALESCE(up.last_name, '') as last_name
  FROM auth.users u
  LEFT JOIN public.user_profiles up ON u.id = up.id
  WHERE u.id = auth.uid();
END;
$$;


ALTER FUNCTION "public"."get_current_user_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_expiring_items"("p_organization_id" "uuid", "p_days_ahead" integer DEFAULT 30) RETURNS TABLE("item_id" "uuid", "item_name" "text", "batch_number" "text", "expiry_date" "date", "days_to_expiry" integer, "current_quantity" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.item_id,
    i.name AS item_name,
    b.batch_number,
    b.expiry_date,
    (b.expiry_date - CURRENT_DATE) AS days_to_expiry,
    b.current_quantity
  FROM inventory_batches b
  JOIN inventory_items i ON b.item_id = i.id
  WHERE b.organization_id = p_organization_id
    AND b.status = 'Active'
    AND b.expiry_date IS NOT NULL
    AND b.expiry_date <= (CURRENT_DATE + p_days_ahead)
    AND b.current_quantity > 0
  ORDER BY b.expiry_date ASC;
END;
$$;


ALTER FUNCTION "public"."get_expiring_items"("p_organization_id" "uuid", "p_days_ahead" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_farm_hierarchy_tree"("org_uuid" "uuid", "root_farm_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("farm_id" "uuid", "farm_name" "text", "farm_type" "text", "parent_farm_id" "uuid", "hierarchy_level" integer, "manager_name" "text", "sub_farms_count" bigint, "farm_size" numeric, "is_active" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- Since the farms table doesn't have hierarchy columns yet, return a simple flat list
    RETURN QUERY
    SELECT 
        f.id as farm_id,
        f.name as farm_name,
        'main'::text as farm_type,
        NULL::uuid as parent_farm_id,
        1::integer as hierarchy_level,
        COALESCE(f.manager_name, 'No Manager') as manager_name,
        0::bigint as sub_farms_count,
        COALESCE(f.size, 0) as farm_size,
        (COALESCE(f.status, 'active') = 'active') as is_active
    FROM public.farms f
    WHERE f.organization_id = org_uuid
    ORDER BY f.name;
END;
$$;


ALTER FUNCTION "public"."get_farm_hierarchy_tree"("org_uuid" "uuid", "root_farm_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_farm_structures"("farm_uuid" "uuid") RETURNS TABLE("structure_id" "uuid", "structure_name" "text", "structure_type" "text", "location" "jsonb", "installation_date" "date", "condition" "text", "usage" "text", "structure_details" "jsonb", "notes" "text", "is_active" boolean, "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id as structure_id,
        s.name as structure_name,
        s.type as structure_type,
        s.location,
        s.installation_date,
        s.condition,
        s.usage,
        s.structure_details,
        s.notes,
        s.is_active,
        s.created_at,
        s.updated_at
    FROM public.structures s
    WHERE s.farm_id = farm_uuid
        AND s.is_active = true
    ORDER BY s.type, s.name;
END;
$$;


ALTER FUNCTION "public"."get_farm_structures"("farm_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_harvest_statistics"("p_organization_id" "uuid", "p_start_date" "date", "p_end_date" "date") RETURNS TABLE("total_harvests" integer, "total_quantity" numeric, "total_revenue" numeric, "average_quality_score" numeric, "top_parcel_name" "text", "top_parcel_quantity" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  WITH harvest_stats AS (
    SELECT 
      COUNT(*) AS total_harvests,
      SUM(hr.quantity) AS total_quantity,
      SUM(hr.estimated_revenue) AS total_revenue,
      AVG(hr.quality_score) AS avg_quality_score
    FROM harvest_records hr
    WHERE hr.organization_id = p_organization_id
      AND hr.harvest_date BETWEEN p_start_date AND p_end_date
  ),
  top_parcel AS (
    SELECT 
      p.name AS parcel_name,
      SUM(hr.quantity) AS parcel_quantity
    FROM harvest_records hr
    JOIN parcels p ON p.id = hr.parcel_id
    WHERE hr.organization_id = p_organization_id
      AND hr.harvest_date BETWEEN p_start_date AND p_end_date
    GROUP BY p.id, p.name
    ORDER BY parcel_quantity DESC
    LIMIT 1
  )
  SELECT 
    hs.total_harvests::INTEGER,
    hs.total_quantity,
    hs.total_revenue,
    hs.avg_quality_score,
    tp.parcel_name,
    tp.parcel_quantity
  FROM harvest_stats hs
  CROSS JOIN top_parcel tp;
END;
$$;


ALTER FUNCTION "public"."get_harvest_statistics"("p_organization_id" "uuid", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_harvest_statistics"("p_organization_id" "uuid", "p_start_date" "date", "p_end_date" "date") IS 'Get comprehensive harvest statistics for a period';



CREATE OR REPLACE FUNCTION "public"."get_item_stock_value"("p_item_id" "uuid", "p_warehouse_id" "uuid" DEFAULT NULL::"uuid") RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_valuation_method TEXT;
  v_total_value DECIMAL(12, 2) := 0;
BEGIN
  -- Get valuation method from items table
  SELECT valuation_method INTO v_valuation_method
  FROM items
  WHERE id = p_item_id;

  -- Calculate based on method
  CASE v_valuation_method
    WHEN 'Moving Average' THEN
      SELECT
        COALESCE(SUM(total_cost), 0)
      INTO v_total_value
      FROM stock_valuation
      WHERE item_id = p_item_id
        AND (p_warehouse_id IS NULL OR warehouse_id = p_warehouse_id)
        AND remaining_quantity > 0;

    WHEN 'FIFO' THEN
      -- For FIFO, sum oldest entries first
      SELECT
        COALESCE(SUM(remaining_quantity * cost_per_unit), 0)
      INTO v_total_value
      FROM stock_valuation
      WHERE item_id = p_item_id
        AND (p_warehouse_id IS NULL OR warehouse_id = p_warehouse_id)
        AND remaining_quantity > 0
      ORDER BY valuation_date ASC;

    WHEN 'LIFO' THEN
      -- For LIFO, sum newest entries first
      SELECT
        COALESCE(SUM(remaining_quantity * cost_per_unit), 0)
      INTO v_total_value
      FROM stock_valuation
      WHERE item_id = p_item_id
        AND (p_warehouse_id IS NULL OR warehouse_id = p_warehouse_id)
        AND remaining_quantity > 0
      ORDER BY valuation_date DESC;
  END CASE;

  RETURN v_total_value;
END;
$$;


ALTER FUNCTION "public"."get_item_stock_value"("p_item_id" "uuid", "p_warehouse_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_latest_satellite_data"("parcel_uuid" "uuid", "index_name_param" "text" DEFAULT NULL::"text") RETURNS TABLE("index_name" "text", "date" "date", "mean_value" numeric, "min_value" numeric, "max_value" numeric, "std_value" numeric, "median_value" numeric, "cloud_coverage_percentage" numeric, "geotiff_url" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        sid.index_name,
        sid.date,
        sid.mean_value,
        sid.min_value,
        sid.max_value,
        sid.std_value,
        sid.median_value,
        sid.cloud_coverage_percentage,
        sid.geotiff_url,
        sid.created_at
    FROM public.satellite_indices_data sid
    WHERE sid.parcel_id = parcel_uuid
        AND (index_name_param IS NULL OR sid.index_name = index_name_param)
    ORDER BY sid.date DESC, sid.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_latest_satellite_data"("parcel_uuid" "uuid", "index_name_param" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_low_stock_items"("p_organization_id" "uuid") RETURNS TABLE("item_id" "uuid", "item_name" "text", "current_quantity" numeric, "minimum_quantity" numeric, "deficit" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id AS item_id,
    i.name AS item_name,
    COALESCE(i.current_quantity, 0) AS current_quantity,
    COALESCE(i.minimum_quantity, 0) AS minimum_quantity,
    GREATEST(COALESCE(i.minimum_quantity, 0) - COALESCE(i.current_quantity, 0), 0) AS deficit
  FROM inventory_items i
  WHERE i.organization_id = p_organization_id
    AND COALESCE(i.current_quantity, 0) < COALESCE(i.minimum_quantity, 0)
  ORDER BY deficit DESC;
END;
$$;


ALTER FUNCTION "public"."get_low_stock_items"("p_organization_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_organization_farms"("org_uuid" "uuid") RETURNS TABLE("farm_id" "uuid", "farm_name" "text", "farm_location" "text", "farm_size" numeric, "farm_type" "text", "parent_farm_id" "uuid", "hierarchy_level" integer, "manager_name" "text", "sub_farms_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.id as farm_id,
        f.name as farm_name,
        COALESCE(f.location, '') as farm_location,
        COALESCE(f.size, 0) as farm_size,
        'main'::text as farm_type,
        NULL::uuid as parent_farm_id,
        1::integer as hierarchy_level,
        COALESCE(f.manager_name, 'No Manager') as manager_name,
        0::bigint as sub_farms_count
    FROM public.farms f
    WHERE f.organization_id = org_uuid
    ORDER BY f.name;
END;
$$;


ALTER FUNCTION "public"."get_organization_farms"("org_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_organization_role_hierarchy"("org_id" "uuid") RETURNS TABLE("role_id" "uuid", "role_name" "text", "display_name" "text", "level" integer, "user_count" bigint, "permissions_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id as role_id,
        r.name as role_name,
        r.display_name,
        r.level,
        COUNT(ou.user_id) as user_count,
        COUNT(rp.permission_id) as permissions_count
    FROM public.roles r
    LEFT JOIN public.organization_users ou ON r.id = ou.role_id AND ou.organization_id = org_id AND ou.is_active = true
    LEFT JOIN public.role_permissions rp ON r.id = rp.role_id
    GROUP BY r.id, r.name, r.display_name, r.level
    ORDER BY r.level;
END;
$$;


ALTER FUNCTION "public"."get_organization_role_hierarchy"("org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_organization_structures"("org_uuid" "uuid") RETURNS TABLE("structure_id" "uuid", "structure_name" "text", "structure_type" "text", "farm_id" "uuid", "farm_name" "text", "location" "jsonb", "installation_date" "date", "condition" "text", "usage" "text", "structure_details" "jsonb", "notes" "text", "is_active" boolean, "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id as structure_id,
        s.name as structure_name,
        s.type as structure_type,
        f.id as farm_id,
        f.name as farm_name,
        s.location,
        s.installation_date,
        s.condition,
        s.usage,
        s.structure_details,
        s.notes,
        s.is_active,
        s.created_at,
        s.updated_at
    FROM public.structures s
    JOIN public.farms f ON s.farm_id = f.id
    WHERE s.organization_id = org_uuid
        AND s.is_active = true
        AND f.is_active = true
    ORDER BY f.name, s.type, s.name;
END;
$$;


ALTER FUNCTION "public"."get_organization_structures"("org_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_parcel_performance_summary"("p_organization_id" "uuid", "p_farm_id" "uuid" DEFAULT NULL::"uuid", "p_parcel_id" "uuid" DEFAULT NULL::"uuid", "p_from_date" "date" DEFAULT NULL::"date", "p_to_date" "date" DEFAULT NULL::"date") RETURNS TABLE("parcel_id" "uuid", "parcel_name" "text", "farm_name" "text", "crop_type" "text", "total_harvests" bigint, "avg_yield_per_hectare" numeric, "avg_target_yield" numeric, "avg_variance_percent" numeric, "performance_rating" "text", "total_revenue" numeric, "total_cost" numeric, "total_profit" numeric, "avg_profit_margin" numeric, "last_harvest_date" "date")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS parcel_id,
    p.name AS parcel_name,
    f.name AS farm_name,
    yh.crop_type,
    COUNT(yh.id) AS total_harvests,
    ROUND(AVG(yh.actual_yield_per_hectare)::NUMERIC, 2) AS avg_yield_per_hectare,
    ROUND(AVG(yh.target_yield_per_hectare)::NUMERIC, 2) AS avg_target_yield,
    ROUND(AVG(yh.yield_variance_percent)::NUMERIC, 2) AS avg_variance_percent,
    calculate_performance_rating(ROUND(AVG(yh.yield_variance_percent)::NUMERIC, 2)) AS performance_rating,
    ROUND(SUM(yh.revenue_amount)::NUMERIC, 2) AS total_revenue,
    ROUND(SUM(yh.cost_amount)::NUMERIC, 2) AS total_cost,
    ROUND(SUM(yh.profit_amount)::NUMERIC, 2) AS total_profit,
    ROUND(AVG(yh.profit_margin_percent)::NUMERIC, 2) AS avg_profit_margin,
    MAX(yh.harvest_date) AS last_harvest_date
  FROM public.yield_history yh
  JOIN public.parcels p ON yh.parcel_id = p.id
  JOIN public.farms f ON yh.farm_id = f.id
  WHERE yh.organization_id = p_organization_id
    AND (p_farm_id IS NULL OR yh.farm_id = p_farm_id)
    AND (p_parcel_id IS NULL OR yh.parcel_id = p_parcel_id)
    AND (p_from_date IS NULL OR yh.harvest_date >= p_from_date)
    AND (p_to_date IS NULL OR yh.harvest_date <= p_to_date)
  GROUP BY p.id, p.name, f.name, yh.crop_type
  ORDER BY avg_variance_percent ASC;
END;
$$;


ALTER FUNCTION "public"."get_parcel_performance_summary"("p_organization_id" "uuid", "p_farm_id" "uuid", "p_parcel_id" "uuid", "p_from_date" "date", "p_to_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_parcel_performance_summary"("p_organization_id" "uuid", "p_farm_id" "uuid", "p_parcel_id" "uuid", "p_from_date" "date", "p_to_date" "date") IS 'Aggregates parcel performance metrics for dashboards and reporting';



CREATE OR REPLACE FUNCTION "public"."get_parcels_for_satellite_processing"("org_uuid" "uuid") RETURNS TABLE("parcel_id" "uuid", "parcel_name" "text", "farm_id" "uuid", "farm_name" "text", "organization_id" "uuid", "boundary" "jsonb", "area_hectares" numeric, "soil_type" "text", "irrigation_type" "text", "notes" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id as parcel_id,
        p.name as parcel_name,
        f.id as farm_id,
        f.name as farm_name,
        f.organization_id,
        p.boundary,
        COALESCE(p.area, 0) as area_hectares,
        p.soil_type,
        p.irrigation_type,
        p.description as notes
    FROM public.parcels p
    JOIN public.farms f ON p.farm_id = f.id
    WHERE f.organization_id = org_uuid 
        AND p.boundary IS NOT NULL -- Only parcels with defined boundaries
    ORDER BY f.name, p.name;
END;
$$;


ALTER FUNCTION "public"."get_parcels_for_satellite_processing"("org_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_planting_system_recommendations"("p_crop_category" "text", "p_crop_type" "text" DEFAULT NULL::"text") RETURNS TABLE("system_type" "text", "spacing" "text", "density_per_hectare" integer, "description" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF p_crop_category = 'trees' THEN
    RETURN QUERY
    SELECT
      'Super intensif'::TEXT, '4x1,5'::TEXT, 1666, 'High-density modern orchard system'::TEXT
    UNION ALL
    SELECT 'Super intensif'::TEXT, '3x1,5'::TEXT, 2222, 'Ultra high-density system'::TEXT
    UNION ALL
    SELECT 'Intensif'::TEXT, '4x2'::TEXT, 1250, 'Intensive orchard system'::TEXT
    UNION ALL
    SELECT 'Intensif'::TEXT, '3x2'::TEXT, 1666, 'Intensive compact system'::TEXT
    UNION ALL
    SELECT 'Semi-intensif'::TEXT, '6x3'::TEXT, 555, 'Semi-intensive traditional-modern hybrid'::TEXT
    UNION ALL
    SELECT 'Traditionnel amélioré'::TEXT, '6x6'::TEXT, 277, 'Improved traditional spacing'::TEXT
    UNION ALL
    SELECT 'Traditionnel'::TEXT, '8x8'::TEXT, 156, 'Traditional wide spacing'::TEXT
    UNION ALL
    SELECT 'Traditionnel'::TEXT, '8x7'::TEXT, 179, 'Traditional standard spacing'::TEXT
    UNION ALL
    SELECT 'Traditionnel très espacé'::TEXT, '10x10'::TEXT, 100, 'Very wide traditional spacing'::TEXT;

  ELSIF p_crop_category = 'cereals' THEN
    RETURN QUERY
    SELECT
      'Densité standard'::TEXT, 'Semis en ligne'::TEXT, 3000000, 'Standard cereal seeding density (300-400 kg/ha)'::TEXT
    UNION ALL
    SELECT 'Densité réduite'::TEXT, 'Semis espacé'::TEXT, 2000000, 'Reduced density for organic farming'::TEXT
    UNION ALL
    SELECT 'Densité élevée'::TEXT, 'Semis dense'::TEXT, 4000000, 'High density for irrigation'::TEXT;

  ELSIF p_crop_category = 'vegetables' THEN
    RETURN QUERY
    SELECT
      'Pleine terre - rangées simples'::TEXT, '0.8x0.3'::TEXT, 41666, 'Field rows for tomatoes, peppers'::TEXT
    UNION ALL
    SELECT 'Pleine terre - rangées doubles'::TEXT, '1.5x0.4'::TEXT, 33333, 'Double row system'::TEXT
    UNION ALL
    SELECT 'Sous serre'::TEXT, '1.2x0.4'::TEXT, 41666, 'Greenhouse intensive cultivation'::TEXT
    UNION ALL
    SELECT 'Semis dense'::TEXT, 'À la volée'::TEXT, 500000, 'Dense seeding for leafy vegetables'::TEXT;

  ELSE
    RETURN QUERY
    SELECT
      'Custom'::TEXT, 'Variable'::TEXT, 0, 'Custom planting system'::TEXT;
  END IF;
END;
$$;


ALTER FUNCTION "public"."get_planting_system_recommendations"("p_crop_category" "text", "p_crop_type" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_planting_system_recommendations"("p_crop_category" "text", "p_crop_type" "text") IS 'Get recommended planting systems based on crop category. Usage: SELECT * FROM get_planting_system_recommendations(''trees'')';



CREATE OR REPLACE FUNCTION "public"."get_satellite_data_statistics"("parcel_uuid" "uuid", "index_name_param" "text", "start_date_param" "date", "end_date_param" "date") RETURNS TABLE("index_name" "text", "data_points_count" bigint, "mean_value" numeric, "min_value" numeric, "max_value" numeric, "std_value" numeric, "median_value" numeric, "first_date" "date", "last_date" "date")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        sid.index_name,
        COUNT(*) as data_points_count,
        AVG(sid.mean_value) as mean_value,
        MIN(sid.min_value) as min_value,
        MAX(sid.max_value) as max_value,
        STDDEV(sid.mean_value) as std_value,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY sid.mean_value) as median_value,
        MIN(sid.date) as first_date,
        MAX(sid.date) as last_date
    FROM public.satellite_indices_data sid
    WHERE sid.parcel_id = parcel_uuid
        AND sid.index_name = index_name_param
        AND sid.date BETWEEN start_date_param AND end_date_param
    GROUP BY sid.index_name;
END;
$$;


ALTER FUNCTION "public"."get_satellite_data_statistics"("parcel_uuid" "uuid", "index_name_param" "text", "start_date_param" "date", "end_date_param" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_effective_permissions"("user_id" "uuid", "org_id" "uuid") RETURNS TABLE("permission_name" "text", "resource" "text", "action" "text", "granted_by_role" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
BEGIN
    RETURN QUERY
    SELECT DISTINCT 
        p.name as permission_name,
        p.resource,
        p.action,
        r.name as granted_by_role
    FROM public.organization_users ou
    JOIN public.role_permissions rp ON rp.role_id = ou.role_id
    JOIN public.permissions p ON p.id = rp.permission_id
    JOIN public.roles r ON r.id = ou.role_id
    WHERE ou.user_id = $1 
    AND ou.organization_id = $2
    AND ou.is_active = true
    ORDER BY p.resource, p.action;
END;
$_$;


ALTER FUNCTION "public"."get_user_effective_permissions"("user_id" "uuid", "org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_organizations"("user_uuid" "uuid") RETURNS TABLE("organization_id" "uuid", "organization_name" "text", "organization_slug" "text", "user_role" "text", "is_active" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id as organization_id,
    o.name as organization_name,
    COALESCE(o.slug, o.name) as organization_slug, -- Use slug if exists, fallback to name
    ou.role as user_role,
    ou.is_active
  FROM organization_users ou
  JOIN organizations o ON ou.organization_id = o.id
  WHERE ou.user_id = user_uuid AND ou.is_active = true;
END;
$$;


ALTER FUNCTION "public"."get_user_organizations"("user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_permissions"("user_id" "uuid") RETURNS TABLE("permission_name" "text", "resource" "text", "action" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        p.name,
        p.resource,
        p.action
    FROM public.organization_users ou
    INNER JOIN public.role_permissions rp ON rp.role_id = ou.role_id
    INNER JOIN public.permissions p ON p.id = rp.permission_id
    WHERE ou.user_id = get_user_permissions.user_id
        AND ou.is_active = true;
END;
$$;


ALTER FUNCTION "public"."get_user_permissions"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_role"("user_id" "uuid", "org_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("role_name" "text", "role_display_name" "text", "role_level" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.name,
        r.display_name,
        r.level
    FROM public.organization_users ou
    INNER JOIN public.roles r ON r.id = ou.role_id
    WHERE ou.user_id = get_user_role.user_id
        AND (get_user_role.org_id IS NULL OR ou.organization_id = get_user_role.org_id)
        AND ou.is_active = true
    ORDER BY r.level ASC
    LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."get_user_role"("user_id" "uuid", "org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_role_level"("user_id" "uuid", "org_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
    RETURN (
        SELECT r.level
        FROM public.organization_users ou
        INNER JOIN public.roles r ON r.id = ou.role_id
        WHERE ou.user_id = get_user_role_level.user_id
            AND ou.organization_id = get_user_role_level.org_id
            AND ou.is_active = true
        ORDER BY r.level ASC
        LIMIT 1
    );
END;
$$;


ALTER FUNCTION "public"."get_user_role_level"("user_id" "uuid", "org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_tasks"("user_uuid" "uuid") RETURNS TABLE("task_id" "uuid", "task_title" "text", "task_description" "text", "task_type" "text", "priority" "text", "status" "text", "scheduled_start" timestamp with time zone, "due_date" "date", "farm_name" "text", "parcel_name" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT
    t.id,
    t.title,
    t.description,
    t.task_type,
    t.priority,
    t.status,
    t.scheduled_start,
    t.due_date,
    f.name as farm_name,
    p.name as parcel_name
  FROM tasks t
  LEFT JOIN farms f ON f.id = t.farm_id
  LEFT JOIN parcels p ON p.id = t.parcel_id
  WHERE t.assigned_to = user_uuid
  ORDER BY t.scheduled_start DESC;
$$;


ALTER FUNCTION "public"."get_user_tasks"("user_uuid" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_tasks"("user_uuid" "uuid") IS 'Retrieves all tasks assigned to a specific user with related farm and parcel information.';



CREATE OR REPLACE FUNCTION "public"."get_worker_advance_deductions"("p_worker_id" "uuid", "p_payment_date" "date") RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_total_deductions DECIMAL := 0;
BEGIN
  SELECT COALESCE(SUM(
    CASE 
      WHEN (deduction_plan->>'installments')::INTEGER > 0 THEN
        (deduction_plan->>'amount_per_installment')::DECIMAL
      ELSE remaining_balance
    END
  ), 0)
  INTO v_total_deductions
  FROM payment_advances
  WHERE worker_id = p_worker_id
    AND status = 'paid'
    AND remaining_balance > 0
    AND approved_date <= p_payment_date;
  
  RETURN v_total_deductions;
END;
$$;


ALTER FUNCTION "public"."get_worker_advance_deductions"("p_worker_id" "uuid", "p_payment_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_worker_availability"("p_worker_id" "uuid", "p_date" "date") RETURNS TABLE("is_available" boolean, "tasks_count" integer, "total_hours" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN COUNT(t.id) = 0 THEN TRUE
      WHEN SUM(COALESCE(t.estimated_duration, 8)) < 8 THEN TRUE
      ELSE FALSE
    END AS is_available,
    COUNT(t.id)::INTEGER AS tasks_count,
    SUM(COALESCE(t.estimated_duration, 8))::DECIMAL AS total_hours
  FROM tasks t
  WHERE t.assigned_to = p_worker_id
    AND t.status IN ('pending', 'assigned', 'in_progress')
    AND (
      (t.scheduled_start IS NOT NULL AND DATE(t.scheduled_start) = p_date)
      OR (t.scheduled_start IS NULL AND t.due_date = p_date)
    );
END;
$$;


ALTER FUNCTION "public"."get_worker_availability"("p_worker_id" "uuid", "p_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_worker_availability"("p_worker_id" "uuid", "p_date" "date") IS 'Check if a worker is available on a specific date';



CREATE OR REPLACE FUNCTION "public"."handle_invited_user_signup"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  -- Check if user was invited to an organization (metadata from invite)
  IF NEW.raw_user_meta_data ? 'invited_to_organization' AND
     NEW.raw_user_meta_data ? 'invited_with_role' THEN

    -- Add user to the organization they were invited to
    INSERT INTO public.organization_users (
      user_id,
      organization_id,
      role_id,
      is_active
    ) VALUES (
      NEW.id,
      (NEW.raw_user_meta_data->>'invited_to_organization')::UUID,
      (NEW.raw_user_meta_data->>'invited_with_role')::UUID,
      true
    )
    ON CONFLICT (user_id, organization_id)
    DO UPDATE SET
      role_id = EXCLUDED.role_id,
      is_active = true,
      updated_at = NOW();

    -- Create user profile if name was provided
    IF NEW.raw_user_meta_data ? 'first_name' OR NEW.raw_user_meta_data ? 'last_name' THEN
      INSERT INTO public.user_profiles (
        id,
        first_name,
        last_name,
        created_at,
        updated_at
      ) VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        NOW(),
        NOW()
      )
      ON CONFLICT (id)
      DO UPDATE SET
        first_name = COALESCE(EXCLUDED.first_name, user_profiles.first_name),
        last_name = COALESCE(EXCLUDED.last_name, user_profiles.last_name),
        updated_at = NOW();
    END IF;

    RAISE NOTICE 'User % added to organization % via invitation', NEW.id, NEW.raw_user_meta_data->>'invited_to_organization';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_invited_user_signup"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" = ''
    AS $$
DECLARE
  new_org_id uuid;
  org_name text;
  user_email text;
BEGIN
  -- Get organization name from user metadata
  org_name := NEW.raw_user_meta_data->>'organization_name';
  user_email := NEW.email;

  -- Default organization name if not provided
  IF org_name IS NULL OR org_name = '' THEN
    org_name := split_part(user_email, '@', 1) || '''s Organization';
  END IF;

  -- Create user profile first
  INSERT INTO public.user_profiles (id, email, full_name, first_name, last_name)
  VALUES (
    NEW.id,
    user_email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', user_email),
    COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(user_email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create organization
  INSERT INTO public.organizations (name, slug, owner_id)
  VALUES (
    org_name,
    lower(regexp_replace(org_name, '[^a-zA-Z0-9]+', '-', 'g')),
    NEW.id
  )
  RETURNING id INTO new_org_id;

  -- Create organization_user link with admin role
  INSERT INTO public.organization_users (organization_id, user_id, role, is_active)
  SELECT
    new_org_id,
    NEW.id,
    'admin',
    true
  WHERE EXISTS (SELECT 1 FROM public.organizations WHERE id = new_org_id);

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the user creation
    RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."handle_new_user"() IS 'Automatically creates user profile and organization when a new user signs up';


-- Drop existing trigger if it exists
-- Note: This requires superuser privileges on auth.users
DO $$
BEGIN
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Insufficient privileges to drop trigger on auth.users. This is expected in some environments.';
END $$;


-- Create trigger on auth.users to automatically create organization on signup
-- Note: This requires superuser privileges on auth.users
-- If this fails, you may need to create the trigger manually via Supabase Dashboard
DO $$
BEGIN
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Insufficient privileges to create trigger on auth.users. Please apply manually via Supabase Dashboard:';
    RAISE NOTICE 'CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();';
  WHEN duplicate_object THEN
    RAISE NOTICE 'Trigger on_auth_user_created already exists. Skipping creation.';
END $$;


-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_feature_access"("org_id" "uuid", "feature_name" "text") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  sub_record RECORD;
BEGIN
  -- Check subscription validity first
  IF NOT public.has_valid_subscription(org_id) THEN
    RETURN FALSE;
  END IF;

  -- Get subscription
  SELECT * INTO sub_record
  FROM public.subscriptions
  WHERE organization_id = org_id
  LIMIT 1;

  -- Check feature flag
  RETURN CASE feature_name
    WHEN 'analytics' THEN sub_record.has_analytics
    WHEN 'sensor_integration' THEN sub_record.has_sensor_integration
    WHEN 'ai_recommendations' THEN sub_record.has_ai_recommendations
    WHEN 'advanced_reporting' THEN sub_record.has_advanced_reporting
    WHEN 'api_access' THEN sub_record.has_api_access
    WHEN 'priority_support' THEN sub_record.has_priority_support
    ELSE FALSE
  END;
END;
$$;


ALTER FUNCTION "public"."has_feature_access"("org_id" "uuid", "feature_name" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."has_feature_access"("org_id" "uuid", "feature_name" "text") IS 'Checks if organization has access to a specific premium feature';



CREATE OR REPLACE FUNCTION "public"."has_valid_subscription"("org_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_result BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions s
    WHERE s.organization_id = org_id
      AND s.status IN ('active', 'trialing')
      AND (s.current_period_end IS NULL OR s.current_period_end > NOW())
  ) INTO v_result;
  
  RETURN COALESCE(v_result, FALSE);
END;
$$;


ALTER FUNCTION "public"."has_valid_subscription"("org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."has_valid_subscription"("org_id" "uuid") IS 'Checks if an organization has a valid active subscription';



CREATE OR REPLACE FUNCTION "public"."initialize_default_subscription"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  -- Create a trial Essential subscription for new organizations
  INSERT INTO public.subscriptions (
    organization_id,
    plan_type,
    status,
    max_farms,
    max_parcels,
    max_users,
    max_satellite_reports,
    has_analytics,
    has_sensor_integration,
    has_ai_recommendations,
    has_advanced_reporting,
    has_api_access,
    has_priority_support,
    current_period_start,
    current_period_end
  ) VALUES (
    NEW.id,
    'essential',
    'trialing',
    2,
    25,
    5,
    0,
    false,
    false,
    false,
    false,
    false,
    false,
    NOW(),
    NOW() + INTERVAL '14 days' -- 14-day trial
  );

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."initialize_default_subscription"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."initialize_default_subscription"() IS 'DISABLED - Was creating automatic trial subscriptions for new organizations. Now subscriptions must be created manually or via payment.';



CREATE OR REPLACE FUNCTION "public"."is_active_org_member"("user_id" "uuid", "org_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_result BOOLEAN;
BEGIN
    -- Use fully qualified table name
    SELECT EXISTS (
        SELECT 1 
        FROM public.organization_users ou
        WHERE ou.user_id = is_active_org_member.user_id
        AND ou.organization_id = is_active_org_member.org_id
        AND ou.is_active = true
    ) INTO v_result;
    
    RETURN COALESCE(v_result, FALSE);
END;
$$;


ALTER FUNCTION "public"."is_active_org_member"("user_id" "uuid", "org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_organization_admin"("org_id" "uuid", "user_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  result BOOLEAN;
BEGIN
    -- Explicitly disable RLS to prevent recursion
    PERFORM set_config('row_security', 'off', true);
    
    SELECT EXISTS (
        SELECT 1
        FROM public.organization_users ou
        WHERE ou.organization_id = org_id
          AND ou.user_id = user_uuid
          AND ou.role IN ('owner', 'admin')
          AND ou.is_active = true
    ) INTO result;
    
    RETURN COALESCE(result, FALSE);
END;
$$;


ALTER FUNCTION "public"."is_organization_admin"("org_id" "uuid", "user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_organization_owner"("org_id" "uuid", "user_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  result BOOLEAN;
BEGIN
    -- Explicitly disable RLS to prevent recursion
    PERFORM set_config('row_security', 'off', true);
    
    SELECT EXISTS (
        SELECT 1
        FROM public.organization_users ou
        WHERE ou.organization_id = org_id
          AND ou.user_id = user_uuid
          AND ou.role = 'owner'
          AND ou.is_active = true
    ) INTO result;
    
    RETURN COALESCE(result, FALSE);
END;
$$;


ALTER FUNCTION "public"."is_organization_owner"("org_id" "uuid", "user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_system_admin"("check_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    -- Direct query without any RLS complications
    SELECT EXISTS (
        SELECT 1
        FROM organization_users ou
        WHERE ou.user_id = check_user_id
            AND ou.is_active = true
            AND ou.role_id IN (
                SELECT id FROM roles WHERE name = 'system_admin' LIMIT 1
            )
    );
$$;


ALTER FUNCTION "public"."is_system_admin"("check_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_worker"("user_uuid" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM workers
    WHERE user_id = user_uuid
    AND is_active = true
  );
$$;


ALTER FUNCTION "public"."is_worker"("user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."post_opening_stock_balance"("p_opening_stock_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_opening_stock opening_stock_balances%ROWTYPE;
  v_item inventory_items%ROWTYPE;
  v_warehouse warehouses%ROWTYPE;
  v_mapping stock_account_mappings%ROWTYPE;
  v_journal_entry_id UUID;
  v_organization organizations%ROWTYPE;
BEGIN
  -- Get opening stock record
  SELECT * INTO v_opening_stock
  FROM opening_stock_balances
  WHERE id = p_opening_stock_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Opening stock balance not found';
  END IF;

  IF v_opening_stock.status != 'Draft' THEN
    RAISE EXCEPTION 'Opening stock balance is already posted or cancelled';
  END IF;

  -- Get item and warehouse details
  SELECT * INTO v_item FROM inventory_items WHERE id = v_opening_stock.item_id;
  SELECT * INTO v_warehouse FROM warehouses WHERE id = v_opening_stock.warehouse_id;
  SELECT * INTO v_organization FROM organizations WHERE id = v_opening_stock.organization_id;

  -- Get account mapping
  SELECT * INTO v_mapping
  FROM stock_account_mappings
  WHERE organization_id = v_opening_stock.organization_id
    AND entry_type = 'Opening Stock'
    AND (item_category IS NULL OR item_category = v_item.category)
  ORDER BY CASE WHEN item_category IS NOT NULL THEN 1 ELSE 2 END
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No account mapping found for Opening Stock';
  END IF;

  -- Create journal entry
  INSERT INTO journal_entries (
    organization_id,
    entry_date,
    reference_type,
    reference_id,
    description,
    total_debit,
    total_credit,
    status,
    posted_at,
    posted_by,
    created_by
  ) VALUES (
    v_opening_stock.organization_id,
    v_opening_stock.opening_date,
    'opening_stock',
    v_opening_stock.id,
    'Opening Stock: ' || v_item.name || ' at ' || v_warehouse.name,
    v_opening_stock.total_value,
    v_opening_stock.total_value,
    'posted',
    NOW(),
    auth.uid(),
    auth.uid()
  ) RETURNING id INTO v_journal_entry_id;

  -- Debit: Stock Asset Account
  INSERT INTO journal_items (
    journal_entry_id,
    account_id,
    description,
    debit,
    credit
  ) VALUES (
    v_journal_entry_id,
    v_mapping.debit_account_id,
    v_item.name || ' (' || v_opening_stock.quantity || ' ' || v_item.unit || ')',
    v_opening_stock.total_value,
    0
  );

  -- Credit: Opening Balance Equity Account
  INSERT INTO journal_items (
    journal_entry_id,
    account_id,
    description,
    debit,
    credit
  ) VALUES (
    v_journal_entry_id,
    v_mapping.credit_account_id,
    'Opening Balance - ' || v_item.name,
    0,
    v_opening_stock.total_value
  );

  -- Update opening stock with journal entry reference
  UPDATE opening_stock_balances
  SET
    journal_entry_id = v_journal_entry_id,
    status = 'Posted',
    posted_at = NOW(),
    posted_by = auth.uid()
  WHERE id = p_opening_stock_id;

  -- Update inventory quantity
  UPDATE inventory_items
  SET quantity = quantity + v_opening_stock.quantity
  WHERE id = v_opening_stock.item_id;

  -- Create stock movement record
  INSERT INTO stock_movements (
    organization_id,
    item_id,
    warehouse_id,
    movement_type,
    quantity,
    movement_date,
    reference_type,
    reference_id,
    balance_after
  ) VALUES (
    v_opening_stock.organization_id,
    v_opening_stock.item_id,
    v_opening_stock.warehouse_id,
    'IN',
    v_opening_stock.quantity,
    v_opening_stock.opening_date,
    'opening_stock',
    v_opening_stock.id,
    (SELECT quantity FROM inventory_items WHERE id = v_opening_stock.item_id)
  );

  RETURN v_journal_entry_id;
END;
$$;


ALTER FUNCTION "public"."post_opening_stock_balance"("p_opening_stock_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."post_opening_stock_balance"("p_opening_stock_id" "uuid") IS 'Post opening stock balance and create journal entry';



CREATE OR REPLACE FUNCTION "public"."prevent_unauthorized_subscription_creation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  -- Allow if:
  -- 1. Called by service_role
  -- 2. Called from our org creation trigger (flag is set)
  -- 3. Authenticated user creating a trial subscription
  IF current_setting('role', true) = 'service_role' OR
     current_setting('app.creating_org_subscription', true) = 'true' OR
     (auth.uid() IS NOT NULL AND NEW.status = 'trialing') THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Subscriptions can only be created via payment processor or admin';
END;
$$;


ALTER FUNCTION "public"."prevent_unauthorized_subscription_creation"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."prevent_unauthorized_subscription_creation"() IS 'Prevents unauthorized subscription creation. Allows service_role and trusted triggers only.';



CREATE OR REPLACE FUNCTION "public"."process_opening_stock_balance"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_item RECORD;
  v_warehouse RECORD;
  v_journal_entry_id UUID;
  v_item_account_id UUID;
  v_stock_account_id UUID;
BEGIN
  -- Get item and warehouse details from items table
  SELECT * INTO v_item FROM items WHERE id = NEW.item_id;
  SELECT * INTO v_warehouse FROM warehouses WHERE id = NEW.warehouse_id;

  -- Only process if status is 'Posted'
  IF NEW.status = 'Posted' AND (OLD.status IS NULL OR OLD.status != 'Posted') THEN
    -- Create stock valuation entry
    INSERT INTO stock_valuation (
      organization_id,
      item_id,
      warehouse_id,
      quantity,
      remaining_quantity,
      cost_per_unit,
      total_cost,
      valuation_date
    )
    VALUES (
      NEW.organization_id,
      NEW.item_id,
      NEW.warehouse_id,
      NEW.opening_quantity,
      NEW.opening_quantity,
      NEW.opening_cost_per_unit,
      NEW.opening_quantity * NEW.opening_cost_per_unit,
      NEW.opening_date
    );

    -- Create journal entry if accounting integration enabled
    -- (This would reference items table now)
    -- Journal entry logic here...

  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."process_opening_stock_balance"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."seed_chart_of_accounts"("org_id" "uuid", "currency_code" "text" DEFAULT 'MAD'::"text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  -- Asset accounts
  v_assets_id UUID;
  v_current_assets_id UUID;
  v_fixed_assets_id UUID;

  -- Liability accounts
  v_liabilities_id UUID;
  v_current_liabilities_id UUID;

  -- Equity accounts
  v_equity_id UUID;

  -- Revenue accounts
  v_revenue_id UUID;

  -- Expense accounts
  v_expenses_id UUID;
  v_direct_expenses_id UUID;
  v_indirect_expenses_id UUID;
BEGIN
  -- Check if accounts already exist for this organization
  IF EXISTS (SELECT 1 FROM public.accounts WHERE organization_id = org_id LIMIT 1) THEN
    RAISE NOTICE 'Accounts already exist for organization %, skipping seed', org_id;
    RETURN;
  END IF;

  -- ============================================================================
  -- ASSETS
  -- ============================================================================

  -- Main Assets Group
  INSERT INTO public.accounts (organization_id, code, name, account_type, is_group, is_active, currency_code, allow_cost_center)
  VALUES (org_id, '1000', 'Assets', 'Asset', true, true, currency_code, false)
  RETURNING id INTO v_assets_id;

  -- Current Assets Group
  INSERT INTO public.accounts (organization_id, code, name, account_type, account_subtype, parent_id, is_group, is_active, currency_code, allow_cost_center)
  VALUES (org_id, '1100', 'Current Assets', 'Asset', 'Current Asset', v_assets_id, true, true, currency_code, false)
  RETURNING id INTO v_current_assets_id;

  -- Cash and Bank Accounts
  INSERT INTO public.accounts (organization_id, code, name, account_type, account_subtype, parent_id, is_group, is_active, currency_code, allow_cost_center, description)
  VALUES
    (org_id, '1110', 'Cash', 'Asset', 'Cash', v_current_assets_id, false, true, currency_code, true, 'Cash in hand'),
    (org_id, '1120', 'Bank Accounts', 'Asset', 'Bank', v_current_assets_id, false, true, currency_code, true, 'Bank checking and savings accounts'),
    (org_id, '1130', 'Petty Cash', 'Asset', 'Cash', v_current_assets_id, false, true, currency_code, true, 'Small cash for minor expenses');

  -- Accounts Receivable
  INSERT INTO public.accounts (organization_id, code, name, account_type, account_subtype, parent_id, is_group, is_active, currency_code, allow_cost_center, description)
  VALUES
    (org_id, '1200', 'Accounts Receivable', 'Asset', 'Receivable', v_current_assets_id, false, true, currency_code, true, 'Money owed by customers'),
    (org_id, '1210', 'Allowance for Doubtful Accounts', 'Asset', 'Receivable', v_current_assets_id, false, true, currency_code, false, 'Estimated uncollectible receivables');

  -- Inventory
  INSERT INTO public.accounts (organization_id, code, name, account_type, account_subtype, parent_id, is_group, is_active, currency_code, allow_cost_center, description)
  VALUES
    (org_id, '1300', 'Inventory - Raw Materials', 'Asset', 'Inventory', v_current_assets_id, false, true, currency_code, true, 'Fertilizers, seeds, chemicals'),
    (org_id, '1310', 'Inventory - Finished Goods', 'Asset', 'Inventory', v_current_assets_id, false, true, currency_code, true, 'Harvested crops ready for sale'),
    (org_id, '1320', 'Inventory - Supplies', 'Asset', 'Inventory', v_current_assets_id, false, true, currency_code, true, 'General farm supplies');

  -- Prepaid Expenses
  INSERT INTO public.accounts (organization_id, code, name, account_type, account_subtype, parent_id, is_group, is_active, currency_code, allow_cost_center, description)
  VALUES
    (org_id, '1400', 'Prepaid Expenses', 'Asset', 'Prepaid Expense', v_current_assets_id, false, true, currency_code, false, 'Expenses paid in advance');

  -- Fixed Assets Group
  INSERT INTO public.accounts (organization_id, code, name, account_type, account_subtype, parent_id, is_group, is_active, currency_code, allow_cost_center)
  VALUES (org_id, '1500', 'Fixed Assets', 'Asset', 'Fixed Asset', v_assets_id, true, true, currency_code, false)
  RETURNING id INTO v_fixed_assets_id;

  -- Fixed Assets Accounts
  INSERT INTO public.accounts (organization_id, code, name, account_type, account_subtype, parent_id, is_group, is_active, currency_code, allow_cost_center, description)
  VALUES
    (org_id, '1510', 'Land', 'Asset', 'Fixed Asset', v_fixed_assets_id, false, true, currency_code, true, 'Agricultural land'),
    (org_id, '1520', 'Buildings', 'Asset', 'Fixed Asset', v_fixed_assets_id, false, true, currency_code, true, 'Farm buildings and structures'),
    (org_id, '1530', 'Equipment', 'Asset', 'Fixed Asset', v_fixed_assets_id, false, true, currency_code, true, 'Tractors, machinery, tools'),
    (org_id, '1540', 'Vehicles', 'Asset', 'Fixed Asset', v_fixed_assets_id, false, true, currency_code, true, 'Farm vehicles'),
    (org_id, '1550', 'Irrigation Systems', 'Asset', 'Fixed Asset', v_fixed_assets_id, false, true, currency_code, true, 'Irrigation infrastructure'),
    (org_id, '1560', 'Accumulated Depreciation - Equipment', 'Asset', 'Fixed Asset', v_fixed_assets_id, false, true, currency_code, false, 'Depreciation on equipment'),
    (org_id, '1565', 'Accumulated Depreciation - Buildings', 'Asset', 'Fixed Asset', v_fixed_assets_id, false, true, currency_code, false, 'Depreciation on buildings'),
    (org_id, '1570', 'Accumulated Depreciation - Vehicles', 'Asset', 'Fixed Asset', v_fixed_assets_id, false, true, currency_code, false, 'Depreciation on vehicles');

  -- ============================================================================
  -- LIABILITIES
  -- ============================================================================

  -- Main Liabilities Group
  INSERT INTO public.accounts (organization_id, code, name, account_type, is_group, is_active, currency_code, allow_cost_center)
  VALUES (org_id, '2000', 'Liabilities', 'Liability', true, true, currency_code, false)
  RETURNING id INTO v_liabilities_id;

  -- Current Liabilities Group
  INSERT INTO public.accounts (organization_id, code, name, account_type, account_subtype, parent_id, is_group, is_active, currency_code, allow_cost_center)
  VALUES (org_id, '2100', 'Current Liabilities', 'Liability', 'Current Liability', v_liabilities_id, true, true, currency_code, false)
  RETURNING id INTO v_current_liabilities_id;

  -- Current Liabilities Accounts
  INSERT INTO public.accounts (organization_id, code, name, account_type, account_subtype, parent_id, is_group, is_active, currency_code, allow_cost_center, description)
  VALUES
    (org_id, '2110', 'Accounts Payable', 'Liability', 'Payable', v_current_liabilities_id, false, true, currency_code, true, 'Money owed to suppliers'),
    (org_id, '2120', 'Short-term Loans', 'Liability', 'Loan', v_current_liabilities_id, false, true, currency_code, false, 'Loans due within one year'),
    (org_id, '2130', 'Accrued Expenses', 'Liability', 'Payable', v_current_liabilities_id, false, true, currency_code, false, 'Expenses incurred but not yet paid'),
    (org_id, '2140', 'Wages Payable', 'Liability', 'Payable', v_current_liabilities_id, false, true, currency_code, true, 'Unpaid worker wages'),
    (org_id, '2150', 'Taxes Payable', 'Liability', 'Payable', v_current_liabilities_id, false, true, currency_code, false, 'Unpaid taxes'),
    (org_id, '2160', 'Interest Payable', 'Liability', 'Payable', v_current_liabilities_id, false, true, currency_code, false, 'Unpaid interest on loans');

  -- Long-term Liabilities
  INSERT INTO public.accounts (organization_id, code, name, account_type, account_subtype, parent_id, is_group, is_active, currency_code, allow_cost_center, description)
  VALUES
    (org_id, '2200', 'Long-term Loans', 'Liability', 'Long-term Liability', v_liabilities_id, false, true, currency_code, false, 'Loans due after one year'),
    (org_id, '2210', 'Mortgages Payable', 'Liability', 'Long-term Liability', v_liabilities_id, false, true, currency_code, true, 'Property mortgages');

  -- ============================================================================
  -- EQUITY
  -- ============================================================================

  -- Main Equity Group
  INSERT INTO public.accounts (organization_id, code, name, account_type, is_group, is_active, currency_code, allow_cost_center)
  VALUES (org_id, '3000', 'Equity', 'Equity', true, true, currency_code, false)
  RETURNING id INTO v_equity_id;

  -- Equity Accounts
  INSERT INTO public.accounts (organization_id, code, name, account_type, account_subtype, parent_id, is_group, is_active, currency_code, allow_cost_center, description)
  VALUES
    (org_id, '3100', 'Owner''s Capital', 'Equity', 'Capital', v_equity_id, false, true, currency_code, false, 'Owner investment in business'),
    (org_id, '3200', 'Retained Earnings', 'Equity', 'Retained Earnings', v_equity_id, false, true, currency_code, false, 'Accumulated profits'),
    (org_id, '3300', 'Owner''s Drawings', 'Equity', 'Drawings', v_equity_id, false, true, currency_code, false, 'Owner withdrawals'),
    (org_id, '3400', 'Current Year Earnings', 'Equity', 'Earnings', v_equity_id, false, true, currency_code, false, 'Profit/loss for current year');

  -- ============================================================================
  -- REVENUE
  -- ============================================================================

  -- Main Revenue Group
  INSERT INTO public.accounts (organization_id, code, name, account_type, is_group, is_active, currency_code, allow_cost_center)
  VALUES (org_id, '4000', 'Revenue', 'Revenue', true, true, currency_code, false)
  RETURNING id INTO v_revenue_id;

  -- Revenue Accounts
  INSERT INTO public.accounts (organization_id, code, name, account_type, account_subtype, parent_id, is_group, is_active, currency_code, allow_cost_center, description)
  VALUES
    (org_id, '4100', 'Sales - Crops', 'Revenue', 'Sales Revenue', v_revenue_id, false, true, currency_code, true, 'Revenue from crop sales'),
    (org_id, '4110', 'Sales - Fruits', 'Revenue', 'Sales Revenue', v_revenue_id, false, true, currency_code, true, 'Revenue from fruit sales'),
    (org_id, '4120', 'Sales - Vegetables', 'Revenue', 'Sales Revenue', v_revenue_id, false, true, currency_code, true, 'Revenue from vegetable sales'),
    (org_id, '4200', 'Service Revenue', 'Revenue', 'Service Revenue', v_revenue_id, false, true, currency_code, true, 'Revenue from services'),
    (org_id, '4300', 'Other Income', 'Revenue', 'Other Income', v_revenue_id, false, true, currency_code, false, 'Miscellaneous income'),
    (org_id, '4400', 'Interest Income', 'Revenue', 'Interest Income', v_revenue_id, false, true, currency_code, false, 'Interest earned');

  -- ============================================================================
  -- EXPENSES
  -- ============================================================================

  -- Main Expenses Group
  INSERT INTO public.accounts (organization_id, code, name, account_type, is_group, is_active, currency_code, allow_cost_center)
  VALUES (org_id, '5000', 'Expenses', 'Expense', true, true, currency_code, false)
  RETURNING id INTO v_expenses_id;

  -- Direct Expenses (Cost of Goods Sold)
  INSERT INTO public.accounts (organization_id, code, name, account_type, account_subtype, parent_id, is_group, is_active, currency_code, allow_cost_center)
  VALUES (org_id, '5100', 'Cost of Goods Sold', 'Expense', 'Cost of Goods Sold', v_expenses_id, true, true, currency_code, false)
  RETURNING id INTO v_direct_expenses_id;

  INSERT INTO public.accounts (organization_id, code, name, account_type, account_subtype, parent_id, is_group, is_active, currency_code, allow_cost_center, description)
  VALUES
    (org_id, '5110', 'Seeds and Planting Material', 'Expense', 'Direct Expense', v_direct_expenses_id, false, true, currency_code, true, 'Cost of seeds'),
    (org_id, '5120', 'Fertilizers', 'Expense', 'Direct Expense', v_direct_expenses_id, false, true, currency_code, true, 'Fertilizer expenses'),
    (org_id, '5130', 'Pesticides and Herbicides', 'Expense', 'Direct Expense', v_direct_expenses_id, false, true, currency_code, true, 'Crop protection chemicals'),
    (org_id, '5140', 'Water and Irrigation', 'Expense', 'Direct Expense', v_direct_expenses_id, false, true, currency_code, true, 'Water costs'),
    (org_id, '5150', 'Labor - Direct', 'Expense', 'Direct Expense', v_direct_expenses_id, false, true, currency_code, true, 'Direct farm labor'),
    (org_id, '5160', 'Harvest Costs', 'Expense', 'Direct Expense', v_direct_expenses_id, false, true, currency_code, true, 'Harvesting expenses'),
    (org_id, '5170', 'Packaging Materials', 'Expense', 'Direct Expense', v_direct_expenses_id, false, true, currency_code, true, 'Packaging costs');

  -- Operating Expenses
  INSERT INTO public.accounts (organization_id, code, name, account_type, account_subtype, parent_id, is_group, is_active, currency_code, allow_cost_center)
  VALUES (org_id, '5200', 'Operating Expenses', 'Expense', 'Operating Expense', v_expenses_id, true, true, currency_code, false)
  RETURNING id INTO v_indirect_expenses_id;

  INSERT INTO public.accounts (organization_id, code, name, account_type, account_subtype, parent_id, is_group, is_active, currency_code, allow_cost_center, description)
  VALUES
    (org_id, '5210', 'Salaries and Wages - Admin', 'Expense', 'Operating Expense', v_indirect_expenses_id, false, true, currency_code, true, 'Administrative salaries'),
    (org_id, '5220', 'Rent Expense', 'Expense', 'Operating Expense', v_indirect_expenses_id, false, true, currency_code, true, 'Rent for land/facilities'),
    (org_id, '5230', 'Utilities', 'Expense', 'Operating Expense', v_indirect_expenses_id, false, true, currency_code, true, 'Electricity, water, gas'),
    (org_id, '5240', 'Fuel and Oil', 'Expense', 'Operating Expense', v_indirect_expenses_id, false, true, currency_code, true, 'Fuel for equipment'),
    (org_id, '5250', 'Repairs and Maintenance', 'Expense', 'Operating Expense', v_indirect_expenses_id, false, true, currency_code, true, 'Equipment/building repairs'),
    (org_id, '5260', 'Insurance', 'Expense', 'Operating Expense', v_indirect_expenses_id, false, true, currency_code, false, 'Business insurance'),
    (org_id, '5270', 'Professional Fees', 'Expense', 'Operating Expense', v_indirect_expenses_id, false, true, currency_code, false, 'Legal, accounting fees'),
    (org_id, '5280', 'Office Supplies', 'Expense', 'Operating Expense', v_indirect_expenses_id, false, true, currency_code, false, 'Office materials'),
    (org_id, '5290', 'Transportation', 'Expense', 'Operating Expense', v_indirect_expenses_id, false, true, currency_code, true, 'Transport costs'),
    (org_id, '5300', 'Marketing and Advertising', 'Expense', 'Operating Expense', v_indirect_expenses_id, false, true, currency_code, false, 'Marketing expenses'),
    (org_id, '5310', 'Depreciation Expense', 'Expense', 'Operating Expense', v_indirect_expenses_id, false, true, currency_code, false, 'Depreciation charges'),
    (org_id, '5320', 'Interest Expense', 'Expense', 'Operating Expense', v_indirect_expenses_id, false, true, currency_code, false, 'Interest on loans'),
    (org_id, '5330', 'Bank Charges', 'Expense', 'Operating Expense', v_indirect_expenses_id, false, true, currency_code, false, 'Banking fees'),
    (org_id, '5340', 'Licenses and Permits', 'Expense', 'Operating Expense', v_indirect_expenses_id, false, true, currency_code, false, 'Government licenses'),
    (org_id, '5350', 'Taxes and Fees', 'Expense', 'Operating Expense', v_indirect_expenses_id, false, true, currency_code, false, 'Business taxes'),
    (org_id, '5360', 'Miscellaneous Expenses', 'Expense', 'Operating Expense', v_indirect_expenses_id, false, true, currency_code, false, 'Other expenses');

  RAISE NOTICE 'Successfully seeded chart of accounts for organization %', org_id;
END;
$$;


ALTER FUNCTION "public"."seed_chart_of_accounts"("org_id" "uuid", "currency_code" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."seed_chart_of_accounts"("org_id" "uuid", "currency_code" "text") IS 'Seeds a standard chart of accounts for an organization. Can be called manually or automatically via trigger.';



CREATE OR REPLACE FUNCTION "public"."seed_default_item_groups"("p_organization_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Main Agriculture group
  INSERT INTO item_groups (organization_id, name, code, description, sort_order)
  VALUES 
    (p_organization_id, 'Agriculture', 'AGRIC', 'Agricultural products and inputs', 1)
  ON CONFLICT (organization_id, name, COALESCE(parent_group_id, '00000000-0000-0000-0000-000000000000'::UUID)) DO NOTHING;
  
  -- Get agriculture group ID
  DECLARE
    v_agric_id UUID;
  BEGIN
    SELECT id INTO v_agric_id FROM item_groups 
    WHERE organization_id = p_organization_id AND name = 'Agriculture';
    
    -- Sub-groups
    INSERT INTO item_groups (organization_id, parent_group_id, name, code, description, sort_order)
    VALUES 
      (p_organization_id, v_agric_id, 'Crops', 'CROPS', 'Agricultural crops', 1),
      (p_organization_id, v_agric_id, 'Inputs', 'INPUTS', 'Agricultural inputs (fertilizers, seeds, etc.)', 2),
      (p_organization_id, v_agric_id, 'Equipment', 'EQUIP', 'Agricultural equipment and tools', 3)
    ON CONFLICT (organization_id, name, COALESCE(parent_group_id, '00000000-0000-0000-0000-000000000000'::UUID)) DO NOTHING;
  END;
END;
$$;


ALTER FUNCTION "public"."seed_default_item_groups"("p_organization_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."seed_default_item_groups"("p_organization_id" "uuid") IS 'Creates default item groups for a new organization';



CREATE OR REPLACE FUNCTION "public"."seed_default_work_units"("p_organization_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Count-based units
  INSERT INTO work_units (organization_id, code, name, name_fr, name_ar, unit_category, allow_decimal, created_by)
  VALUES
    (p_organization_id, 'TREE', 'Tree', 'Arbre', 'شجرة', 'count', false, auth.uid()),
    (p_organization_id, 'PLANT', 'Plant', 'Plante', 'نبتة', 'count', false, auth.uid()),
    (p_organization_id, 'UNIT', 'Unit', 'Unité', 'وحدة', 'count', false, auth.uid()),
    (p_organization_id, 'BOX', 'Box', 'Caisse', 'صندوق', 'count', false, auth.uid()),
    (p_organization_id, 'CRATE', 'Crate', 'Caisse', 'قفص', 'count', false, auth.uid()),
    (p_organization_id, 'BAG', 'Bag', 'Sac', 'كيس', 'count', false, auth.uid()),

    -- Weight units
    (p_organization_id, 'KG', 'Kilogram', 'Kilogramme', 'كيلوغرام', 'weight', true, auth.uid()),
    (p_organization_id, 'TON', 'Ton', 'Tonne', 'طن', 'weight', true, auth.uid()),
    (p_organization_id, 'QUINTAL', 'Quintal', 'Quintal', 'قنطار', 'weight', true, auth.uid()),

    -- Volume units
    (p_organization_id, 'LITER', 'Liter', 'Litre', 'لتر', 'volume', true, auth.uid()),
    (p_organization_id, 'M3', 'Cubic meter', 'Mètre cube', 'متر مكعب', 'volume', true, auth.uid()),

    -- Area units
    (p_organization_id, 'HA', 'Hectare', 'Hectare', 'هكتار', 'area', true, auth.uid()),
    (p_organization_id, 'M2', 'Square meter', 'Mètre carré', 'متر مربع', 'area', true, auth.uid()),

    -- Length units
    (p_organization_id, 'M', 'Meter', 'Mètre', 'متر', 'length', true, auth.uid()),
    (p_organization_id, 'KM', 'Kilometer', 'Kilomètre', 'كيلومتر', 'length', true, auth.uid())
  ON CONFLICT (organization_id, code) DO NOTHING;
END;
$$;


ALTER FUNCTION "public"."seed_default_work_units"("p_organization_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."seed_tree_data_for_new_organization"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    category_id uuid;
BEGIN
    -- Category 1: Arbres fruitiers à noyau
    INSERT INTO public.tree_categories (organization_id, category)
    VALUES (NEW.id, 'Arbres fruitiers à noyau')
    RETURNING id INTO category_id;

    INSERT INTO public.trees (category_id, name) VALUES
        (category_id, 'Olivier'),
        (category_id, 'Pêcher'),
        (category_id, 'Abricotier'),
        (category_id, 'Prunier'),
        (category_id, 'Cerisier'),
        (category_id, 'Amandier'),
        (category_id, 'Nectarine'),
        (category_id, 'Arganier');

    -- Category 2: Arbres fruitiers à pépins
    INSERT INTO public.tree_categories (organization_id, category)
    VALUES (NEW.id, 'Arbres fruitiers à pépins')
    RETURNING id INTO category_id;

    INSERT INTO public.trees (category_id, name) VALUES
        (category_id, 'Pommier'),
        (category_id, 'Poirier'),
        (category_id, 'Cognassier'),
        (category_id, 'Nashi');

    -- Category 3: Agrumes
    INSERT INTO public.tree_categories (organization_id, category)
    VALUES (NEW.id, 'Agrumes')
    RETURNING id INTO category_id;

    INSERT INTO public.trees (category_id, name) VALUES
        (category_id, 'Oranger'),
        (category_id, 'Mandariner'),
        (category_id, 'Citronnier'),
        (category_id, 'Pamplemoussier'),
        (category_id, 'Pomelo'),
        (category_id, 'Combava'),
        (category_id, 'Cédratier');

    -- Category 4: Arbres tropicaux et subtropicaus
    INSERT INTO public.tree_categories (organization_id, category)
    VALUES (NEW.id, 'Arbres tropicaux et subtropicaus')
    RETURNING id INTO category_id;

    INSERT INTO public.trees (category_id, name) VALUES
        (category_id, 'Avocatier'),
        (category_id, 'Manguier'),
        (category_id, 'Litchi'),
        (category_id, 'Longanier'),
        (category_id, 'Ramboutan'),
        (category_id, 'Garambolier'),
        (category_id, 'Goyavier'),
        (category_id, 'Coroddolier'),
        (category_id, 'Cherimolier'),
        (category_id, 'Sapotillier'),
        (category_id, 'Jacquier'),
        (category_id, 'Durian'),
        (category_id, 'Papayer'),
        (category_id, 'Bananiers');

    -- Category 5: Arbres à fruits secs
    INSERT INTO public.tree_categories (organization_id, category)
    VALUES (NEW.id, 'Arbres à fruits secs')
    RETURNING id INTO category_id;

    INSERT INTO public.trees (category_id, name) VALUES
        (category_id, 'Noyer'),
        (category_id, 'Châtagnier'),
        (category_id, 'Noisetier'),
        (category_id, 'Pistachier'),
        (category_id, 'Macadamia'),
        (category_id, 'Cacaoyer'),
        (category_id, 'Caféier');

    -- Category 6: Vigne et assimilés
    INSERT INTO public.tree_categories (organization_id, category)
    VALUES (NEW.id, 'Vigne et assimilés')
    RETURNING id INTO category_id;

    INSERT INTO public.trees (category_id, name) VALUES
        (category_id, 'Vigne'),
        (category_id, 'Kiwier'),
        (category_id, 'Grenadier'),
        (category_id, 'Figuier'),
        (category_id, 'Murier');

    -- Category 7: Palamcées fruitières
    INSERT INTO public.tree_categories (organization_id, category)
    VALUES (NEW.id, 'Palamcées fruitières')
    RETURNING id INTO category_id;

    INSERT INTO public.trees (category_id, name) VALUES
        (category_id, 'Palmier dattier'),
        (category_id, 'Cocotier'),
        (category_id, 'Plamier à huile'),
        (category_id, 'Açai');

    -- Insert plantation types
    INSERT INTO public.plantation_types (organization_id, type, spacing, trees_per_ha) VALUES
        (NEW.id, 'Super intensif', '4x1,5', 1666),
        (NEW.id, 'Super intensif', '3x1,5', 2222),
        (NEW.id, 'Intensif', '4x2', 1250),
        (NEW.id, 'Intensif', '3x2', 1666),
        (NEW.id, 'Semi-intensif', '6x3', 555),
        (NEW.id, 'Traditionnel amélioré', '6x6', 277),
        (NEW.id, 'Traditionnel', '8x8', 156),
        (NEW.id, 'Traditionnel', '8x7', 179),
        (NEW.id, 'Traditionnel très espacé', '10x10', 100);

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."seed_tree_data_for_new_organization"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."seed_tree_data_for_new_organization"() IS 'Seeds default tree categories and plantation types for new organizations. Runs as SECURITY DEFINER to bypass RLS during initial setup.';



CREATE OR REPLACE FUNCTION "public"."set_lab_order_number"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := generate_lab_order_number();
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_lab_order_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_create_payment_journal"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Only create journal entry when payment is marked as 'paid'
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    PERFORM create_payment_journal_entry(NEW.id);
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_create_payment_journal"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_create_stock_journal"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Only create journal entry when status changes to 'Posted'
  IF NEW.status = 'Posted' AND (OLD.status IS NULL OR OLD.status != 'Posted') THEN
    -- Call function to create journal entry (in a separate transaction)
    PERFORM create_stock_journal_entry(NEW.id);
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_create_stock_journal"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_create_task_cost_journal"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Only create journal entry when status changes to 'paid'
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid') THEN
    PERFORM create_task_cost_journal_entry(NEW.id);
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_create_task_cost_journal"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_link_piece_work_to_payment"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- When payment_record_id is set, update payment_status
  IF NEW.payment_record_id IS NOT NULL AND (OLD.payment_record_id IS NULL OR OLD.payment_record_id != NEW.payment_record_id) THEN
    NEW.payment_status := 'approved';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_link_piece_work_to_payment"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_on_user_created"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Make async HTTP request to edge function
  -- Note: Replace 'your-project-ref' with actual project reference in production
  PERFORM net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/on-user-created',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'users',
      'schema', 'auth',
      'record', to_jsonb(NEW),
      'old_record', null
    )
  );

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_on_user_created"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."trigger_on_user_created"() IS 'Triggers edge function to setup new user profile and organization';



CREATE OR REPLACE FUNCTION "public"."trigger_update_reception_batch_status"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- When quality check is done
  IF NEW.quality_checked_by IS NOT NULL AND (OLD.quality_checked_by IS NULL OR OLD IS NULL) THEN
    NEW.status := 'quality_checked';
  END IF;

  -- When decision is made
  IF NEW.decision != 'pending' AND (OLD IS NULL OR OLD.decision = 'pending') THEN
    IF NEW.status IN ('received', 'quality_checked') THEN
      NEW.status := 'decision_made';
    END IF;
  END IF;

  -- When stock entry or sales order is linked
  IF (NEW.stock_entry_id IS NOT NULL OR NEW.sales_order_id IS NOT NULL)
     AND NEW.status = 'decision_made' THEN
    NEW.status := 'processed';
  END IF;

  NEW.updated_at := NOW();

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_update_reception_batch_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_advance_balance"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    -- Update remaining balances of advances being deducted
    UPDATE payment_advances
    SET 
      remaining_balance = GREATEST(0, remaining_balance - 
        CASE 
          WHEN (deduction_plan->>'installments')::INTEGER > 0 THEN
            (deduction_plan->>'amount_per_installment')::DECIMAL
          ELSE remaining_balance
        END
      ),
      updated_at = NOW()
    WHERE worker_id = NEW.worker_id
      AND status = 'paid'
      AND remaining_balance > 0;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_advance_balance"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_delivery_totals"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_total_quantity DECIMAL;
  v_total_amount DECIMAL;
BEGIN
  -- Calculate totals from delivery items
  SELECT 
    COALESCE(SUM(quantity), 0),
    COALESCE(SUM(total_amount), 0)
  INTO v_total_quantity, v_total_amount
  FROM delivery_items
  WHERE delivery_id = COALESCE(NEW.delivery_id, OLD.delivery_id);
  
  -- Update delivery record
  UPDATE deliveries
  SET 
    total_quantity = v_total_quantity,
    total_amount = v_total_amount,
    updated_at = NOW()
  WHERE id = COALESCE(NEW.delivery_id, OLD.delivery_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."update_delivery_totals"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_document_template_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_document_template_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_expired_subscriptions"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  UPDATE public.subscriptions
  SET
    status = 'past_due',
    updated_at = NOW()
  WHERE
    status IN ('active', 'trialing')
    AND current_period_end < NOW()
    AND NOT cancel_at_period_end;

  -- Cancel subscriptions that were set to cancel at period end
  UPDATE public.subscriptions
  SET
    status = 'canceled',
    canceled_at = NOW(),
    updated_at = NOW()
  WHERE
    status IN ('active', 'trialing')
    AND current_period_end < NOW()
    AND cancel_at_period_end;
END;
$$;


ALTER FUNCTION "public"."update_expired_subscriptions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_harvest_status_on_delivery"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Update harvest record status when added to delivery
  UPDATE harvest_records
  SET 
    status = 'in_delivery',
    updated_at = NOW()
  WHERE id = NEW.harvest_record_id
    AND status = 'stored';
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_harvest_status_on_delivery"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_harvest_status_on_delivery_complete"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
    -- Update all harvest records in this delivery to delivered
    UPDATE harvest_records hr
    SET 
      status = 'delivered',
      updated_at = NOW()
    FROM delivery_items di
    WHERE di.delivery_id = NEW.id
      AND di.harvest_record_id = hr.id;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_harvest_status_on_delivery_complete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_inventory_item_status"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.quantity = 0 THEN
    NEW.status = 'out_of_stock';
  ELSIF NEW.quantity < COALESCE(NEW.minimum_stock, 10) THEN
    NEW.status = 'low_stock';
  ELSE
    NEW.status = 'available';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_inventory_item_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_invoice_outstanding"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_invoice_id UUID;
  v_total_allocated DECIMAL(15, 2);
  v_grand_total DECIMAL(15, 2);
  v_outstanding DECIMAL(15, 2);
BEGIN
  v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);

  -- Calculate total allocated
  SELECT COALESCE(SUM(allocated_amount), 0), i.grand_total
  INTO v_total_allocated, v_grand_total
  FROM payment_allocations pa
  JOIN invoices i ON i.id = v_invoice_id
  WHERE pa.invoice_id = v_invoice_id
  GROUP BY i.grand_total;

  v_outstanding := v_grand_total - COALESCE(v_total_allocated, 0);

  UPDATE invoices
  SET
    outstanding_amount = v_outstanding,
    status = CASE
      WHEN v_outstanding = 0 THEN 'paid'::invoice_status
      WHEN v_outstanding < v_grand_total THEN 'partially_paid'::invoice_status
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = v_invoice_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."update_invoice_outstanding"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_invoice_totals"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE invoices
  SET
    subtotal = (SELECT COALESCE(SUM(amount - tax_amount), 0) FROM invoice_items WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)),
    tax_total = (SELECT COALESCE(SUM(tax_amount), 0) FROM invoice_items WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)),
    grand_total = (SELECT COALESCE(SUM(amount), 0) FROM invoice_items WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);

  -- Also update outstanding_amount if not yet paid
  UPDATE invoices
  SET outstanding_amount = grand_total
  WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id) AND status = 'draft';

  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."update_invoice_totals"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_item_group_path"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.parent_group_id IS NOT NULL THEN
    SELECT path || '/' || NEW.name
    INTO NEW.path
    FROM item_groups
    WHERE id = NEW.parent_group_id;
  ELSE
    NEW.path := NEW.name;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_item_group_path"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_item_rates"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Update last_purchase_rate when material receipt is posted
  IF NEW.status = 'Posted' AND NEW.entry_type = 'Material Receipt' THEN
    UPDATE items i
    SET last_purchase_rate = (
      SELECT AVG(cost_per_unit)
      FROM stock_entry_items sei
      WHERE sei.item_id = i.id
        AND sei.stock_entry_id = NEW.id
    )
    WHERE id IN (
      SELECT item_id FROM stock_entry_items WHERE stock_entry_id = NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_item_rates"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_lab_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_lab_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_po_on_receipt_post"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.status = 'Posted' AND NEW.entry_type = 'Material Receipt' AND NEW.reference_type = 'Purchase Order' THEN
    UPDATE purchase_orders
    SET
      stock_received = TRUE,
      stock_received_date = NEW.entry_date
    WHERE id = NEW.reference_id;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_po_on_receipt_post"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_so_on_issue_post"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.status = 'Posted' AND NEW.entry_type = 'Material Issue' AND NEW.reference_type = 'Sales Order' THEN
    UPDATE sales_orders
    SET
      stock_issued = TRUE,
      stock_issued_date = NEW.entry_date
    WHERE id = NEW.reference_id;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_so_on_issue_post"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_stock_entry_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at := NOW();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_stock_entry_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_stock_on_entry_post"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_item RECORD;
  v_current_balance DECIMAL(12, 3);
  v_valuation_method TEXT;
  v_cost_per_unit DECIMAL(12, 2);
  -- Variables for Material Issue
  v_issue_quantity DECIMAL(12, 3);
  v_valuation_record RECORD;
  v_consume DECIMAL(12, 3);
  -- Variables for Stock Transfer
  v_transfer_quantity DECIMAL(12, 3);
  v_transfer_cost DECIMAL(12, 2);
  -- Variables for Stock Reconciliation
  v_system_quantity DECIMAL(12, 3);
  v_physical_quantity DECIMAL(12, 3);
  v_adjustment DECIMAL(12, 3);
  v_reduce_quantity DECIMAL(12, 3);
BEGIN
  -- Only process if status changed to 'Posted'
  IF NEW.status = 'Posted' AND (OLD.status IS NULL OR OLD.status != 'Posted') THEN

    -- Process each item in the entry
    FOR v_item IN
      SELECT * FROM stock_entry_items WHERE stock_entry_id = NEW.id
    LOOP
      -- Get item's valuation method
      SELECT valuation_method INTO v_valuation_method
      FROM items
      WHERE id = v_item.item_id;

      -- Use cost from stock entry item, or default to 0
      v_cost_per_unit := COALESCE(v_item.cost_per_unit, 0);

      -- Handle different entry types
      CASE NEW.entry_type
        WHEN 'Material Receipt' THEN
          -- Create stock_valuation entry for receipt
          INSERT INTO stock_valuation (
            organization_id,
            item_id,
            warehouse_id,
            quantity,
            remaining_quantity,
            cost_per_unit,
            valuation_date,
            stock_entry_id,
            batch_number,
            serial_number
          ) VALUES (
            NEW.organization_id,
            v_item.item_id,
            NEW.to_warehouse_id,
            v_item.quantity,
            v_item.quantity, -- Initially, remaining quantity equals quantity
            v_cost_per_unit,
            NEW.entry_date,
            NEW.id,
            v_item.batch_number,
            v_item.serial_number
          );

          -- Calculate current balance from stock_valuation
          SELECT COALESCE(SUM(remaining_quantity), 0) INTO v_current_balance
          FROM stock_valuation
          WHERE item_id = v_item.item_id
            AND warehouse_id = NEW.to_warehouse_id
            AND remaining_quantity > 0;

          -- Record movement
          INSERT INTO stock_movements (
            organization_id, movement_type, item_id, warehouse_id,
            quantity, unit, balance_quantity, cost_per_unit, total_cost,
            stock_entry_id, stock_entry_item_id, batch_number, serial_number, created_by
          ) VALUES (
            NEW.organization_id, 'IN', v_item.item_id, NEW.to_warehouse_id,
            v_item.quantity, v_item.unit, v_current_balance,
            v_cost_per_unit, COALESCE(v_item.total_cost, v_item.quantity * v_cost_per_unit),
            NEW.id, v_item.id, v_item.batch_number, v_item.serial_number, NEW.posted_by
          );

        WHEN 'Material Issue' THEN
          -- For issues, we need to reduce remaining_quantity from stock_valuation
          -- Use FIFO/LIFO logic based on item's valuation method
          v_issue_quantity := v_item.quantity;

          IF v_valuation_method = 'FIFO' THEN
            -- FIFO: Consume oldest first
            FOR v_valuation_record IN
              SELECT * FROM stock_valuation
              WHERE item_id = v_item.item_id
                AND warehouse_id = NEW.from_warehouse_id
                AND remaining_quantity > 0
              ORDER BY valuation_date ASC
            LOOP
              IF v_issue_quantity <= 0 THEN
                EXIT;
              END IF;

              v_consume := LEAST(v_issue_quantity, v_valuation_record.remaining_quantity);
              
              -- Reduce remaining quantity
              UPDATE stock_valuation
              SET remaining_quantity = remaining_quantity - v_consume
              WHERE id = v_valuation_record.id;

              v_issue_quantity := v_issue_quantity - v_consume;
            END LOOP;

          ELSIF v_valuation_method = 'LIFO' THEN
            -- LIFO: Consume newest first
            FOR v_valuation_record IN
              SELECT * FROM stock_valuation
              WHERE item_id = v_item.item_id
                AND warehouse_id = NEW.from_warehouse_id
                AND remaining_quantity > 0
              ORDER BY valuation_date DESC
            LOOP
              IF v_issue_quantity <= 0 THEN
                EXIT;
              END IF;

              v_consume := LEAST(v_issue_quantity, v_valuation_record.remaining_quantity);
              
              -- Reduce remaining quantity
              UPDATE stock_valuation
              SET remaining_quantity = remaining_quantity - v_consume
              WHERE id = v_valuation_record.id;

              v_issue_quantity := v_issue_quantity - v_consume;
            END LOOP;

          ELSE -- Moving Average
            -- For Moving Average, reduce from oldest entry
            -- This is simplified - in a real system, you'd track average cost
            UPDATE stock_valuation
            SET remaining_quantity = GREATEST(remaining_quantity - v_item.quantity, 0)
            WHERE id = (
              SELECT id FROM stock_valuation
              WHERE item_id = v_item.item_id
                AND warehouse_id = NEW.from_warehouse_id
                AND remaining_quantity > 0
              ORDER BY valuation_date ASC
              LIMIT 1
            );
          END IF;

          -- Calculate current balance
          SELECT COALESCE(SUM(remaining_quantity), 0) INTO v_current_balance
          FROM stock_valuation
          WHERE item_id = v_item.item_id
            AND warehouse_id = NEW.from_warehouse_id
            AND remaining_quantity > 0;

          -- Record movement
          INSERT INTO stock_movements (
            organization_id, movement_type, item_id, warehouse_id,
            quantity, unit, balance_quantity, cost_per_unit, total_cost,
            stock_entry_id, stock_entry_item_id, batch_number, serial_number, created_by
          ) VALUES (
            NEW.organization_id, 'OUT', v_item.item_id, NEW.from_warehouse_id,
            -v_item.quantity, v_item.unit, v_current_balance,
            v_cost_per_unit, COALESCE(v_item.total_cost, v_item.quantity * v_cost_per_unit),
            NEW.id, v_item.id, v_item.batch_number, v_item.serial_number, NEW.posted_by
          );

        WHEN 'Stock Transfer' THEN
          -- Transfer: Reduce from source, add to target
          v_transfer_quantity := v_item.quantity;

          -- Get cost from source warehouse (FIFO order)
          SELECT cost_per_unit INTO v_transfer_cost
          FROM stock_valuation
          WHERE item_id = v_item.item_id
            AND warehouse_id = NEW.from_warehouse_id
            AND remaining_quantity > 0
          ORDER BY valuation_date ASC
          LIMIT 1;

          v_transfer_cost := COALESCE(v_transfer_cost, 0);

          -- Reduce from source warehouse (FIFO)
          FOR v_valuation_record IN
            SELECT * FROM stock_valuation
            WHERE item_id = v_item.item_id
              AND warehouse_id = NEW.from_warehouse_id
              AND remaining_quantity > 0
            ORDER BY valuation_date ASC
          LOOP
            IF v_transfer_quantity <= 0 THEN
              EXIT;
            END IF;

            v_consume := LEAST(v_transfer_quantity, v_valuation_record.remaining_quantity);
            
            UPDATE stock_valuation
            SET remaining_quantity = remaining_quantity - v_consume
            WHERE id = v_valuation_record.id;

            v_transfer_quantity := v_transfer_quantity - v_consume;
          END LOOP;

          -- Add to target warehouse
          INSERT INTO stock_valuation (
            organization_id,
            item_id,
            warehouse_id,
            quantity,
            remaining_quantity,
            cost_per_unit,
            valuation_date,
            stock_entry_id,
            batch_number,
            serial_number
          ) VALUES (
            NEW.organization_id,
            v_item.item_id,
            NEW.to_warehouse_id,
            v_item.quantity,
            v_item.quantity,
            v_transfer_cost,
            NEW.entry_date,
            NEW.id,
            v_item.batch_number,
            v_item.serial_number
          );

          -- Record movements
          SELECT COALESCE(SUM(remaining_quantity), 0) INTO v_current_balance
          FROM stock_valuation
          WHERE item_id = v_item.item_id
            AND warehouse_id = NEW.from_warehouse_id
            AND remaining_quantity > 0;

          INSERT INTO stock_movements (
            organization_id, movement_type, item_id, warehouse_id,
            quantity, unit, balance_quantity,
            stock_entry_id, stock_entry_item_id, batch_number, serial_number, created_by
          ) VALUES (
            NEW.organization_id, 'TRANSFER', v_item.item_id, NEW.from_warehouse_id,
            -v_item.quantity, v_item.unit, v_current_balance,
            NEW.id, v_item.id, v_item.batch_number, v_item.serial_number, NEW.posted_by
          );

          SELECT COALESCE(SUM(remaining_quantity), 0) INTO v_current_balance
          FROM stock_valuation
          WHERE item_id = v_item.item_id
            AND warehouse_id = NEW.to_warehouse_id
            AND remaining_quantity > 0;

          INSERT INTO stock_movements (
            organization_id, movement_type, item_id, warehouse_id,
            quantity, unit, balance_quantity,
            stock_entry_id, stock_entry_item_id, batch_number, serial_number, created_by
          ) VALUES (
            NEW.organization_id, 'TRANSFER', v_item.item_id, NEW.to_warehouse_id,
            v_item.quantity, v_item.unit, v_current_balance,
            NEW.id, v_item.id, v_item.batch_number, v_item.serial_number, NEW.posted_by
          );

        WHEN 'Stock Reconciliation' THEN
          -- Reconciliation: Adjust stock to match physical count
          v_physical_quantity := COALESCE(v_item.physical_quantity, 0);
          
          -- Get current system quantity
          SELECT COALESCE(SUM(remaining_quantity), 0) INTO v_system_quantity
          FROM stock_valuation
          WHERE item_id = v_item.item_id
            AND warehouse_id = NEW.to_warehouse_id
            AND remaining_quantity > 0;

          v_adjustment := v_physical_quantity - v_system_quantity;

          IF v_adjustment > 0 THEN
            -- Stock increase: Create new valuation entry
            INSERT INTO stock_valuation (
              organization_id,
              item_id,
              warehouse_id,
              quantity,
              remaining_quantity,
              cost_per_unit,
              valuation_date,
              stock_entry_id,
              batch_number
            ) VALUES (
              NEW.organization_id,
              v_item.item_id,
              NEW.to_warehouse_id,
              v_adjustment,
              v_adjustment,
              COALESCE(v_item.cost_per_unit, 0),
              NEW.entry_date,
              NEW.id,
              v_item.batch_number
            );

            -- Record IN movement
            INSERT INTO stock_movements (
              organization_id, movement_type, item_id, warehouse_id,
              quantity, unit, balance_quantity,
              stock_entry_id, stock_entry_item_id, created_by
            ) VALUES (
              NEW.organization_id, 'IN', v_item.item_id, NEW.to_warehouse_id,
              v_adjustment, v_item.unit, v_physical_quantity,
              NEW.id, v_item.id, NEW.posted_by
            );

          ELSIF v_adjustment < 0 THEN
            -- Stock decrease: Reduce from existing valuations (FIFO)
            v_reduce_quantity := ABS(v_adjustment);

            FOR v_valuation_record IN
              SELECT * FROM stock_valuation
              WHERE item_id = v_item.item_id
                AND warehouse_id = NEW.to_warehouse_id
                AND remaining_quantity > 0
              ORDER BY valuation_date ASC
            LOOP
              IF v_reduce_quantity <= 0 THEN
                EXIT;
              END IF;

              v_consume := LEAST(v_reduce_quantity, v_valuation_record.remaining_quantity);
              
              UPDATE stock_valuation
              SET remaining_quantity = remaining_quantity - v_consume
              WHERE id = v_valuation_record.id;

              v_reduce_quantity := v_reduce_quantity - v_consume;
            END LOOP;

            -- Record OUT movement
            INSERT INTO stock_movements (
              organization_id, movement_type, item_id, warehouse_id,
              quantity, unit, balance_quantity,
              stock_entry_id, stock_entry_item_id, created_by
            ) VALUES (
              NEW.organization_id, 'OUT', v_item.item_id, NEW.to_warehouse_id,
              v_adjustment, v_item.unit, v_physical_quantity,
              NEW.id, v_item.id, NEW.posted_by
            );
          END IF;
      END CASE;
    END LOOP;

    -- Update posted timestamp
    NEW.posted_at := NOW();
    NEW.posted_by := auth.uid();
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_stock_on_entry_post"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_subscription_limits"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Set limits based on plan type
  CASE NEW.plan_type
    WHEN 'essential' THEN
      NEW.max_farms := 2;
      NEW.max_parcels := 25;
      NEW.max_users := 5;
      NEW.max_satellite_reports := 0;
      NEW.has_analytics := false;
      NEW.has_sensor_integration := false;
      NEW.has_ai_recommendations := false;
      NEW.has_advanced_reporting := false;
      NEW.has_api_access := false;
      NEW.has_priority_support := false;

    WHEN 'professional' THEN
      NEW.max_farms := 10;
      NEW.max_parcels := 200;
      NEW.max_users := 25;
      NEW.max_satellite_reports := 10;
      NEW.has_analytics := true;
      NEW.has_sensor_integration := true;
      NEW.has_ai_recommendations := true;
      NEW.has_advanced_reporting := true;
      NEW.has_api_access := false;
      NEW.has_priority_support := false;

    WHEN 'enterprise' THEN
      NEW.max_farms := 999999; -- Unlimited
      NEW.max_parcels := 999999; -- Unlimited
      NEW.max_users := 999999; -- Unlimited
      NEW.max_satellite_reports := 999999; -- Unlimited
      NEW.has_analytics := true;
      NEW.has_sensor_integration := true;
      NEW.has_ai_recommendations := true;
      NEW.has_advanced_reporting := true;
      NEW.has_api_access := true;
      NEW.has_priority_support := true;
  END CASE;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_subscription_limits"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_worker_stats_from_task"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    UPDATE workers
    SET 
      total_tasks_completed = total_tasks_completed + 1,
      updated_at = NOW()
    WHERE id = NEW.assigned_to;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_worker_stats_from_task"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_yield_variance"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Calculate variance if both actual and target are provided
  IF NEW.actual_yield_per_hectare IS NOT NULL AND NEW.target_yield_per_hectare IS NOT NULL AND NEW.target_yield_per_hectare > 0 THEN
    NEW.yield_variance_percent := ROUND(
      ((NEW.actual_yield_per_hectare - NEW.target_yield_per_hectare) / NEW.target_yield_per_hectare * 100)::NUMERIC,
      2
    );
    NEW.performance_rating := calculate_performance_rating(NEW.yield_variance_percent);
  END IF;

  -- Calculate profit if revenue and cost are provided
  IF NEW.revenue_amount IS NOT NULL AND NEW.cost_amount IS NOT NULL THEN
    NEW.profit_amount := NEW.revenue_amount - NEW.cost_amount;
    IF NEW.revenue_amount > 0 THEN
      NEW.profit_margin_percent := ROUND(
        (NEW.profit_amount / NEW.revenue_amount * 100)::NUMERIC,
        2
      );
    END IF;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_yield_variance"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_can_view_org_membership"("org_id" "uuid", "viewing_user_id" "uuid", "target_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  result BOOLEAN;
BEGIN
    -- User can view their own membership (no query needed)
    IF viewing_user_id = target_user_id THEN
        RETURN TRUE;
    END IF;

    -- Explicitly disable RLS to prevent recursion
    PERFORM set_config('row_security', 'off', true);
    
    -- User can view memberships in their own organizations
    SELECT EXISTS (
        SELECT 1
        FROM public.organization_users ou
        WHERE ou.organization_id = org_id
          AND ou.user_id = viewing_user_id
          AND ou.is_active = true
    ) INTO result;
    
    RETURN COALESCE(result, FALSE);
END;
$$;


ALTER FUNCTION "public"."user_can_view_org_membership"("org_id" "uuid", "viewing_user_id" "uuid", "target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_has_permission"("user_id" "uuid", "permission_name" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.organization_users ou
        JOIN public.role_permissions rp ON rp.role_id = ou.role_id
        JOIN public.permissions p ON p.id = rp.permission_id
        WHERE ou.user_id = $1 AND p.name = $2
    );
END;
$_$;


ALTER FUNCTION "public"."user_has_permission"("user_id" "uuid", "permission_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_has_permission_for_org"("user_id" "uuid", "org_id" "uuid", "permission_name" "text") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.organization_users ou
        JOIN public.role_permissions rp ON rp.role_id = ou.role_id
        JOIN public.permissions p ON p.id = rp.permission_id
        WHERE ou.user_id = user_has_permission_for_org.user_id 
        AND ou.organization_id = user_has_permission_for_org.org_id
        AND ou.is_active = true
        AND p.name = user_has_permission_for_org.permission_name
    );
END;
$$;


ALTER FUNCTION "public"."user_has_permission_for_org"("user_id" "uuid", "org_id" "uuid", "permission_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_has_role"("p_user_id" "uuid", "p_organization_id" "uuid", "p_role_names" "text"[]) RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_result BOOLEAN;
BEGIN
  -- Check if user has one of the specified roles
  -- Use fully qualified table names
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_users ou
    WHERE ou.user_id = p_user_id
      AND ou.organization_id = p_organization_id
      AND ou.is_active = true
      AND (
        -- Check role TEXT column directly (e.g., 'owner', 'admin', etc.)
        ou.role = ANY(p_role_names)
        OR
        -- Check via roles table if role_id is set
        (ou.role_id IS NOT NULL AND EXISTS (
          SELECT 1
          FROM public.roles r
          WHERE r.id = ou.role_id
          AND r.name = ANY(p_role_names)
        ))
      )
  ) INTO v_result;
  
  RETURN COALESCE(v_result, FALSE);
END;
$$;


ALTER FUNCTION "public"."user_has_role"("p_user_id" "uuid", "p_organization_id" "uuid", "p_role_names" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_journal_balance"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE journal_entries
  SET
    total_debit = (SELECT COALESCE(SUM(debit), 0) FROM journal_items WHERE journal_entry_id = COALESCE(NEW.journal_entry_id, OLD.journal_entry_id)),
    total_credit = (SELECT COALESCE(SUM(credit), 0) FROM journal_items WHERE journal_entry_id = COALESCE(NEW.journal_entry_id, OLD.journal_entry_id)),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.journal_entry_id, OLD.journal_entry_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."validate_journal_balance"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_role_assignment"("target_user_id" "uuid", "target_org_id" "uuid", "new_role_id" "uuid") RETURNS TABLE("is_valid" boolean, "error_message" "text", "warnings" "text"[])
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    current_user_role_level INTEGER;
    new_role_level INTEGER;
    target_user_current_role_level INTEGER;
    warnings TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Get current user's role level
    current_user_role_level := public.get_user_role_level(auth.uid(), target_org_id);
    
    -- Get new role level
    SELECT level INTO new_role_level FROM public.roles WHERE id = new_role_id;
    
    -- Get target user's current role level
    target_user_current_role_level := public.get_user_role_level(target_user_id, target_org_id);

    -- Check if user exists in organization
    IF NOT public.is_active_org_member(target_user_id, target_org_id) THEN
        RETURN QUERY SELECT FALSE, 'User is not a member of this organization', ARRAY[]::TEXT[];
        RETURN;
    END IF;

    -- Check if current user has permission
    IF NOT public.user_has_permission_for_org(auth.uid(), target_org_id, 'users.manage') THEN
        RETURN QUERY SELECT FALSE, 'Insufficient permissions to assign roles', ARRAY[]::TEXT[];
        RETURN;
    END IF;

    -- Check if user can assign this role level
    IF new_role_level < current_user_role_level THEN
        RETURN QUERY SELECT FALSE, 'Cannot assign role with higher privileges than your own', ARRAY[]::TEXT[];
        RETURN;
    END IF;

    -- Add warnings
    IF new_role_level > target_user_current_role_level THEN
        warnings := array_append(warnings, 'This will increase the user''s privileges');
    END IF;

    IF new_role_level = 1 THEN -- system_admin
        warnings := array_append(warnings, 'System admin role grants full platform access');
    END IF;

    RETURN QUERY SELECT TRUE, NULL, warnings;
END;
$$;


ALTER FUNCTION "public"."validate_role_assignment"("target_user_id" "uuid", "target_org_id" "uuid", "new_role_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."accounting_payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "payment_number" character varying(100) NOT NULL,
    "payment_type" "public"."accounting_payment_type" NOT NULL,
    "party_type" character varying(50),
    "party_id" "uuid",
    "party_name" character varying(255) NOT NULL,
    "payment_date" "date" NOT NULL,
    "payment_method" "public"."accounting_payment_method" NOT NULL,
    "amount" numeric(15,2) NOT NULL,
    "currency_code" character varying(3) DEFAULT 'MAD'::character varying NOT NULL,
    "exchange_rate" numeric(12,6) DEFAULT 1.0,
    "bank_account_id" "uuid",
    "reference_number" character varying(100),
    "status" "public"."accounting_payment_status" DEFAULT 'draft'::"public"."accounting_payment_status",
    "remarks" "text",
    "journal_entry_id" "uuid",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "accounting_payments_amount_check" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "accounting_payments_party_type_check" CHECK ((("party_type")::"text" = ANY ((ARRAY['Customer'::character varying, 'Supplier'::character varying])::"text"[])))
);


ALTER TABLE "public"."accounting_payments" OWNER TO "postgres";


COMMENT ON TABLE "public"."accounting_payments" IS 'Accounting Payments - Payment records for invoices (separate from worker payments)';



CREATE TABLE IF NOT EXISTS "public"."payment_allocations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "payment_id" "uuid" NOT NULL,
    "invoice_id" "uuid" NOT NULL,
    "allocated_amount" numeric(15,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "payment_allocations_allocated_amount_check" CHECK (("allocated_amount" > (0)::numeric))
);


ALTER TABLE "public"."payment_allocations" OWNER TO "postgres";


COMMENT ON TABLE "public"."payment_allocations" IS 'Payment Allocations - Links payments to invoices';



CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "full_name" "text",
    "first_name" "text",
    "last_name" "text",
    "avatar_url" "text",
    "phone" "text",
    "timezone" "text" DEFAULT 'UTC'::"text",
    "language" "text" DEFAULT 'en'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "password_set" boolean DEFAULT false
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."user_profiles"."password_set" IS 'Indicates if the user has set their own password (FALSE for invited users who haven''t set password yet)';



CREATE OR REPLACE VIEW "public"."accounting_payment_summary" WITH ("security_invoker"='true') AS
 SELECT "p"."id",
    "p"."organization_id",
    "p"."payment_number",
    "p"."payment_type",
    "p"."payment_date",
    "p"."amount",
    "p"."payment_method",
    "p"."reference_number",
    "p"."party_type",
    "p"."party_id",
    "p"."party_name",
    "p"."remarks",
    "p"."bank_account_id",
    "p"."created_at",
    "p"."updated_at",
    "p"."created_by",
    "up"."full_name" AS "created_by_name",
    COALESCE(( SELECT "sum"("pa"."allocated_amount") AS "sum"
           FROM "public"."payment_allocations" "pa"
          WHERE ("pa"."payment_id" = "p"."id")), (0)::numeric) AS "allocated_amount",
    ("p"."amount" - COALESCE(( SELECT "sum"("pa"."allocated_amount") AS "sum"
           FROM "public"."payment_allocations" "pa"
          WHERE ("pa"."payment_id" = "p"."id")), (0)::numeric)) AS "unallocated_amount"
   FROM ("public"."accounting_payments" "p"
     LEFT JOIN "public"."user_profiles" "up" ON (("up"."id" = "p"."created_by")));


ALTER VIEW "public"."accounting_payment_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "parent_id" "uuid",
    "code" character varying(50) NOT NULL,
    "name" character varying(255) NOT NULL,
    "account_type" character varying(50) NOT NULL,
    "account_subtype" character varying(100),
    "is_group" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "currency_code" character varying(3) DEFAULT 'MAD'::character varying,
    "allow_cost_center" boolean DEFAULT true,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    CONSTRAINT "accounts_account_type_check" CHECK ((("account_type")::"text" = ANY ((ARRAY['Asset'::character varying, 'Liability'::character varying, 'Equity'::character varying, 'Revenue'::character varying, 'Expense'::character varying])::"text"[])))
);


ALTER TABLE "public"."accounts" OWNER TO "postgres";


COMMENT ON TABLE "public"."accounts" IS 'Chart of Accounts - Hierarchical account structure for double-entry bookkeeping';



COMMENT ON COLUMN "public"."accounts"."currency_code" IS 'Currency code for this account. Should match the organization currency in most cases.';



CREATE TABLE IF NOT EXISTS "public"."tasks" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "farm_id" "uuid",
    "parcel_id" "uuid",
    "crop_id" "uuid",
    "category_id" "uuid",
    "template_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "priority" "text" DEFAULT 'medium'::"text",
    "status" "text" DEFAULT 'pending'::"text",
    "assigned_to" "uuid",
    "due_date" "date",
    "completed_date" "date",
    "estimated_duration" integer,
    "actual_duration" integer,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "organization_id" "uuid",
    "worker_id" "uuid",
    "task_type" "text" DEFAULT 'general'::"text",
    "scheduled_start" timestamp with time zone,
    "scheduled_end" timestamp with time zone,
    "actual_start" timestamp with time zone,
    "actual_end" timestamp with time zone,
    "location_lat" numeric(10,8),
    "location_lng" numeric(11,8),
    "required_skills" "text"[],
    "equipment_required" "text"[],
    "completion_percentage" integer DEFAULT 0,
    "quality_rating" integer,
    "cost_estimate" numeric(10,2),
    "actual_cost" numeric(10,2),
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "weather_dependency" boolean DEFAULT false,
    "repeat_pattern" "jsonb",
    "parent_task_id" "uuid",
    "attachments" "jsonb",
    "checklist" "jsonb",
    "work_unit_id" "uuid",
    "units_required" numeric(10,2),
    "units_completed" numeric(10,2) DEFAULT 0,
    "rate_per_unit" numeric(10,2),
    "payment_type" character varying(20) DEFAULT 'daily'::character varying,
    CONSTRAINT "tasks_completion_check" CHECK ((("completion_percentage" >= 0) AND ("completion_percentage" <= 100))),
    CONSTRAINT "tasks_payment_type_check" CHECK ((("payment_type")::"text" = ANY ((ARRAY['daily'::character varying, 'per_unit'::character varying, 'monthly'::character varying, 'metayage'::character varying])::"text"[]))),
    CONSTRAINT "tasks_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'urgent'::"text"]))),
    CONSTRAINT "tasks_quality_rating_check" CHECK ((("quality_rating" IS NULL) OR (("quality_rating" >= 1) AND ("quality_rating" <= 5)))),
    CONSTRAINT "tasks_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'assigned'::"text", 'in_progress'::"text", 'paused'::"text", 'completed'::"text", 'cancelled'::"text", 'overdue'::"text"]))),
    CONSTRAINT "tasks_task_type_check" CHECK (("task_type" = ANY (ARRAY['planting'::"text", 'harvesting'::"text", 'irrigation'::"text", 'fertilization'::"text", 'maintenance'::"text", 'general'::"text", 'pest_control'::"text", 'pruning'::"text", 'soil_preparation'::"text"])))
);


ALTER TABLE "public"."tasks" OWNER TO "postgres";


COMMENT ON TABLE "public"."tasks" IS 'Tasks table with RLS enabled - users can only access tasks from their organizations';



COMMENT ON COLUMN "public"."tasks"."farm_id" IS 'Reference to the farm where this task is performed (nullable)';



COMMENT ON COLUMN "public"."tasks"."parcel_id" IS 'Reference to the specific parcel within the farm (nullable)';



COMMENT ON COLUMN "public"."tasks"."category_id" IS 'Reference to the task category (nullable)';



COMMENT ON COLUMN "public"."tasks"."assigned_to" IS 'Reference to the worker assigned to this task';



COMMENT ON COLUMN "public"."tasks"."organization_id" IS 'Reference to the organization that owns this task (nullable)';



COMMENT ON COLUMN "public"."tasks"."work_unit_id" IS 'Work unit for piece-work payment (e.g., per tree, per box, per kg)';



COMMENT ON COLUMN "public"."tasks"."units_required" IS 'How many units must be completed (e.g., 100 trees to prune)';



COMMENT ON COLUMN "public"."tasks"."units_completed" IS 'Progress tracking in units';



COMMENT ON COLUMN "public"."tasks"."rate_per_unit" IS 'Payment rate per unit for piece-work';



COMMENT ON COLUMN "public"."tasks"."payment_type" IS 'How workers are paid for this task: daily wage, per unit, monthly salary, or metayage';



CREATE TABLE IF NOT EXISTS "public"."workers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "farm_id" "uuid",
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "cin" "text",
    "phone" "text",
    "email" "text",
    "address" "text",
    "date_of_birth" "date",
    "worker_type" "public"."worker_type" DEFAULT 'daily_worker'::"public"."worker_type" NOT NULL,
    "position" "text",
    "hire_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "end_date" "date",
    "is_active" boolean DEFAULT true,
    "is_cnss_declared" boolean DEFAULT false,
    "cnss_number" "text",
    "monthly_salary" numeric(10,2),
    "daily_rate" numeric(10,2),
    "metayage_type" "public"."metayage_type",
    "metayage_percentage" numeric(5,2),
    "calculation_basis" "public"."calculation_basis" DEFAULT 'net_revenue'::"public"."calculation_basis",
    "metayage_contract_details" "jsonb",
    "specialties" "text"[],
    "certifications" "text"[],
    "payment_frequency" "public"."payment_frequency",
    "bank_account" "text",
    "payment_method" "text",
    "total_days_worked" integer DEFAULT 0,
    "total_tasks_completed" integer DEFAULT 0,
    "notes" "text",
    "documents" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "user_id" "uuid",
    "default_work_unit_id" "uuid",
    "rate_per_unit" numeric(10,2),
    CONSTRAINT "valid_metayage_percentage" CHECK ((("metayage_percentage" IS NULL) OR (("metayage_percentage" > (0)::numeric) AND ("metayage_percentage" <= (50)::numeric)))),
    CONSTRAINT "valid_worker_config" CHECK (((("worker_type" = 'fixed_salary'::"public"."worker_type") AND ("monthly_salary" IS NOT NULL)) OR (("worker_type" = 'daily_worker'::"public"."worker_type") AND ("daily_rate" IS NOT NULL)) OR (("worker_type" = 'metayage'::"public"."worker_type") AND ("metayage_percentage" IS NOT NULL) AND ("metayage_type" IS NOT NULL))))
);


ALTER TABLE "public"."workers" OWNER TO "postgres";


COMMENT ON TABLE "public"."workers" IS 'Unified worker management supporting fixed employees, daily workers, and métayage (Khammass/Rebâa)';



COMMENT ON COLUMN "public"."workers"."user_id" IS 'Links worker to a platform user account. When set, the worker can log in and access limited features based on their role (farm_worker, day_laborer)';



CREATE OR REPLACE VIEW "public"."active_workers_summary" WITH ("security_invoker"='true') AS
 SELECT "w"."id",
    "w"."first_name",
    "w"."last_name",
    (("w"."first_name" || ' '::"text") || "w"."last_name") AS "full_name",
    "w"."email",
    "w"."phone",
    "w"."position",
    "w"."organization_id",
    "w"."is_active",
    "w"."worker_type",
    "count"("t"."id") AS "active_tasks"
   FROM ("public"."workers" "w"
     LEFT JOIN "public"."tasks" "t" ON ((("t"."assigned_to" = "w"."id") AND ("t"."status" = ANY (ARRAY['pending'::"text", 'in_progress'::"text"])))))
  WHERE ("w"."is_active" = true)
  GROUP BY "w"."id", "w"."first_name", "w"."last_name", "w"."email", "w"."phone", "w"."position", "w"."organization_id", "w"."is_active", "w"."worker_type";


ALTER VIEW "public"."active_workers_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."analyses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "parcel_id" "uuid" NOT NULL,
    "analysis_type" "public"."analysis_type" NOT NULL,
    "analysis_date" "date" NOT NULL,
    "laboratory" "text",
    "data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."analyses" OWNER TO "postgres";


COMMENT ON TABLE "public"."analyses" IS 'Unified table for soil, plant, and water analyses';



COMMENT ON COLUMN "public"."analyses"."analysis_type" IS 'Type of analysis: soil, plant, or water';



COMMENT ON COLUMN "public"."analyses"."data" IS 'JSONB field containing analysis-specific data based on analysis_type';



CREATE TABLE IF NOT EXISTS "public"."analysis_recommendations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "analysis_id" "uuid" NOT NULL,
    "recommendation_type" "text",
    "priority" "text",
    "title" "text" NOT NULL,
    "description" "text",
    "action_items" "jsonb" DEFAULT '[]'::"jsonb",
    "estimated_cost" numeric(10,2),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "analysis_recommendations_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'critical'::"text"]))),
    CONSTRAINT "analysis_recommendations_recommendation_type_check" CHECK (("recommendation_type" = ANY (ARRAY['fertilizer'::"text", 'amendment'::"text", 'irrigation'::"text", 'pest_management'::"text", 'general'::"text"])))
);


ALTER TABLE "public"."analysis_recommendations" OWNER TO "postgres";


COMMENT ON TABLE "public"."analysis_recommendations" IS 'Recommendations generated from analyses';



CREATE TABLE IF NOT EXISTS "public"."day_laborers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "farm_id" "uuid" NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "phone" "text",
    "daily_rate" numeric(8,2),
    "specialties" "text"[],
    "availability" "text",
    "rating" integer,
    "notes" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."day_laborers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."farms" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "location" "text",
    "address" "text",
    "city" "text",
    "state" "text",
    "country" "text",
    "postal_code" "text",
    "coordinates" "jsonb",
    "size" numeric(10,2),
    "size_unit" "text" DEFAULT 'hectares'::"text",
    "manager_name" "text",
    "manager_phone" "text",
    "manager_email" "text",
    "soil_type" "text",
    "climate_zone" "text",
    "irrigation_type" "text",
    "certification_status" "text",
    "status" "text" DEFAULT 'active'::"text",
    "established_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."farms" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid",
    "user_id" "uuid",
    "role" "text" DEFAULT 'member'::"text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "role_id" "uuid",
    "invited_by" "uuid"
);


ALTER TABLE "public"."organization_users" OWNER TO "postgres";


COMMENT ON TABLE "public"."organization_users" IS 'Maps users to organizations with roles and permissions';



COMMENT ON COLUMN "public"."organization_users"."role" IS 'User role in the organization: owner, admin, manager, member, viewer';



COMMENT ON COLUMN "public"."organization_users"."is_active" IS 'Whether the user membership is currently active';



CREATE OR REPLACE VIEW "public"."assignable_users" WITH ("security_invoker"='true') AS
 SELECT "up"."id",
    "up"."full_name",
    "up"."email",
    "up"."avatar_url",
    "ou"."organization_id",
    "ou"."role",
    'user_profile'::"text" AS "source_type"
   FROM ("public"."user_profiles" "up"
     JOIN "public"."organization_users" "ou" ON (("ou"."user_id" = "up"."id")))
  WHERE ("ou"."role" = ANY (ARRAY['organization_admin'::"text", 'farm_manager'::"text", 'farm_worker'::"text"]))
UNION ALL
 SELECT "w"."id",
    (("w"."first_name" || ' '::"text") || "w"."last_name") AS "full_name",
    "w"."email",
    NULL::"text" AS "avatar_url",
    "w"."organization_id",
    'farm_worker'::"text" AS "role",
    'worker'::"text" AS "source_type"
   FROM "public"."workers" "w"
  WHERE ("w"."is_active" = true)
UNION ALL
 SELECT "dl"."id",
    (("dl"."first_name" || ' '::"text") || "dl"."last_name") AS "full_name",
    "dl"."phone" AS "email",
    NULL::"text" AS "avatar_url",
    "f"."organization_id",
    'day_laborer'::"text" AS "role",
    'day_laborer'::"text" AS "source_type"
   FROM ("public"."day_laborers" "dl"
     JOIN "public"."farms" "f" ON (("f"."id" = "dl"."farm_id")))
  WHERE ("dl"."is_active" = true);


ALTER VIEW "public"."assignable_users" OWNER TO "postgres";


COMMENT ON VIEW "public"."assignable_users" IS 'Assignable users view with security_invoker - does not expose sensitive auth.users data';



CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "table_name" "text" NOT NULL,
    "record_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "user_id" "uuid",
    "old_values" "jsonb",
    "new_values" "jsonb",
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "audit_logs_action_check" CHECK (("action" = ANY (ARRAY['INSERT'::"text", 'UPDATE'::"text", 'DELETE'::"text"])))
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bank_accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "account_name" character varying(255) NOT NULL,
    "bank_name" character varying(255),
    "account_number" character varying(100),
    "iban" character varying(50),
    "swift_code" character varying(20),
    "currency_code" character varying(3) DEFAULT 'MAD'::character varying NOT NULL,
    "gl_account_id" "uuid" NOT NULL,
    "is_active" boolean DEFAULT true,
    "is_default" boolean DEFAULT false,
    "opening_balance" numeric(15,2) DEFAULT 0,
    "current_balance" numeric(15,2) DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid"
);


ALTER TABLE "public"."bank_accounts" OWNER TO "postgres";


COMMENT ON TABLE "public"."bank_accounts" IS 'Bank Accounts - Organization bank account details';



COMMENT ON COLUMN "public"."bank_accounts"."gl_account_id" IS 'Reference to the GL account representing this bank account';



CREATE TABLE IF NOT EXISTS "public"."cloud_coverage_checks" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "farm_id" "uuid",
    "parcel_id" "uuid" NOT NULL,
    "aoi_id" "uuid",
    "check_date" "date" NOT NULL,
    "date_range_start" "date" NOT NULL,
    "date_range_end" "date" NOT NULL,
    "max_cloud_threshold" numeric(5,2) NOT NULL,
    "has_suitable_images" boolean NOT NULL,
    "available_images_count" integer DEFAULT 0,
    "suitable_images_count" integer DEFAULT 0,
    "min_cloud_coverage" numeric(5,2),
    "max_cloud_coverage" numeric(5,2),
    "avg_cloud_coverage" numeric(5,2),
    "recommended_date" "date",
    "all_cloud_percentages" numeric(5,2)[],
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."cloud_coverage_checks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cost_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "cost_categories_type_check" CHECK (("type" = ANY (ARRAY['labor'::"text", 'materials'::"text", 'utilities'::"text", 'equipment'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."cost_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cost_centers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "parent_id" "uuid",
    "code" character varying(50) NOT NULL,
    "name" character varying(255) NOT NULL,
    "farm_id" "uuid",
    "parcel_id" "uuid",
    "is_group" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    CONSTRAINT "cost_centers_check" CHECK (((("is_group" = true) AND ("parent_id" IS NULL)) OR ("is_group" = false)))
);


ALTER TABLE "public"."cost_centers" OWNER TO "postgres";


COMMENT ON TABLE "public"."cost_centers" IS 'Cost Centers - Analytical dimensions for tracking costs by farm/parcel';



CREATE TABLE IF NOT EXISTS "public"."costs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "farm_id" "uuid",
    "parcel_id" "uuid",
    "category_id" "uuid",
    "cost_type" "text" NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "currency" "text" DEFAULT 'EUR'::"text" NOT NULL,
    "date" "date" NOT NULL,
    "description" "text",
    "reference_id" "uuid",
    "reference_type" "text",
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "costs_cost_type_check" CHECK (("cost_type" = ANY (ARRAY['labor'::"text", 'materials'::"text", 'utilities'::"text", 'equipment'::"text", 'product_application'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."costs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."crop_categories" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "type_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."crop_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."crop_types" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."crop_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."crop_varieties" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "category_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "days_to_maturity" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."crop_varieties" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."crops" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "farm_id" "uuid" NOT NULL,
    "parcel_id" "uuid",
    "variety_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "planting_date" "date",
    "expected_harvest_date" "date",
    "actual_harvest_date" "date",
    "planted_area" numeric(10,2),
    "expected_yield" numeric(10,2),
    "actual_yield" numeric(10,2),
    "yield_unit" "text" DEFAULT 'kg'::"text",
    "status" "text" DEFAULT 'planned'::"text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."crops" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."currencies" (
    "code" character varying(3) NOT NULL,
    "name" character varying(100) NOT NULL,
    "symbol" character varying(10),
    "decimal_places" integer DEFAULT 2,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "currencies_decimal_places_check" CHECK (("decimal_places" >= 0))
);


ALTER TABLE "public"."currencies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "logo_url" "text",
    "website" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "email" "text",
    "phone" "text",
    "address" "text",
    "city" "text",
    "state" "text",
    "country" "text",
    "postal_code" "text",
    "contact_person" "text",
    "status" "text" DEFAULT 'active'::"text",
    "currency" "text" DEFAULT 'MAD'::"text",
    "currency_symbol" "text" DEFAULT 'د.م.'::"text",
    "timezone" "text" DEFAULT 'UTC'::"text",
    "language" "text" DEFAULT 'en'::"text",
    "owner_id" "uuid",
    "onboarding_completed" boolean DEFAULT false,
    CONSTRAINT "organizations_currency_check" CHECK (("currency" = ANY (ARRAY['EUR'::"text", 'USD'::"text", 'GBP'::"text", 'MAD'::"text", 'TND'::"text", 'DZD'::"text", 'XOF'::"text", 'XAF'::"text"])))
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


COMMENT ON COLUMN "public"."organizations"."email" IS 'Primary contact email for the organization';



COMMENT ON COLUMN "public"."organizations"."phone" IS 'Primary contact phone number';



COMMENT ON COLUMN "public"."organizations"."address" IS 'Street address';



COMMENT ON COLUMN "public"."organizations"."city" IS 'City';



COMMENT ON COLUMN "public"."organizations"."state" IS 'State/Province';



COMMENT ON COLUMN "public"."organizations"."country" IS 'Country';



COMMENT ON COLUMN "public"."organizations"."postal_code" IS 'Postal/ZIP code';



COMMENT ON COLUMN "public"."organizations"."contact_person" IS 'Primary contact person name';



COMMENT ON COLUMN "public"."organizations"."status" IS 'Organization status (active, inactive, suspended)';



COMMENT ON COLUMN "public"."organizations"."currency" IS 'Organization currency code (MAD, EUR, USD, GBP, TND, DZD, XOF, XAF). Defaults to MAD (Moroccan Dirham) for agricultural operations in Morocco and surrounding regions.';



COMMENT ON COLUMN "public"."organizations"."currency_symbol" IS 'Currency symbol for display purposes. Defaults to MAD symbol (د.م.).';



COMMENT ON COLUMN "public"."organizations"."timezone" IS 'IANA timezone identifier (e.g., Europe/Paris, Africa/Casablanca)';



COMMENT ON COLUMN "public"."organizations"."language" IS 'ISO 639-1 language code (e.g., en, fr, ar)';



CREATE OR REPLACE VIEW "public"."current_session_status" WITH ("security_invoker"='true') AS
 SELECT "up"."id",
    "up"."full_name",
    "up"."email",
    "ou"."organization_id",
    "ou"."role",
    "o"."name" AS "organization_name"
   FROM (("public"."user_profiles" "up"
     JOIN "public"."organization_users" "ou" ON (("ou"."user_id" = "up"."id")))
     JOIN "public"."organizations" "o" ON (("o"."id" = "ou"."organization_id")))
  WHERE ("up"."id" = "auth"."uid"());


ALTER VIEW "public"."current_session_status" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "customer_code" character varying(50),
    "contact_person" character varying(255),
    "email" character varying(255),
    "phone" character varying(50),
    "mobile" character varying(50),
    "address" "text",
    "city" character varying(100),
    "state_province" character varying(100),
    "postal_code" character varying(20),
    "country" character varying(100) DEFAULT 'Morocco'::character varying,
    "website" character varying(255),
    "tax_id" character varying(100),
    "payment_terms" character varying(100),
    "credit_limit" numeric(15,2),
    "currency_code" character varying(3) DEFAULT 'MAD'::character varying,
    "customer_type" character varying(50),
    "price_list" character varying(100),
    "assigned_to" "uuid",
    "notes" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid"
);


ALTER TABLE "public"."customers" OWNER TO "postgres";


COMMENT ON TABLE "public"."customers" IS 'Customer records for sales invoices and revenue tracking';



COMMENT ON COLUMN "public"."customers"."customer_code" IS 'Optional customer reference code for internal use';



COMMENT ON COLUMN "public"."customers"."payment_terms" IS 'Default payment terms for this customer (e.g., Net 30)';



COMMENT ON COLUMN "public"."customers"."credit_limit" IS 'Maximum outstanding credit allowed for this customer';



COMMENT ON COLUMN "public"."customers"."customer_type" IS 'Classification: Retail, Wholesale, Distributor, etc.';



COMMENT ON COLUMN "public"."customers"."assigned_to" IS 'Sales person or account manager assigned to this customer';



CREATE TABLE IF NOT EXISTS "public"."dashboard_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "show_soil_data" boolean DEFAULT true,
    "show_climate_data" boolean DEFAULT true,
    "show_irrigation_data" boolean DEFAULT true,
    "show_maintenance_data" boolean DEFAULT true,
    "show_production_data" boolean DEFAULT true,
    "show_financial_data" boolean DEFAULT true,
    "show_stock_alerts" boolean DEFAULT true,
    "show_task_alerts" boolean DEFAULT true,
    "layout" "jsonb" DEFAULT '{"topRow": ["soil", "climate", "irrigation", "maintenance"], "bottomRow": ["alerts", "tasks"], "middleRow": ["production", "financial"]}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."dashboard_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."deliveries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "farm_id" "uuid" NOT NULL,
    "delivery_date" "date" NOT NULL,
    "delivery_type" "text" NOT NULL,
    "customer_name" "text" NOT NULL,
    "customer_contact" "text",
    "customer_email" "text",
    "delivery_address" "text",
    "destination_lat" numeric(10,8),
    "destination_lng" numeric(11,8),
    "total_quantity" numeric(12,2) DEFAULT 0 NOT NULL,
    "total_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "currency" "text" DEFAULT 'MAD'::"text",
    "driver_id" "uuid",
    "vehicle_info" "text",
    "departure_time" timestamp with time zone,
    "arrival_time" timestamp with time zone,
    "distance_km" numeric(6,2),
    "status" "text" DEFAULT 'pending'::"text",
    "payment_status" "text" DEFAULT 'pending'::"text",
    "payment_method" "text",
    "payment_terms" "text",
    "payment_received" numeric(12,2) DEFAULT 0,
    "payment_date" "date",
    "delivery_note_number" "text",
    "invoice_number" "text",
    "signature_image" "text",
    "signature_name" "text",
    "signature_date" timestamp with time zone,
    "photos" "jsonb" DEFAULT '[]'::"jsonb",
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "deliveries_delivery_type_check" CHECK (("delivery_type" = ANY (ARRAY['market_sale'::"text", 'export'::"text", 'processor'::"text", 'direct_client'::"text", 'wholesale'::"text"]))),
    CONSTRAINT "deliveries_payment_method_check" CHECK (("payment_method" = ANY (ARRAY['cash'::"text", 'bank_transfer'::"text", 'check'::"text", 'credit'::"text", 'mobile_money'::"text"]))),
    CONSTRAINT "deliveries_payment_status_check" CHECK (("payment_status" = ANY (ARRAY['pending'::"text", 'partial'::"text", 'paid'::"text"]))),
    CONSTRAINT "deliveries_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'prepared'::"text", 'in_transit'::"text", 'delivered'::"text", 'cancelled'::"text", 'returned'::"text"])))
);


ALTER TABLE "public"."deliveries" OWNER TO "postgres";


COMMENT ON TABLE "public"."deliveries" IS 'Delivery management with customer, logistics, and payment tracking';



CREATE TABLE IF NOT EXISTS "public"."delivery_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "delivery_id" "uuid" NOT NULL,
    "harvest_record_id" "uuid" NOT NULL,
    "quantity" numeric(10,2) NOT NULL,
    "unit" "text" NOT NULL,
    "price_per_unit" numeric(10,2) NOT NULL,
    "total_amount" numeric(12,2) GENERATED ALWAYS AS (("quantity" * "price_per_unit")) STORED,
    "quality_grade" "text",
    "quality_notes" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."delivery_items" OWNER TO "postgres";


COMMENT ON TABLE "public"."delivery_items" IS 'Individual items/products in a delivery linked to harvest records';



CREATE TABLE IF NOT EXISTS "public"."delivery_tracking" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "delivery_id" "uuid" NOT NULL,
    "status" "text" NOT NULL,
    "location_lat" numeric(10,8),
    "location_lng" numeric(11,8),
    "location_name" "text",
    "notes" "text",
    "photo_url" "text",
    "recorded_by" "uuid",
    "recorded_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."delivery_tracking" OWNER TO "postgres";


COMMENT ON TABLE "public"."delivery_tracking" IS 'Real-time tracking updates for deliveries';



CREATE OR REPLACE VIEW "public"."delivery_summary" AS
 SELECT "d"."id",
    "d"."organization_id",
    "d"."farm_id",
    "d"."delivery_date",
    "d"."delivery_type",
    "d"."customer_name",
    "d"."customer_contact",
    "d"."customer_email",
    "d"."delivery_address",
    "d"."destination_lat",
    "d"."destination_lng",
    "d"."total_quantity",
    "d"."total_amount",
    "d"."currency",
    "d"."driver_id",
    "d"."vehicle_info",
    "d"."departure_time",
    "d"."arrival_time",
    "d"."distance_km",
    "d"."status",
    "d"."payment_status",
    "d"."payment_method",
    "d"."payment_terms",
    "d"."payment_received",
    "d"."payment_date",
    "d"."delivery_note_number",
    "d"."invoice_number",
    "d"."signature_image",
    "d"."signature_name",
    "d"."signature_date",
    "d"."photos",
    "d"."notes",
    "d"."created_by",
    "d"."created_at",
    "d"."updated_at",
    "f"."name" AS "farm_name",
    "o"."name" AS "organization_name",
    (("driver"."first_name" || ' '::"text") || "driver"."last_name") AS "driver_name",
    ( SELECT "count"(*) AS "count"
           FROM "public"."delivery_items"
          WHERE ("delivery_items"."delivery_id" = "d"."id")) AS "item_count",
    ( SELECT "count"(*) AS "count"
           FROM "public"."delivery_tracking"
          WHERE ("delivery_tracking"."delivery_id" = "d"."id")) AS "tracking_update_count"
   FROM ((("public"."deliveries" "d"
     LEFT JOIN "public"."farms" "f" ON (("f"."id" = "d"."farm_id")))
     LEFT JOIN "public"."organizations" "o" ON (("o"."id" = "d"."organization_id")))
     LEFT JOIN "public"."workers" "driver" ON (("driver"."id" = "d"."driver_id")));


ALTER VIEW "public"."delivery_summary" OWNER TO "postgres";


COMMENT ON VIEW "public"."delivery_summary" IS 'Comprehensive delivery view with related information';



CREATE TABLE IF NOT EXISTS "public"."document_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "document_type" "text" NOT NULL,
    "is_default" boolean DEFAULT false,
    "header_enabled" boolean DEFAULT true,
    "header_height" numeric(5,2) DEFAULT 80,
    "header_logo_url" "text",
    "header_logo_position" "text" DEFAULT 'left'::"text",
    "header_logo_width" numeric(5,2) DEFAULT 50,
    "header_logo_height" numeric(5,2) DEFAULT 30,
    "header_company_name" boolean DEFAULT true,
    "header_company_info" boolean DEFAULT true,
    "header_custom_text" "text",
    "header_background_color" "text" DEFAULT '#ffffff'::"text",
    "header_text_color" "text" DEFAULT '#000000'::"text",
    "header_border_bottom" boolean DEFAULT true,
    "header_border_color" "text" DEFAULT '#e5e7eb'::"text",
    "footer_enabled" boolean DEFAULT true,
    "footer_height" numeric(5,2) DEFAULT 60,
    "footer_text" "text" DEFAULT 'Page {page} of {totalPages}'::"text",
    "footer_position" "text" DEFAULT 'center'::"text",
    "footer_include_company_info" boolean DEFAULT true,
    "footer_custom_text" "text",
    "footer_background_color" "text" DEFAULT '#f9fafb'::"text",
    "footer_text_color" "text" DEFAULT '#6b7280'::"text",
    "footer_border_top" boolean DEFAULT true,
    "footer_border_color" "text" DEFAULT '#e5e7eb'::"text",
    "footer_font_size" numeric(3,1) DEFAULT 9,
    "page_margin_top" numeric(5,2) DEFAULT 20,
    "page_margin_bottom" numeric(5,2) DEFAULT 20,
    "page_margin_left" numeric(5,2) DEFAULT 15,
    "page_margin_right" numeric(5,2) DEFAULT 15,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    CONSTRAINT "document_templates_document_type_check" CHECK (("document_type" = ANY (ARRAY['invoice'::"text", 'quote'::"text", 'sales_order'::"text", 'purchase_order'::"text", 'report'::"text", 'general'::"text"]))),
    CONSTRAINT "document_templates_footer_position_check" CHECK (("footer_position" = ANY (ARRAY['left'::"text", 'center'::"text", 'right'::"text"]))),
    CONSTRAINT "document_templates_header_logo_position_check" CHECK (("header_logo_position" = ANY (ARRAY['left'::"text", 'center'::"text", 'right'::"text"]))),
    CONSTRAINT "valid_footer_height" CHECK ((("footer_height" >= (0)::numeric) AND ("header_height" <= (200)::numeric))),
    CONSTRAINT "valid_header_height" CHECK ((("header_height" >= (0)::numeric) AND ("header_height" <= (200)::numeric))),
    CONSTRAINT "valid_margins" CHECK ((("page_margin_top" >= (0)::numeric) AND ("page_margin_top" <= (100)::numeric) AND ("page_margin_bottom" >= (0)::numeric) AND ("page_margin_bottom" <= (100)::numeric) AND ("page_margin_left" >= (0)::numeric) AND ("page_margin_left" <= (100)::numeric) AND ("page_margin_right" >= (0)::numeric) AND ("page_margin_right" <= (100)::numeric)))
);


ALTER TABLE "public"."document_templates" OWNER TO "postgres";


COMMENT ON TABLE "public"."document_templates" IS 'Stores customizable document header and footer templates for PDF generation';



CREATE TABLE IF NOT EXISTS "public"."employees" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "farm_id" "uuid" NOT NULL,
    "employee_id" "text",
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "email" "text",
    "phone" "text",
    "position" "text",
    "department" "text",
    "hire_date" "date",
    "salary" numeric(10,2),
    "status" "text" DEFAULT 'active'::"text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."employees" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."farm_management_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "farm_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role_id" "uuid",
    "role" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."farm_management_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."financial_transactions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "farm_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "category" "text" NOT NULL,
    "subcategory" "text",
    "amount" numeric(12,2) NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text",
    "description" "text",
    "transaction_date" "date" NOT NULL,
    "payment_method" "text",
    "reference_number" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."financial_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."harvest_forecasts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "farm_id" "uuid" NOT NULL,
    "parcel_id" "uuid" NOT NULL,
    "crop_type" "text" NOT NULL,
    "variety" "text",
    "planting_date" "date",
    "forecast_harvest_date_start" "date" NOT NULL,
    "forecast_harvest_date_end" "date" NOT NULL,
    "forecast_season" "text",
    "confidence_level" "text",
    "predicted_yield_quantity" numeric(12,2) NOT NULL,
    "predicted_yield_per_hectare" numeric(12,2),
    "unit_of_measure" "text" DEFAULT 'kg'::"text",
    "predicted_quality_grade" "text",
    "min_yield_quantity" numeric(12,2),
    "max_yield_quantity" numeric(12,2),
    "estimated_revenue" numeric(12,2),
    "estimated_cost" numeric(12,2),
    "estimated_profit" numeric(12,2),
    "estimated_price_per_unit" numeric(12,2),
    "currency_code" "text" DEFAULT 'MAD'::"text",
    "forecast_method" "text",
    "based_on_historical_years" integer,
    "adjustment_factors" "jsonb",
    "status" "text" DEFAULT 'pending'::"text",
    "actual_harvest_id" "uuid",
    "actual_yield_quantity" numeric(12,2),
    "forecast_accuracy_percent" numeric(5,2),
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid"
);


ALTER TABLE "public"."harvest_forecasts" OWNER TO "postgres";


COMMENT ON TABLE "public"."harvest_forecasts" IS 'Future harvest predictions with confidence ranges and financial estimates';



CREATE TABLE IF NOT EXISTS "public"."harvest_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "farm_id" "uuid" NOT NULL,
    "parcel_id" "uuid" NOT NULL,
    "crop_id" "uuid",
    "harvest_date" "date" NOT NULL,
    "quantity" numeric(10,2) NOT NULL,
    "unit" "text" NOT NULL,
    "quality_grade" "text",
    "quality_notes" "text",
    "quality_score" integer,
    "harvest_task_id" "uuid",
    "workers" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "supervisor_id" "uuid",
    "storage_location" "text",
    "temperature" numeric(4,1),
    "humidity" numeric(4,1),
    "intended_for" "text",
    "expected_price_per_unit" numeric(10,2),
    "estimated_revenue" numeric(12,2) GENERATED ALWAYS AS (("quantity" * "expected_price_per_unit")) STORED,
    "photos" "jsonb" DEFAULT '[]'::"jsonb",
    "documents" "jsonb" DEFAULT '[]'::"jsonb",
    "status" "text" DEFAULT 'stored'::"text",
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "reception_batch_id" "uuid",
    CONSTRAINT "harvest_records_intended_for_check" CHECK (("intended_for" = ANY (ARRAY['market'::"text", 'storage'::"text", 'processing'::"text", 'export'::"text", 'direct_client'::"text"]))),
    CONSTRAINT "harvest_records_quality_grade_check" CHECK (("quality_grade" = ANY (ARRAY['A'::"text", 'B'::"text", 'C'::"text", 'Extra'::"text", 'First'::"text", 'Second'::"text", 'Third'::"text"]))),
    CONSTRAINT "harvest_records_quality_score_check" CHECK ((("quality_score" >= 1) AND ("quality_score" <= 10))),
    CONSTRAINT "harvest_records_status_check" CHECK (("status" = ANY (ARRAY['stored'::"text", 'in_delivery'::"text", 'delivered'::"text", 'sold'::"text", 'spoiled'::"text"]))),
    CONSTRAINT "harvest_records_unit_check" CHECK (("unit" = ANY (ARRAY['kg'::"text", 'tons'::"text", 'units'::"text", 'boxes'::"text", 'crates'::"text", 'liters'::"text"])))
);


ALTER TABLE "public"."harvest_records" OWNER TO "postgres";


COMMENT ON TABLE "public"."harvest_records" IS 'Detailed harvest tracking with quality, workers, and storage conditions';



COMMENT ON COLUMN "public"."harvest_records"."reception_batch_id" IS 'Reference to reception batch created from this harvest';



CREATE TABLE IF NOT EXISTS "public"."harvests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "farm_id" "uuid" NOT NULL,
    "parcel_id" "uuid",
    "crop_id" "uuid",
    "harvest_date" "date" NOT NULL,
    "quantity" numeric(10,2) NOT NULL,
    "unit" "text" DEFAULT 'kg'::"text" NOT NULL,
    "quality_grade" "text",
    "price_per_unit" numeric(10,2),
    "total_value" numeric(10,2),
    "buyer_name" "text",
    "buyer_contact" "text",
    "delivery_address" "text",
    "delivery_date" "date",
    "delivery_status" "text" DEFAULT 'pending'::"text",
    "payment_status" "text" DEFAULT 'pending'::"text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    CONSTRAINT "harvests_delivery_status_check" CHECK (("delivery_status" = ANY (ARRAY['pending'::"text", 'in_transit'::"text", 'delivered'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "harvests_payment_status_check" CHECK (("payment_status" = ANY (ARRAY['pending'::"text", 'paid'::"text", 'partial'::"text", 'overdue'::"text"]))),
    CONSTRAINT "harvests_quality_grade_check" CHECK (("quality_grade" = ANY (ARRAY['premium'::"text", 'standard'::"text", 'commercial'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."harvests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."parcels" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "farm_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "area" numeric(10,2),
    "area_unit" "text" DEFAULT 'hectares'::"text",
    "boundary" "jsonb",
    "calculated_area" numeric(10,2),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "irrigation_type" "text",
    "planting_density" numeric,
    "perimeter" numeric,
    "soil_type" "text",
    "variety" "text",
    "planting_date" "date",
    "planting_type" "text",
    "tree_type" "text",
    "tree_count" integer,
    "planting_year" integer,
    "rootstock" "text",
    "crop_category" "text",
    "planting_system" "text",
    "spacing" "text",
    "density_per_hectare" numeric(10,2),
    "plant_count" integer,
    CONSTRAINT "parcels_crop_category_check" CHECK (("crop_category" = ANY (ARRAY['trees'::"text", 'cereals'::"text", 'vegetables'::"text", 'other'::"text"]))),
    CONSTRAINT "parcels_density_per_hectare_check" CHECK ((("density_per_hectare" IS NULL) OR ("density_per_hectare" > (0)::numeric))),
    CONSTRAINT "parcels_irrigation_type_check" CHECK (("irrigation_type" = ANY (ARRAY['drip'::"text", 'sprinkler'::"text", 'flood'::"text", 'none'::"text"]))),
    CONSTRAINT "parcels_plant_count_check" CHECK ((("plant_count" IS NULL) OR ("plant_count" > 0))),
    CONSTRAINT "parcels_planting_type_check" CHECK (("planting_type" = ANY (ARRAY['traditional'::"text", 'intensive'::"text", 'super_intensive'::"text", 'organic'::"text"]))),
    CONSTRAINT "parcels_planting_year_check" CHECK ((("planting_year" IS NULL) OR (("planting_year" >= 1900) AND (("planting_year")::numeric <= (EXTRACT(year FROM CURRENT_DATE) + (10)::numeric))))),
    CONSTRAINT "parcels_tree_count_check" CHECK ((("tree_count" IS NULL) OR ("tree_count" > 0)))
);


ALTER TABLE "public"."parcels" OWNER TO "postgres";


COMMENT ON TABLE "public"."parcels" IS 'Parcels table with RLS enabled - users can only access parcels from their organizations';



COMMENT ON COLUMN "public"."parcels"."variety" IS 'Specific variety/cultivar (e.g., Arbequine, Menara, Durum wheat)';



COMMENT ON COLUMN "public"."parcels"."planting_date" IS 'Actual planting or transplanting date';



COMMENT ON COLUMN "public"."parcels"."tree_type" IS 'Type of fruit tree (e.g., Olive, Apple, Orange, Citrus) - for fruit tree parcels';



COMMENT ON COLUMN "public"."parcels"."tree_count" IS 'Total number of trees planted in this parcel - for fruit tree parcels';



COMMENT ON COLUMN "public"."parcels"."planting_year" IS 'Year trees/plants were planted (for age tracking)';



COMMENT ON COLUMN "public"."parcels"."rootstock" IS 'Rootstock variety for grafted trees (e.g., GF677 for stone fruit)';



COMMENT ON COLUMN "public"."parcels"."crop_category" IS 'Main category: trees, cereals, vegetables, or other';



COMMENT ON COLUMN "public"."parcels"."planting_system" IS 'Planting system type (e.g., Super intensif, Intensif, Semi-intensif, Traditionnel)';



COMMENT ON COLUMN "public"."parcels"."spacing" IS 'Plant spacing in format "row_spacing x plant_spacing" (e.g., "4x1.5" meters)';



COMMENT ON COLUMN "public"."parcels"."density_per_hectare" IS 'Number of plants/trees per hectare based on planting system';



COMMENT ON COLUMN "public"."parcels"."plant_count" IS 'Total number of plants/trees in this parcel (calculated as area * density)';



CREATE OR REPLACE VIEW "public"."harvest_summary" WITH ("security_invoker"='true') AS
 SELECT "h"."id",
    "h"."parcel_id",
    "h"."harvest_date",
    "h"."quantity",
    "h"."unit",
    "h"."quality_grade",
    "h"."notes",
    "h"."organization_id",
    "p"."name" AS "parcel_name",
    "f"."name" AS "farm_name",
    (0)::numeric AS "total_costs"
   FROM (("public"."harvests" "h"
     LEFT JOIN "public"."parcels" "p" ON (("p"."id" = "h"."parcel_id")))
     LEFT JOIN "public"."farms" "f" ON (("f"."id" = "p"."farm_id")));


ALTER VIEW "public"."harvest_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "farm_id" "uuid" NOT NULL,
    "category_id" "uuid" NOT NULL,
    "subcategory_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "sku" "text",
    "unit" "text" DEFAULT 'units'::"text" NOT NULL,
    "quantity" numeric(10,2) DEFAULT '0'::numeric,
    "min_stock_level" numeric(10,2) DEFAULT '0'::numeric,
    "max_stock_level" numeric(10,2),
    "unit_cost" numeric(10,2),
    "supplier" "text",
    "expiry_date" "date",
    "location" "text",
    "notes" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "organization_id" "uuid",
    "item_name" "text",
    "item_type" "text",
    "category" "text",
    "brand" "text",
    "cost_per_unit" numeric(10,2),
    "batch_number" "text",
    "storage_location" "text",
    "minimum_quantity" numeric(10,2) DEFAULT '10'::numeric,
    "last_purchase_date" "date",
    "status" "text" DEFAULT 'available'::"text",
    "supplier_id" "uuid",
    "warehouse_id" "uuid",
    "packaging_type" "text",
    "packaging_size" numeric,
    CONSTRAINT "inventory_packaging_size_check" CHECK ((("packaging_size" IS NULL) OR ("packaging_size" > (0)::numeric)))
);


ALTER TABLE "public"."inventory" OWNER TO "postgres";


COMMENT ON COLUMN "public"."inventory"."packaging_type" IS 'Type of packaging: bidon, bouteille, sac, boite, carton, palette, vrac, unite';



COMMENT ON COLUMN "public"."inventory"."packaging_size" IS 'Size of individual packaging unit (e.g., 5 for 5L bidon, 25 for 25kg sac)';



CREATE TABLE IF NOT EXISTS "public"."inventory_batches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "batch_number" "text" NOT NULL,
    "item_id" "uuid" NOT NULL,
    "received_date" "date" NOT NULL,
    "manufacturing_date" "date",
    "expiry_date" "date",
    "supplier_id" "uuid",
    "purchase_order_id" "uuid",
    "initial_quantity" numeric(12,3) NOT NULL,
    "current_quantity" numeric(12,3) DEFAULT 0 NOT NULL,
    "cost_per_unit" numeric(12,2),
    "status" "text" DEFAULT 'Active'::"text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "inventory_batches_status_check" CHECK (("status" = ANY (ARRAY['Active'::"text", 'Expired'::"text", 'Recalled'::"text", 'Exhausted'::"text"]))),
    CONSTRAINT "valid_dates" CHECK ((("manufacturing_date" IS NULL) OR ("expiry_date" IS NULL) OR ("manufacturing_date" <= "expiry_date")))
);


ALTER TABLE "public"."inventory_batches" OWNER TO "postgres";


COMMENT ON TABLE "public"."inventory_batches" IS 'Batch tracking for inventory items with expiry dates';



CREATE TABLE IF NOT EXISTS "public"."inventory_serial_numbers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "serial_number" "text" NOT NULL,
    "item_id" "uuid" NOT NULL,
    "warehouse_id" "uuid",
    "status" "text" DEFAULT 'Available'::"text",
    "received_date" "date",
    "supplier_id" "uuid",
    "purchase_order_id" "uuid",
    "issued_date" "date",
    "issued_to" "text",
    "warranty_expiry_date" "date",
    "cost_per_unit" numeric(12,2),
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "inventory_serial_numbers_status_check" CHECK (("status" = ANY (ARRAY['Available'::"text", 'Issued'::"text", 'Defective'::"text", 'Returned'::"text", 'In Transit'::"text"])))
);


ALTER TABLE "public"."inventory_serial_numbers" OWNER TO "postgres";


COMMENT ON TABLE "public"."inventory_serial_numbers" IS 'Serial number tracking for individual items';



CREATE TABLE IF NOT EXISTS "public"."invoice_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invoice_id" "uuid" NOT NULL,
    "item_code" character varying(100),
    "item_name" character varying(255) NOT NULL,
    "description" "text",
    "quantity" numeric(12,3) NOT NULL,
    "unit_price" numeric(15,2) NOT NULL,
    "tax_id" "uuid",
    "tax_rate" numeric(5,2) DEFAULT 0,
    "tax_amount" numeric(15,2) DEFAULT 0,
    "amount" numeric(15,2) NOT NULL,
    "income_account_id" "uuid",
    "expense_account_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "rate" numeric(15,2),
    "item_id" "uuid",
    CONSTRAINT "invoice_items_amount_check" CHECK (("amount" >= (0)::numeric)),
    CONSTRAINT "invoice_items_quantity_check" CHECK (("quantity" > (0)::numeric)),
    CONSTRAINT "invoice_items_tax_amount_check" CHECK (("tax_amount" >= (0)::numeric)),
    CONSTRAINT "invoice_items_tax_rate_check" CHECK (("tax_rate" >= (0)::numeric)),
    CONSTRAINT "invoice_items_unit_price_check" CHECK (("unit_price" >= (0)::numeric))
);


ALTER TABLE "public"."invoice_items" OWNER TO "postgres";


COMMENT ON TABLE "public"."invoice_items" IS 'Invoice Items - Line items within invoices';



COMMENT ON COLUMN "public"."invoice_items"."rate" IS 'Unit price (same as amount/quantity)';



CREATE TABLE IF NOT EXISTS "public"."invoices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "invoice_number" character varying(100) NOT NULL,
    "invoice_type" "public"."invoice_type" NOT NULL,
    "party_type" character varying(50),
    "party_id" "uuid",
    "party_name" character varying(255) NOT NULL,
    "invoice_date" "date" NOT NULL,
    "due_date" "date" NOT NULL,
    "subtotal" numeric(15,2) DEFAULT 0 NOT NULL,
    "tax_total" numeric(15,2) DEFAULT 0 NOT NULL,
    "grand_total" numeric(15,2) DEFAULT 0 NOT NULL,
    "outstanding_amount" numeric(15,2) DEFAULT 0 NOT NULL,
    "currency_code" character varying(3) DEFAULT 'MAD'::character varying NOT NULL,
    "exchange_rate" numeric(12,6) DEFAULT 1.0,
    "status" "public"."invoice_status" DEFAULT 'draft'::"public"."invoice_status",
    "farm_id" "uuid",
    "parcel_id" "uuid",
    "attachment_url" "text",
    "remarks" "text",
    "created_by" "uuid",
    "submitted_by" "uuid",
    "submitted_at" timestamp with time zone,
    "journal_entry_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "sales_order_id" "uuid",
    "purchase_order_id" "uuid",
    CONSTRAINT "invoices_check" CHECK ((("outstanding_amount" >= (0)::numeric) AND ("outstanding_amount" <= "grand_total"))),
    CONSTRAINT "invoices_check1" CHECK (("due_date" >= "invoice_date")),
    CONSTRAINT "invoices_grand_total_check" CHECK (("grand_total" >= (0)::numeric)),
    CONSTRAINT "invoices_party_type_check" CHECK ((("party_type")::"text" = ANY ((ARRAY['Customer'::character varying, 'Supplier'::character varying])::"text"[])))
);


ALTER TABLE "public"."invoices" OWNER TO "postgres";


COMMENT ON TABLE "public"."invoices" IS 'Invoices - Sales and purchase invoices';



CREATE TABLE IF NOT EXISTS "public"."item_customer_details" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "item_id" "uuid" NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "ref_code" "text",
    "customer_item_name" "text",
    "max_discount_percent" numeric(5,2),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."item_customer_details" OWNER TO "postgres";


COMMENT ON TABLE "public"."item_customer_details" IS 'Customer-specific item codes and pricing rules';



CREATE TABLE IF NOT EXISTS "public"."item_groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "code" "text",
    "description" "text",
    "parent_group_id" "uuid",
    "path" "text",
    "default_sales_account_id" "uuid",
    "default_expense_account_id" "uuid",
    "default_cost_center_id" "uuid",
    "default_tax_id" "uuid",
    "default_warehouse_id" "uuid",
    "image_url" "text",
    "sort_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid"
);


ALTER TABLE "public"."item_groups" OWNER TO "postgres";


COMMENT ON TABLE "public"."item_groups" IS 'Hierarchical categorization of items (e.g., Agriculture > Crops > Fruits > Olives)';



COMMENT ON COLUMN "public"."item_groups"."path" IS 'Materialized path for hierarchical queries (e.g., Agriculture/Crops/Fruits/Olives)';



CREATE TABLE IF NOT EXISTS "public"."item_prices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "item_id" "uuid" NOT NULL,
    "price_list_name" "text" NOT NULL,
    "price_list_type" "text",
    "unit" "text" NOT NULL,
    "rate" numeric(12,2) NOT NULL,
    "valid_from" "date",
    "valid_upto" "date",
    "customer_id" "uuid",
    "supplier_id" "uuid",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "item_prices_price_list_type_check" CHECK (("price_list_type" = ANY (ARRAY['selling'::"text", 'buying'::"text"])))
);


ALTER TABLE "public"."item_prices" OWNER TO "postgres";


COMMENT ON TABLE "public"."item_prices" IS 'Price lists for items (standard, wholesale, retail, customer-specific)';



CREATE TABLE IF NOT EXISTS "public"."item_supplier_details" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "item_id" "uuid" NOT NULL,
    "supplier_id" "uuid" NOT NULL,
    "supplier_part_number" "text",
    "supplier_item_name" "text",
    "lead_time_days" integer,
    "last_purchase_rate" numeric(12,2),
    "minimum_order_quantity" numeric(10,2),
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."item_supplier_details" OWNER TO "postgres";


COMMENT ON TABLE "public"."item_supplier_details" IS 'Supplier-specific item codes and procurement details';



CREATE TABLE IF NOT EXISTS "public"."item_unit_conversions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "item_id" "uuid" NOT NULL,
    "from_unit" "text" NOT NULL,
    "to_unit" "text" NOT NULL,
    "conversion_factor" numeric(12,6) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."item_unit_conversions" OWNER TO "postgres";


COMMENT ON TABLE "public"."item_unit_conversions" IS 'Unit of measure conversions for items (e.g., 1 box = 10 kg)';



CREATE TABLE IF NOT EXISTS "public"."item_variants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "item_id" "uuid" NOT NULL,
    "variant_code" "text" NOT NULL,
    "variant_name" "text" NOT NULL,
    "attribute_1_name" "text",
    "attribute_1_value" "text",
    "attribute_2_name" "text",
    "attribute_2_value" "text",
    "attribute_3_name" "text",
    "attribute_3_value" "text",
    "standard_rate" numeric(12,2),
    "weight_per_unit" numeric(10,3),
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."item_variants" OWNER TO "postgres";


COMMENT ON TABLE "public"."item_variants" IS 'Variants of items (e.g., different package sizes, quality grades)';



CREATE TABLE IF NOT EXISTS "public"."items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "item_code" "text" NOT NULL,
    "item_name" "text" NOT NULL,
    "description" "text",
    "item_group_id" "uuid" NOT NULL,
    "brand" "text",
    "is_active" boolean DEFAULT true,
    "is_sales_item" boolean DEFAULT true,
    "is_purchase_item" boolean DEFAULT true,
    "is_stock_item" boolean DEFAULT true,
    "default_unit" "text" NOT NULL,
    "stock_uom" "text" NOT NULL,
    "maintain_stock" boolean DEFAULT true,
    "has_batch_no" boolean DEFAULT false,
    "has_serial_no" boolean DEFAULT false,
    "has_expiry_date" boolean DEFAULT false,
    "valuation_method" "text" DEFAULT 'FIFO'::"text",
    "default_sales_account_id" "uuid",
    "default_expense_account_id" "uuid",
    "default_cost_center_id" "uuid",
    "default_warehouse_id" "uuid",
    "standard_rate" numeric(12,2),
    "last_purchase_rate" numeric(12,2),
    "last_sales_rate" numeric(12,2),
    "weight_per_unit" numeric(10,3),
    "weight_uom" "text" DEFAULT 'kg'::"text",
    "length" numeric(10,2),
    "width" numeric(10,2),
    "height" numeric(10,2),
    "volume" numeric(10,2),
    "barcode" "text",
    "manufacturer_code" "text",
    "supplier_part_number" "text",
    "inspection_required_before_purchase" boolean DEFAULT false,
    "inspection_required_before_delivery" boolean DEFAULT false,
    "crop_type" "text",
    "variety" "text",
    "seasonality" "text",
    "shelf_life_days" integer,
    "show_in_website" boolean DEFAULT false,
    "website_image_url" "text",
    "website_description" "text",
    "image_url" "text",
    "images" "jsonb" DEFAULT '[]'::"jsonb",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_by" "uuid",
    CONSTRAINT "items_valuation_method_check" CHECK (("valuation_method" = ANY (ARRAY['FIFO'::"text", 'Moving Average'::"text", 'LIFO'::"text"])))
);


ALTER TABLE "public"."items" OWNER TO "postgres";


COMMENT ON TABLE "public"."items" IS 'Enhanced item master with comprehensive metadata for stock, sales, and purchasing';



COMMENT ON COLUMN "public"."items"."item_code" IS 'Unique item code/SKU for this item within the organization';



COMMENT ON COLUMN "public"."items"."valuation_method" IS 'Stock valuation method: FIFO, Moving Average, or LIFO';



CREATE TABLE IF NOT EXISTS "public"."journal_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "entry_date" "date" NOT NULL,
    "posting_date" "date" NOT NULL,
    "reference_number" character varying(100),
    "reference_type" character varying(50),
    "reference_id" "uuid",
    "status" "public"."journal_entry_status" DEFAULT 'draft'::"public"."journal_entry_status",
    "remarks" "text",
    "total_debit" numeric(15,2) DEFAULT 0 NOT NULL,
    "total_credit" numeric(15,2) DEFAULT 0 NOT NULL,
    "created_by" "uuid",
    "posted_by" "uuid",
    "posted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "entry_number" "text" NOT NULL,
    CONSTRAINT "journal_entries_check" CHECK ((("status" <> 'posted'::"public"."journal_entry_status") OR (("total_debit" = "total_credit") AND ("total_debit" > (0)::numeric)))),
    CONSTRAINT "journal_entries_check1" CHECK ((("status" <> 'posted'::"public"."journal_entry_status") OR ("posted_by" IS NOT NULL))),
    CONSTRAINT "journal_entries_status_check" CHECK (("status" = ANY (ARRAY['draft'::"public"."journal_entry_status", 'posted'::"public"."journal_entry_status", 'cancelled'::"public"."journal_entry_status"])))
);


ALTER TABLE "public"."journal_entries" OWNER TO "postgres";


COMMENT ON TABLE "public"."journal_entries" IS 'Journal Entries - Main ledger transactions';



CREATE TABLE IF NOT EXISTS "public"."journal_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "journal_entry_id" "uuid" NOT NULL,
    "account_id" "uuid" NOT NULL,
    "debit" numeric(15,2) DEFAULT 0,
    "credit" numeric(15,2) DEFAULT 0,
    "cost_center_id" "uuid",
    "farm_id" "uuid",
    "parcel_id" "uuid",
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "journal_items_check" CHECK (((("debit" > (0)::numeric) AND ("credit" = (0)::numeric)) OR (("credit" > (0)::numeric) AND ("debit" = (0)::numeric)))),
    CONSTRAINT "journal_items_credit_check" CHECK (("credit" >= (0)::numeric)),
    CONSTRAINT "journal_items_debit_check" CHECK (("debit" >= (0)::numeric))
);


ALTER TABLE "public"."journal_items" OWNER TO "postgres";


COMMENT ON TABLE "public"."journal_items" IS 'Journal Items - Individual debit/credit lines within journal entries';



CREATE OR REPLACE VIEW "public"."journal_entry_lines" AS
 SELECT "id",
    "journal_entry_id",
    "account_id",
    "debit",
    "credit",
    "description",
    "cost_center_id"
   FROM "public"."journal_items";


ALTER VIEW "public"."journal_entry_lines" OWNER TO "postgres";


COMMENT ON VIEW "public"."journal_entry_lines" IS 'Compatibility alias for journal_items - allows Edge Functions to use old naming';



CREATE TABLE IF NOT EXISTS "public"."lab_result_parameters" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "parameter_name" "text" NOT NULL,
    "parameter_code" "text",
    "value" numeric,
    "unit" "text",
    "interpretation" "text",
    "recommendation" "text",
    "reference_range_min" numeric,
    "reference_range_max" numeric,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."lab_result_parameters" OWNER TO "postgres";


COMMENT ON TABLE "public"."lab_result_parameters" IS 'Individual parameter results from lab analyses';



CREATE TABLE IF NOT EXISTS "public"."lab_service_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "farm_id" "uuid",
    "parcel_id" "uuid",
    "service_type_id" "uuid" NOT NULL,
    "provider_id" "uuid" NOT NULL,
    "order_number" "text",
    "order_date" timestamp with time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "sample_collected_by" "uuid",
    "sample_collection_date" timestamp with time zone,
    "sample_collection_notes" "text",
    "sample_location_coordinates" "jsonb",
    "sample_depth_cm" numeric(5,2),
    "sample_photos" "text"[],
    "lab_reference_number" "text",
    "sent_to_lab_date" timestamp with time zone,
    "expected_completion_date" timestamp with time zone,
    "actual_completion_date" timestamp with time zone,
    "results_received_date" timestamp with time zone,
    "results_document_url" "text",
    "results_data" "jsonb",
    "quoted_price" numeric(10,2),
    "actual_price" numeric(10,2),
    "currency" "text" DEFAULT 'MAD'::"text",
    "paid" boolean DEFAULT false,
    "payment_date" timestamp with time zone,
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "lab_service_orders_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'sample_collected'::"text", 'sent_to_lab'::"text", 'in_progress'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."lab_service_orders" OWNER TO "postgres";


COMMENT ON TABLE "public"."lab_service_orders" IS 'Orders for lab analysis services';



CREATE TABLE IF NOT EXISTS "public"."lab_service_providers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "contact_email" "text",
    "contact_phone" "text",
    "website" "text",
    "address" "text",
    "logo_url" "text",
    "is_active" boolean DEFAULT true,
    "accreditations" "jsonb" DEFAULT '[]'::"jsonb",
    "turnaround_days" integer DEFAULT 7,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."lab_service_providers" OWNER TO "postgres";


COMMENT ON TABLE "public"."lab_service_providers" IS 'Laboratory service providers offering soil/leaf/water analyses';



CREATE TABLE IF NOT EXISTS "public"."lab_service_recommendations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "parcel_id" "uuid",
    "recommendation_type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "priority" "text" DEFAULT 'medium'::"text",
    "suggested_products" "jsonb",
    "suggested_quantities" "jsonb",
    "application_method" "text",
    "timing" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "implemented_date" timestamp with time zone,
    "implemented_by" "uuid",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "lab_service_recommendations_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'urgent'::"text"]))),
    CONSTRAINT "lab_service_recommendations_recommendation_type_check" CHECK (("recommendation_type" = ANY (ARRAY['fertilization'::"text", 'irrigation'::"text", 'ph_correction'::"text", 'amendment'::"text", 'pest_control'::"text", 'general'::"text"]))),
    CONSTRAINT "lab_service_recommendations_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'in_progress'::"text", 'completed'::"text", 'dismissed'::"text"])))
);


ALTER TABLE "public"."lab_service_recommendations" OWNER TO "postgres";


COMMENT ON TABLE "public"."lab_service_recommendations" IS 'Recommendations generated from lab results';



CREATE TABLE IF NOT EXISTS "public"."lab_service_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider_id" "uuid",
    "name" "text" NOT NULL,
    "category" "text" NOT NULL,
    "description" "text",
    "sample_requirements" "text",
    "parameters_tested" "jsonb" DEFAULT '[]'::"jsonb",
    "price" numeric(10,2),
    "currency" "text" DEFAULT 'MAD'::"text",
    "turnaround_days" integer,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "lab_service_types_category_check" CHECK (("category" = ANY (ARRAY['soil'::"text", 'leaf'::"text", 'water'::"text", 'tissue'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."lab_service_types" OWNER TO "postgres";


COMMENT ON TABLE "public"."lab_service_types" IS 'Types of analyses offered by labs';



CREATE TABLE IF NOT EXISTS "public"."livestock" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "farm_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "breed" "text",
    "count" integer DEFAULT 1 NOT NULL,
    "age_months" integer,
    "health_status" "text" DEFAULT 'healthy'::"text",
    "notes" "text",
    "acquired_date" "date",
    "location" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."livestock" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."metayage_settlements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "worker_id" "uuid" NOT NULL,
    "farm_id" "uuid" NOT NULL,
    "parcel_id" "uuid",
    "period_start" "date" NOT NULL,
    "period_end" "date" NOT NULL,
    "harvest_date" "date",
    "gross_revenue" numeric(12,2) NOT NULL,
    "total_charges" numeric(12,2) DEFAULT 0,
    "net_revenue" numeric(12,2) GENERATED ALWAYS AS (("gross_revenue" - "total_charges")) STORED,
    "worker_percentage" numeric(5,2) NOT NULL,
    "worker_share_amount" numeric(12,2) NOT NULL,
    "calculation_basis" "public"."calculation_basis" NOT NULL,
    "charges_breakdown" "jsonb",
    "payment_status" "text" DEFAULT 'pending'::"text",
    "payment_date" "date",
    "payment_method" "text",
    "notes" "text",
    "documents" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid"
);


ALTER TABLE "public"."metayage_settlements" OWNER TO "postgres";


COMMENT ON TABLE "public"."metayage_settlements" IS 'Harvest revenue sharing settlements for métayage workers';



CREATE TABLE IF NOT EXISTS "public"."opening_stock_balances" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "item_id" "uuid" NOT NULL,
    "warehouse_id" "uuid" NOT NULL,
    "opening_date" "date" NOT NULL,
    "quantity" numeric(12,3) NOT NULL,
    "valuation_rate" numeric(12,2) NOT NULL,
    "total_value" numeric(12,2) GENERATED ALWAYS AS (("quantity" * "valuation_rate")) STORED,
    "batch_number" "text",
    "serial_numbers" "text"[],
    "journal_entry_id" "uuid",
    "status" "text" DEFAULT 'Draft'::"text",
    "posted_at" timestamp with time zone,
    "posted_by" "uuid",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "opening_stock_balances_quantity_check" CHECK (("quantity" >= (0)::numeric)),
    CONSTRAINT "opening_stock_balances_status_check" CHECK (("status" = ANY (ARRAY['Draft'::"text", 'Posted'::"text", 'Cancelled'::"text"]))),
    CONSTRAINT "opening_stock_balances_valuation_rate_check" CHECK (("valuation_rate" >= (0)::numeric))
);


ALTER TABLE "public"."opening_stock_balances" OWNER TO "postgres";


COMMENT ON TABLE "public"."opening_stock_balances" IS 'Opening stock balance records for initial inventory setup';



CREATE TABLE IF NOT EXISTS "public"."parcel_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "parcel_id" "uuid" NOT NULL,
    "template_id" "text" NOT NULL,
    "title" "text" NOT NULL,
    "generated_at" timestamp with time zone DEFAULT "now"(),
    "generated_by" "uuid",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "file_url" "text",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "parcel_reports_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."parcel_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_advances" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "worker_id" "uuid" NOT NULL,
    "farm_id" "uuid",
    "amount" numeric(10,2) NOT NULL,
    "requested_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "approved_by" "uuid",
    "approved_date" "date",
    "reason" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "deduction_plan" "jsonb",
    "remaining_balance" numeric(10,2),
    "paid_by" "uuid",
    "paid_date" "date",
    "payment_method" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "payment_advances_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'paid'::"text", 'rejected'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."payment_advances" OWNER TO "postgres";


COMMENT ON TABLE "public"."payment_advances" IS 'Worker advance payment requests and tracking';



CREATE TABLE IF NOT EXISTS "public"."payment_bonuses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "payment_record_id" "uuid" NOT NULL,
    "bonus_type" "text" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "payment_bonuses_bonus_type_check" CHECK (("bonus_type" = ANY (ARRAY['performance'::"text", 'attendance'::"text", 'quality'::"text", 'productivity'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."payment_bonuses" OWNER TO "postgres";


COMMENT ON TABLE "public"."payment_bonuses" IS 'Detailed breakdown of payment bonuses';



CREATE TABLE IF NOT EXISTS "public"."payment_deductions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "payment_record_id" "uuid" NOT NULL,
    "deduction_type" "text" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "description" "text",
    "reference" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "payment_deductions_deduction_type_check" CHECK (("deduction_type" = ANY (ARRAY['cnss'::"text", 'tax'::"text", 'advance_repayment'::"text", 'equipment_damage'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."payment_deductions" OWNER TO "postgres";


COMMENT ON TABLE "public"."payment_deductions" IS 'Detailed breakdown of payment deductions';



CREATE TABLE IF NOT EXISTS "public"."payment_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "farm_id" "uuid" NOT NULL,
    "worker_id" "uuid" NOT NULL,
    "payment_type" "text" NOT NULL,
    "period_start" "date" NOT NULL,
    "period_end" "date" NOT NULL,
    "base_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "bonuses" numeric(12,2) DEFAULT 0,
    "deductions" numeric(12,2) DEFAULT 0,
    "overtime_amount" numeric(12,2) DEFAULT 0,
    "advance_deduction" numeric(12,2) DEFAULT 0,
    "net_amount" numeric(12,2) GENERATED ALWAYS AS ((((("base_amount" + "bonuses") - "deductions") + "overtime_amount") - "advance_deduction")) STORED,
    "days_worked" integer DEFAULT 0,
    "hours_worked" numeric(6,2) DEFAULT 0,
    "tasks_completed" integer DEFAULT 0,
    "tasks_completed_ids" "uuid"[],
    "harvest_amount" numeric(10,2),
    "gross_revenue" numeric(12,2),
    "total_charges" numeric(12,2),
    "metayage_percentage" numeric(5,2),
    "status" "text" DEFAULT 'pending'::"text",
    "payment_method" "text",
    "payment_date" "date",
    "payment_reference" "text",
    "calculated_by" "uuid",
    "calculated_at" timestamp with time zone DEFAULT "now"(),
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "paid_by" "uuid",
    "paid_at" timestamp with time zone,
    "notes" "text",
    "attachments" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "units_completed" numeric(10,2),
    "unit_rate" numeric(10,2),
    "piece_work_ids" "uuid"[],
    CONSTRAINT "payment_records_payment_method_check" CHECK (("payment_method" = ANY (ARRAY['cash'::"text", 'bank_transfer'::"text", 'check'::"text", 'mobile_money'::"text"]))),
    CONSTRAINT "payment_records_payment_type_check" CHECK (("payment_type" = ANY (ARRAY['daily_wage'::"text", 'monthly_salary'::"text", 'metayage_share'::"text", 'bonus'::"text", 'overtime'::"text", 'advance'::"text"]))),
    CONSTRAINT "payment_records_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'paid'::"text", 'disputed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."payment_records" OWNER TO "postgres";


COMMENT ON TABLE "public"."payment_records" IS 'Unified payment tracking for all worker types with approval workflow';



CREATE OR REPLACE VIEW "public"."payment_summary" WITH ("security_invoker"='true') AS
 SELECT "p"."id",
    "p"."organization_id",
    "p"."payment_number",
    "p"."payment_type",
    "p"."payment_date",
    "p"."amount",
    "p"."payment_method",
    "p"."reference_number",
    "p"."party_type",
    "p"."party_id",
    "p"."party_name",
    "p"."remarks",
    "p"."bank_account_id",
    "p"."created_at",
    "p"."updated_at",
    "p"."created_by",
    "ba"."account_name" AS "bank_account_name",
    "ba"."gl_account_id" AS "bank_gl_account_id",
    COALESCE(( SELECT "sum"("pa"."allocated_amount") AS "sum"
           FROM "public"."payment_allocations" "pa"
          WHERE ("pa"."payment_id" = "p"."id")), (0)::numeric) AS "allocated_amount",
    ("p"."amount" - COALESCE(( SELECT "sum"("pa"."allocated_amount") AS "sum"
           FROM "public"."payment_allocations" "pa"
          WHERE ("pa"."payment_id" = "p"."id")), (0)::numeric)) AS "unallocated_amount"
   FROM ("public"."accounting_payments" "p"
     LEFT JOIN "public"."bank_accounts" "ba" ON (("ba"."id" = "p"."bank_account_id")));


ALTER VIEW "public"."payment_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "farm_id" "uuid",
    "worker_id" "uuid",
    "supplier_id" "uuid",
    "payment_type" "text" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "currency" "text" DEFAULT 'MAD'::"text",
    "payment_method" "text",
    "payment_date" "date" NOT NULL,
    "description" "text",
    "reference_number" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    CONSTRAINT "payments_payment_method_check" CHECK (("payment_method" = ANY (ARRAY['cash'::"text", 'bank_transfer'::"text", 'check'::"text", 'mobile_money'::"text", 'other'::"text"]))),
    CONSTRAINT "payments_payment_type_check" CHECK (("payment_type" = ANY (ARRAY['salary'::"text", 'daily_wage'::"text", 'metayage_share'::"text", 'supplier_invoice'::"text", 'equipment_rental'::"text", 'service_fee'::"text", 'bonus'::"text", 'advance'::"text", 'other'::"text"]))),
    CONSTRAINT "payments_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'paid'::"text", 'failed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."performance_alerts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "farm_id" "uuid",
    "parcel_id" "uuid",
    "alert_type" "text" NOT NULL,
    "severity" "text" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "yield_history_id" "uuid",
    "forecast_id" "uuid",
    "harvest_id" "uuid",
    "metric_name" "text",
    "actual_value" numeric(12,2),
    "target_value" numeric(12,2),
    "variance_percent" numeric(5,2),
    "status" "text" DEFAULT 'active'::"text",
    "acknowledged_at" timestamp with time zone,
    "acknowledged_by" "uuid",
    "resolved_at" timestamp with time zone,
    "resolution_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."performance_alerts" OWNER TO "postgres";


COMMENT ON TABLE "public"."performance_alerts" IS 'Automated alerts for underperforming parcels and yield issues';



CREATE TABLE IF NOT EXISTS "public"."permission_groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "description" "text",
    "permissions" "text"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."permission_groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "description" "text",
    "resource" "text" NOT NULL,
    "action" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "permissions_action_check" CHECK (("action" = ANY (ARRAY['create'::"text", 'read'::"text", 'update'::"text", 'delete'::"text", 'manage'::"text"])))
);


ALTER TABLE "public"."permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."piece_work_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "farm_id" "uuid" NOT NULL,
    "worker_id" "uuid" NOT NULL,
    "work_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "task_id" "uuid",
    "parcel_id" "uuid",
    "work_unit_id" "uuid" NOT NULL,
    "units_completed" numeric(10,2) NOT NULL,
    "rate_per_unit" numeric(10,2) NOT NULL,
    "total_amount" numeric(12,2) GENERATED ALWAYS AS (("units_completed" * "rate_per_unit")) STORED,
    "quality_rating" integer,
    "verified_by" "uuid",
    "verified_at" timestamp with time zone,
    "payment_record_id" "uuid",
    "payment_status" character varying(20) DEFAULT 'pending'::character varying,
    "start_time" timestamp with time zone,
    "end_time" timestamp with time zone,
    "break_duration" integer DEFAULT 0,
    "notes" "text",
    "attachments" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    CONSTRAINT "piece_work_records_payment_status_check" CHECK ((("payment_status")::"text" = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'paid'::character varying, 'disputed'::character varying, 'cancelled'::character varying])::"text"[]))),
    CONSTRAINT "piece_work_records_quality_rating_check" CHECK ((("quality_rating" >= 1) AND ("quality_rating" <= 5))),
    CONSTRAINT "piece_work_records_rate_per_unit_check" CHECK (("rate_per_unit" >= (0)::numeric)),
    CONSTRAINT "piece_work_records_units_completed_check" CHECK (("units_completed" > (0)::numeric))
);


ALTER TABLE "public"."piece_work_records" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."plantation_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "spacing" "text" NOT NULL,
    "trees_per_ha" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."plantation_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_categories" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."product_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_subcategories" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "category_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."product_subcategories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profitability_snapshots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "farm_id" "uuid",
    "parcel_id" "uuid",
    "period_start" "date" NOT NULL,
    "period_end" "date" NOT NULL,
    "total_costs" numeric(12,2) DEFAULT 0 NOT NULL,
    "total_revenue" numeric(12,2) DEFAULT 0 NOT NULL,
    "net_profit" numeric(12,2) DEFAULT 0 NOT NULL,
    "profit_margin" numeric(5,2),
    "currency" "text" DEFAULT 'EUR'::"text" NOT NULL,
    "cost_breakdown" "jsonb",
    "revenue_breakdown" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."profitability_snapshots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."purchase_order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "purchase_order_id" "uuid" NOT NULL,
    "line_number" integer NOT NULL,
    "item_name" character varying(255) NOT NULL,
    "description" "text",
    "quantity" numeric(10,3) NOT NULL,
    "unit_of_measure" character varying(50) DEFAULT 'unit'::character varying,
    "unit_price" numeric(12,2) NOT NULL,
    "amount" numeric(15,2) NOT NULL,
    "discount_percent" numeric(5,2) DEFAULT 0,
    "discount_amount" numeric(12,2) DEFAULT 0,
    "tax_id" "uuid",
    "tax_rate" numeric(5,2) DEFAULT 0,
    "tax_amount" numeric(12,2) DEFAULT 0,
    "line_total" numeric(15,2) NOT NULL,
    "received_quantity" numeric(10,3) DEFAULT 0,
    "billed_quantity" numeric(10,3) DEFAULT 0,
    "account_id" "uuid",
    "legacy_item_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "item_id" "uuid",
    CONSTRAINT "purchase_order_items_check" CHECK ((("received_quantity" >= (0)::numeric) AND ("received_quantity" <= "quantity"))),
    CONSTRAINT "purchase_order_items_check1" CHECK ((("billed_quantity" >= (0)::numeric) AND ("billed_quantity" <= "quantity"))),
    CONSTRAINT "purchase_order_items_quantity_check" CHECK (("quantity" > (0)::numeric)),
    CONSTRAINT "purchase_order_items_unit_price_check" CHECK (("unit_price" >= (0)::numeric))
);


ALTER TABLE "public"."purchase_order_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."purchase_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "po_number" character varying(100) NOT NULL,
    "po_date" "date" NOT NULL,
    "expected_delivery_date" "date",
    "supplier_id" "uuid",
    "supplier_name" character varying(255) NOT NULL,
    "delivery_address" "text",
    "delivery_city" character varying(100),
    "delivery_postal_code" character varying(20),
    "delivery_country" character varying(100),
    "contact_person" character varying(255),
    "contact_email" character varying(255),
    "contact_phone" character varying(50),
    "subtotal" numeric(15,2) DEFAULT 0 NOT NULL,
    "tax_total" numeric(15,2) DEFAULT 0 NOT NULL,
    "discount_amount" numeric(15,2) DEFAULT 0,
    "shipping_charges" numeric(12,2) DEFAULT 0,
    "grand_total" numeric(15,2) DEFAULT 0 NOT NULL,
    "received_amount" numeric(15,2) DEFAULT 0,
    "billed_amount" numeric(15,2) DEFAULT 0,
    "outstanding_amount" numeric(15,2) DEFAULT 0,
    "currency_code" character varying(3) DEFAULT 'MAD'::character varying,
    "exchange_rate" numeric(12,6) DEFAULT 1.0,
    "status" "public"."purchase_order_status" DEFAULT 'draft'::"public"."purchase_order_status",
    "payment_terms" "text",
    "delivery_terms" "text",
    "notes" "text",
    "supplier_quote_ref" character varying(100),
    "farm_id" "uuid",
    "parcel_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "submitted_at" timestamp with time zone,
    "submitted_by" "uuid",
    "confirmed_at" timestamp with time zone,
    "stock_entry_id" "uuid",
    "stock_received" boolean DEFAULT false,
    "stock_received_date" "date",
    CONSTRAINT "purchase_orders_grand_total_check" CHECK (("grand_total" >= (0)::numeric))
);


ALTER TABLE "public"."purchase_orders" OWNER TO "postgres";


COMMENT ON TABLE "public"."purchase_orders" IS 'Purchase orders sent to suppliers';



COMMENT ON COLUMN "public"."purchase_orders"."received_amount" IS 'Amount of goods received so far';



COMMENT ON COLUMN "public"."purchase_orders"."billed_amount" IS 'Amount billed by supplier so far';



COMMENT ON COLUMN "public"."purchase_orders"."stock_entry_id" IS 'Reference to Material Receipt stock entry';



COMMENT ON COLUMN "public"."purchase_orders"."stock_received" IS 'Whether stock has been received';



CREATE TABLE IF NOT EXISTS "public"."quote_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quote_id" "uuid" NOT NULL,
    "line_number" integer NOT NULL,
    "item_name" character varying(255) NOT NULL,
    "description" "text",
    "quantity" numeric(10,3) NOT NULL,
    "unit_of_measure" character varying(50) DEFAULT 'unit'::character varying,
    "unit_price" numeric(12,2) NOT NULL,
    "amount" numeric(15,2) NOT NULL,
    "discount_percent" numeric(5,2) DEFAULT 0,
    "discount_amount" numeric(12,2) DEFAULT 0,
    "tax_id" "uuid",
    "tax_rate" numeric(5,2) DEFAULT 0,
    "tax_amount" numeric(12,2) DEFAULT 0,
    "line_total" numeric(15,2) NOT NULL,
    "account_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "item_id" "uuid",
    CONSTRAINT "quote_items_quantity_check" CHECK (("quantity" > (0)::numeric)),
    CONSTRAINT "quote_items_unit_price_check" CHECK (("unit_price" >= (0)::numeric))
);


ALTER TABLE "public"."quote_items" OWNER TO "postgres";


COMMENT ON COLUMN "public"."quote_items"."item_id" IS 'Reference to items table. Links quote items to stock items for better integration.';



CREATE TABLE IF NOT EXISTS "public"."quotes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "quote_number" character varying(100) NOT NULL,
    "quote_date" "date" NOT NULL,
    "valid_until" "date" NOT NULL,
    "customer_id" "uuid",
    "customer_name" character varying(255) NOT NULL,
    "contact_person" character varying(255),
    "contact_email" character varying(255),
    "contact_phone" character varying(50),
    "subtotal" numeric(15,2) DEFAULT 0 NOT NULL,
    "tax_total" numeric(15,2) DEFAULT 0 NOT NULL,
    "discount_amount" numeric(15,2) DEFAULT 0,
    "grand_total" numeric(15,2) DEFAULT 0 NOT NULL,
    "currency_code" character varying(3) DEFAULT 'MAD'::character varying,
    "exchange_rate" numeric(12,6) DEFAULT 1.0,
    "status" "public"."quote_status" DEFAULT 'draft'::"public"."quote_status",
    "payment_terms" "text",
    "delivery_terms" "text",
    "terms_and_conditions" "text",
    "notes" "text",
    "reference_number" character varying(100),
    "sales_order_id" "uuid",
    "farm_id" "uuid",
    "parcel_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "sent_at" timestamp with time zone,
    "sent_by" "uuid",
    "accepted_at" timestamp with time zone,
    "converted_at" timestamp with time zone,
    "converted_by" "uuid",
    CONSTRAINT "quotes_check" CHECK (("valid_until" >= "quote_date")),
    CONSTRAINT "quotes_grand_total_check" CHECK (("grand_total" >= (0)::numeric))
);


ALTER TABLE "public"."quotes" OWNER TO "postgres";


COMMENT ON TABLE "public"."quotes" IS 'Sales quotations/proforma invoices sent to customers';



COMMENT ON COLUMN "public"."quotes"."valid_until" IS 'Quote validity expiration date';



CREATE TABLE IF NOT EXISTS "public"."reception_batches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "warehouse_id" "uuid" NOT NULL,
    "harvest_id" "uuid",
    "parcel_id" "uuid" NOT NULL,
    "crop_id" "uuid",
    "culture_type" "text",
    "batch_code" "text" NOT NULL,
    "reception_date" "date" NOT NULL,
    "reception_time" time without time zone DEFAULT CURRENT_TIME,
    "weight" numeric(10,2) NOT NULL,
    "weight_unit" "text" DEFAULT 'kg'::"text" NOT NULL,
    "quantity" numeric(10,2),
    "quantity_unit" "text",
    "quality_grade" "text",
    "quality_score" integer,
    "quality_notes" "text",
    "humidity_percentage" numeric(5,2),
    "maturity_level" "text",
    "temperature" numeric(4,1),
    "moisture_content" numeric(5,2),
    "received_by" "uuid",
    "quality_checked_by" "uuid",
    "decision" "text" DEFAULT 'pending'::"text" NOT NULL,
    "destination_warehouse_id" "uuid",
    "transformation_order_id" "uuid",
    "sales_order_id" "uuid",
    "stock_entry_id" "uuid",
    "status" "text" DEFAULT 'received'::"text" NOT NULL,
    "photos" "jsonb" DEFAULT '[]'::"jsonb",
    "documents" "jsonb" DEFAULT '[]'::"jsonb",
    "notes" "text",
    "lot_code" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_by" "uuid",
    CONSTRAINT "reception_batches_decision_check" CHECK (("decision" = ANY (ARRAY['pending'::"text", 'direct_sale'::"text", 'storage'::"text", 'transformation'::"text", 'rejected'::"text"]))),
    CONSTRAINT "reception_batches_quality_grade_check" CHECK (("quality_grade" = ANY (ARRAY['A'::"text", 'B'::"text", 'C'::"text", 'Extra'::"text", 'First'::"text", 'Second'::"text", 'Third'::"text"]))),
    CONSTRAINT "reception_batches_quality_score_check" CHECK ((("quality_score" >= 1) AND ("quality_score" <= 10))),
    CONSTRAINT "reception_batches_status_check" CHECK (("status" = ANY (ARRAY['received'::"text", 'quality_checked'::"text", 'decision_made'::"text", 'processed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."reception_batches" OWNER TO "postgres";


COMMENT ON TABLE "public"."reception_batches" IS 'Reception batches tracking harvest reception, quality control, and decision workflow';



COMMENT ON COLUMN "public"."reception_batches"."warehouse_id" IS 'Warehouse acting as reception center where batch was received';



COMMENT ON COLUMN "public"."reception_batches"."destination_warehouse_id" IS 'Destination warehouse if batch is moved after reception';



CREATE TABLE IF NOT EXISTS "public"."revenues" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "farm_id" "uuid",
    "parcel_id" "uuid",
    "revenue_type" "text" NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "currency" "text" DEFAULT 'EUR'::"text" NOT NULL,
    "date" "date" NOT NULL,
    "crop_type" "text",
    "quantity" numeric(10,2),
    "unit" "text",
    "price_per_unit" numeric(10,2),
    "description" "text",
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "revenues_revenue_type_check" CHECK (("revenue_type" = ANY (ARRAY['harvest'::"text", 'subsidy'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."revenues" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."role_assignments_audit" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "old_role_id" "uuid",
    "new_role_id" "uuid" NOT NULL,
    "assigned_by" "uuid",
    "reason" "text",
    "effective_date" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."role_assignments_audit" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."role_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "role_id" "uuid" NOT NULL,
    "permission_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."role_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."role_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "description" "text",
    "organization_id" "uuid",
    "is_system_template" boolean DEFAULT false,
    "permissions" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."role_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "description" "text",
    "level" integer NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "roles_name_check" CHECK (("name" = ANY (ARRAY['system_admin'::"text", 'organization_admin'::"text", 'farm_manager'::"text", 'farm_worker'::"text", 'day_laborer'::"text", 'viewer'::"text"])))
);


ALTER TABLE "public"."roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sales_order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sales_order_id" "uuid" NOT NULL,
    "line_number" integer NOT NULL,
    "item_name" character varying(255) NOT NULL,
    "description" "text",
    "quantity" numeric(10,3) NOT NULL,
    "unit_of_measure" character varying(50) DEFAULT 'unit'::character varying,
    "unit_price" numeric(12,2) NOT NULL,
    "amount" numeric(15,2) NOT NULL,
    "discount_percent" numeric(5,2) DEFAULT 0,
    "discount_amount" numeric(12,2) DEFAULT 0,
    "tax_id" "uuid",
    "tax_rate" numeric(5,2) DEFAULT 0,
    "tax_amount" numeric(12,2) DEFAULT 0,
    "line_total" numeric(15,2) NOT NULL,
    "delivered_quantity" numeric(10,3) DEFAULT 0,
    "invoiced_quantity" numeric(10,3) DEFAULT 0,
    "account_id" "uuid",
    "quote_item_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "item_id" "uuid",
    CONSTRAINT "sales_order_items_check" CHECK ((("delivered_quantity" >= (0)::numeric) AND ("delivered_quantity" <= "quantity"))),
    CONSTRAINT "sales_order_items_check1" CHECK ((("invoiced_quantity" >= (0)::numeric) AND ("invoiced_quantity" <= "quantity"))),
    CONSTRAINT "sales_order_items_quantity_check" CHECK (("quantity" > (0)::numeric)),
    CONSTRAINT "sales_order_items_unit_price_check" CHECK (("unit_price" >= (0)::numeric))
);


ALTER TABLE "public"."sales_order_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sales_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "order_number" character varying(100) NOT NULL,
    "order_date" "date" NOT NULL,
    "expected_delivery_date" "date",
    "customer_id" "uuid",
    "customer_name" character varying(255) NOT NULL,
    "shipping_address" "text",
    "shipping_city" character varying(100),
    "shipping_postal_code" character varying(20),
    "shipping_country" character varying(100),
    "contact_person" character varying(255),
    "contact_email" character varying(255),
    "contact_phone" character varying(50),
    "subtotal" numeric(15,2) DEFAULT 0 NOT NULL,
    "tax_total" numeric(15,2) DEFAULT 0 NOT NULL,
    "discount_amount" numeric(15,2) DEFAULT 0,
    "shipping_charges" numeric(12,2) DEFAULT 0,
    "grand_total" numeric(15,2) DEFAULT 0 NOT NULL,
    "delivered_amount" numeric(15,2) DEFAULT 0,
    "invoiced_amount" numeric(15,2) DEFAULT 0,
    "outstanding_amount" numeric(15,2) DEFAULT 0,
    "currency_code" character varying(3) DEFAULT 'MAD'::character varying,
    "exchange_rate" numeric(12,6) DEFAULT 1.0,
    "status" "public"."sales_order_status" DEFAULT 'draft'::"public"."sales_order_status",
    "payment_terms" "text",
    "delivery_terms" "text",
    "notes" "text",
    "quote_id" "uuid",
    "customer_po_number" character varying(100),
    "farm_id" "uuid",
    "parcel_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "confirmed_at" timestamp with time zone,
    "confirmed_by" "uuid",
    "stock_entry_id" "uuid",
    "stock_issued" boolean DEFAULT false,
    "stock_issued_date" "date",
    CONSTRAINT "sales_orders_grand_total_check" CHECK (("grand_total" >= (0)::numeric))
);


ALTER TABLE "public"."sales_orders" OWNER TO "postgres";


COMMENT ON TABLE "public"."sales_orders" IS 'Confirmed sales orders from customers';



COMMENT ON COLUMN "public"."sales_orders"."delivered_amount" IS 'Amount of goods delivered so far';



COMMENT ON COLUMN "public"."sales_orders"."invoiced_amount" IS 'Amount invoiced so far (can be partial)';



COMMENT ON COLUMN "public"."sales_orders"."stock_entry_id" IS 'Reference to Material Issue stock entry';



COMMENT ON COLUMN "public"."sales_orders"."stock_issued" IS 'Whether stock has been issued for delivery';



CREATE TABLE IF NOT EXISTS "public"."sample_collection_schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "farm_id" "uuid",
    "parcel_id" "uuid",
    "service_type_id" "uuid" NOT NULL,
    "frequency" "text" NOT NULL,
    "custom_interval_days" integer,
    "next_collection_date" "date" NOT NULL,
    "assigned_to" "uuid",
    "is_active" boolean DEFAULT true,
    "last_collection_date" "date",
    "notify_days_before" integer DEFAULT 3,
    "notification_emails" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "sample_collection_schedules_frequency_check" CHECK (("frequency" = ANY (ARRAY['monthly'::"text", 'quarterly'::"text", 'biannual'::"text", 'annual'::"text", 'custom'::"text"])))
);


ALTER TABLE "public"."sample_collection_schedules" OWNER TO "postgres";


COMMENT ON TABLE "public"."sample_collection_schedules" IS 'Recurring schedules for sample collection';



CREATE TABLE IF NOT EXISTS "public"."satellite_aois" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "farm_id" "uuid",
    "parcel_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "geometry_json" "jsonb",
    "area_hectares" numeric(10,4),
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."satellite_aois" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."satellite_files" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "parcel_id" "uuid",
    "index" character varying(50) NOT NULL,
    "date" "date" NOT NULL,
    "filename" character varying(255) NOT NULL,
    "file_path" "text" NOT NULL,
    "public_url" "text" NOT NULL,
    "file_size" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."satellite_files" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."satellite_indices_data" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "farm_id" "uuid",
    "parcel_id" "uuid" NOT NULL,
    "processing_job_id" "uuid",
    "date" "date" NOT NULL,
    "index_name" "text" NOT NULL,
    "mean_value" numeric(10,6),
    "min_value" numeric(10,6),
    "max_value" numeric(10,6),
    "std_value" numeric(10,6),
    "median_value" numeric(10,6),
    "percentile_25" numeric(10,6),
    "percentile_75" numeric(10,6),
    "percentile_90" numeric(10,6),
    "pixel_count" integer,
    "cloud_coverage_percentage" numeric(5,2),
    "image_source" "text" DEFAULT 'Sentinel-2'::"text",
    "geotiff_url" "text",
    "geotiff_expires_at" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "satellite_indices_data_index_name_check" CHECK (("index_name" = ANY (ARRAY['NDVI'::"text", 'NDRE'::"text", 'NDMI'::"text", 'MNDWI'::"text", 'GCI'::"text", 'SAVI'::"text", 'OSAVI'::"text", 'MSAVI2'::"text", 'PRI'::"text", 'MSI'::"text", 'MCARI'::"text", 'TCARI'::"text"])))
);


ALTER TABLE "public"."satellite_indices_data" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."satellite_processing_jobs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "farm_id" "uuid",
    "parcel_id" "uuid",
    "job_type" "text" DEFAULT 'batch_processing'::"text" NOT NULL,
    "indices" "text"[] NOT NULL,
    "date_range_start" "date" NOT NULL,
    "date_range_end" "date" NOT NULL,
    "cloud_coverage_threshold" numeric(5,2) DEFAULT 10.0,
    "scale" integer DEFAULT 10,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "progress_percentage" numeric(5,2) DEFAULT 0,
    "total_tasks" integer DEFAULT 0,
    "completed_tasks" integer DEFAULT 0,
    "failed_tasks" integer DEFAULT 0,
    "error_message" "text",
    "results_summary" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "satellite_processing_jobs_cloud_coverage_threshold_check" CHECK ((("cloud_coverage_threshold" >= (0)::numeric) AND ("cloud_coverage_threshold" <= (100)::numeric))),
    CONSTRAINT "satellite_processing_jobs_job_type_check" CHECK (("job_type" = ANY (ARRAY['batch_processing'::"text", 'single_parcel'::"text", 'cloud_check'::"text"]))),
    CONSTRAINT "satellite_processing_jobs_progress_percentage_check" CHECK ((("progress_percentage" >= (0)::numeric) AND ("progress_percentage" <= (100)::numeric))),
    CONSTRAINT "satellite_processing_jobs_scale_check" CHECK ((("scale" >= 10) AND ("scale" <= 1000))),
    CONSTRAINT "satellite_processing_jobs_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'running'::"text", 'completed'::"text", 'failed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."satellite_processing_jobs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."satellite_processing_tasks" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "processing_job_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "farm_id" "uuid",
    "parcel_id" "uuid" NOT NULL,
    "aoi_id" "uuid",
    "task_type" "text" DEFAULT 'calculate_indices'::"text" NOT NULL,
    "indices" "text"[] NOT NULL,
    "date_range_start" "date" NOT NULL,
    "date_range_end" "date" NOT NULL,
    "cloud_coverage_threshold" numeric(5,2) DEFAULT 10.0,
    "scale" integer DEFAULT 10,
    "priority" integer DEFAULT 5,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "attempts" integer DEFAULT 0,
    "max_attempts" integer DEFAULT 3,
    "error_message" "text",
    "result_data" "jsonb",
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "satellite_processing_tasks_priority_check" CHECK ((("priority" >= 1) AND ("priority" <= 10))),
    CONSTRAINT "satellite_processing_tasks_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'running'::"text", 'completed'::"text", 'failed'::"text", 'retrying'::"text"]))),
    CONSTRAINT "satellite_processing_tasks_task_type_check" CHECK (("task_type" = ANY (ARRAY['calculate_indices'::"text", 'export_geotiff'::"text", 'cloud_check'::"text"])))
);


ALTER TABLE "public"."satellite_processing_tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."soil_analyses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "parcel_id" "uuid",
    "test_type_id" "uuid",
    "analysis_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "physical" "jsonb",
    "chemical" "jsonb",
    "biological" "jsonb",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."soil_analyses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stock_account_mappings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "entry_type" "text" NOT NULL,
    "debit_account_id" "uuid" NOT NULL,
    "credit_account_id" "uuid" NOT NULL,
    "item_category" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "stock_account_mappings_entry_type_check" CHECK (("entry_type" = ANY (ARRAY['Material Receipt'::"text", 'Material Issue'::"text", 'Stock Transfer'::"text", 'Stock Reconciliation'::"text", 'Opening Stock'::"text"])))
);


ALTER TABLE "public"."stock_account_mappings" OWNER TO "postgres";


COMMENT ON TABLE "public"."stock_account_mappings" IS 'Account mappings for stock-to-accounting integration';



CREATE TABLE IF NOT EXISTS "public"."stock_closing_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "closing_date" "date" NOT NULL,
    "fiscal_year" integer NOT NULL,
    "fiscal_period" "text",
    "status" "text" DEFAULT 'Draft'::"text",
    "total_quantity" numeric(12,3),
    "total_valuation" numeric(12,2),
    "notes" "text",
    "posted_at" timestamp with time zone,
    "posted_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "stock_closing_entries_status_check" CHECK (("status" = ANY (ARRAY['Draft'::"text", 'Posted'::"text", 'Cancelled'::"text"])))
);


ALTER TABLE "public"."stock_closing_entries" OWNER TO "postgres";


COMMENT ON TABLE "public"."stock_closing_entries" IS 'Period-end stock closing entries for accounting';



CREATE TABLE IF NOT EXISTS "public"."stock_closing_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "closing_id" "uuid" NOT NULL,
    "item_id" "uuid" NOT NULL,
    "warehouse_id" "uuid" NOT NULL,
    "closing_quantity" numeric(12,3) NOT NULL,
    "closing_rate" numeric(12,2) NOT NULL,
    "closing_value" numeric(12,2) GENERATED ALWAYS AS (("closing_quantity" * "closing_rate")) STORED,
    "batch_number" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."stock_closing_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stock_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "entry_number" "text" NOT NULL,
    "entry_type" "text" NOT NULL,
    "entry_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "from_warehouse_id" "uuid",
    "to_warehouse_id" "uuid",
    "reference_type" "text",
    "reference_id" "uuid",
    "reference_number" "text",
    "status" "text" DEFAULT 'Draft'::"text" NOT NULL,
    "purpose" "text",
    "notes" "text",
    "posted_at" timestamp with time zone,
    "posted_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_by" "uuid",
    "journal_entry_id" "uuid",
    "reception_batch_id" "uuid",
    CONSTRAINT "stock_entries_entry_type_check" CHECK (("entry_type" = ANY (ARRAY['Material Receipt'::"text", 'Material Issue'::"text", 'Stock Transfer'::"text", 'Stock Reconciliation'::"text"]))),
    CONSTRAINT "stock_entries_status_check" CHECK (("status" = ANY (ARRAY['Draft'::"text", 'Submitted'::"text", 'Posted'::"text", 'Cancelled'::"text"]))),
    CONSTRAINT "valid_warehouse_combination" CHECK (((("entry_type" = 'Material Receipt'::"text") AND ("to_warehouse_id" IS NOT NULL) AND ("from_warehouse_id" IS NULL)) OR (("entry_type" = 'Material Issue'::"text") AND ("from_warehouse_id" IS NOT NULL) AND ("to_warehouse_id" IS NULL)) OR (("entry_type" = 'Stock Transfer'::"text") AND ("from_warehouse_id" IS NOT NULL) AND ("to_warehouse_id" IS NOT NULL) AND ("from_warehouse_id" <> "to_warehouse_id")) OR (("entry_type" = 'Stock Reconciliation'::"text") AND ("to_warehouse_id" IS NOT NULL))))
);


ALTER TABLE "public"."stock_entries" OWNER TO "postgres";


COMMENT ON TABLE "public"."stock_entries" IS 'Stock entry transactions for material receipts, issues, transfers, and reconciliations';



COMMENT ON COLUMN "public"."stock_entries"."entry_type" IS 'Type: Material Receipt, Material Issue, Stock Transfer, or Stock Reconciliation';



COMMENT ON COLUMN "public"."stock_entries"."status" IS 'Status: Draft, Submitted, Posted, or Cancelled';



COMMENT ON COLUMN "public"."stock_entries"."journal_entry_id" IS 'Reference to journal entry created for this stock entry';



COMMENT ON COLUMN "public"."stock_entries"."reception_batch_id" IS 'Reference to reception batch if entry created from reception';



CREATE TABLE IF NOT EXISTS "public"."stock_entry_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "stock_entry_id" "uuid" NOT NULL,
    "line_number" integer DEFAULT 1 NOT NULL,
    "item_id" "uuid",
    "item_name" "text" NOT NULL,
    "quantity" numeric(12,3) NOT NULL,
    "unit" "text" NOT NULL,
    "source_warehouse_id" "uuid",
    "target_warehouse_id" "uuid",
    "batch_number" "text",
    "serial_number" "text",
    "expiry_date" "date",
    "cost_per_unit" numeric(12,2),
    "total_cost" numeric(12,2) GENERATED ALWAYS AS (("quantity" * "cost_per_unit")) STORED,
    "system_quantity" numeric(12,3),
    "physical_quantity" numeric(12,3),
    "variance" numeric(12,3) GENERATED ALWAYS AS (("physical_quantity" - "system_quantity")) STORED,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "stock_entry_items_quantity_check" CHECK (("quantity" > (0)::numeric)),
    CONSTRAINT "valid_reconciliation_quantities" CHECK (((("system_quantity" IS NULL) AND ("physical_quantity" IS NULL)) OR (("system_quantity" IS NOT NULL) AND ("physical_quantity" IS NOT NULL))))
);


ALTER TABLE "public"."stock_entry_items" OWNER TO "postgres";


COMMENT ON TABLE "public"."stock_entry_items" IS 'Line items for stock entries';



COMMENT ON COLUMN "public"."stock_entry_items"."item_id" IS 'References items table. Must be migrated from inventory_items. Currently nullable during transition.';



CREATE TABLE IF NOT EXISTS "public"."stock_movements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "movement_type" "text" NOT NULL,
    "movement_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "item_id" "uuid" NOT NULL,
    "warehouse_id" "uuid" NOT NULL,
    "quantity" numeric(12,3) NOT NULL,
    "unit" "text" NOT NULL,
    "balance_quantity" numeric(12,3) NOT NULL,
    "cost_per_unit" numeric(12,2),
    "total_cost" numeric(12,2),
    "stock_entry_id" "uuid",
    "stock_entry_item_id" "uuid",
    "batch_number" "text",
    "serial_number" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    CONSTRAINT "stock_movements_movement_type_check" CHECK (("movement_type" = ANY (ARRAY['IN'::"text", 'OUT'::"text", 'TRANSFER'::"text"])))
);


ALTER TABLE "public"."stock_movements" OWNER TO "postgres";


COMMENT ON TABLE "public"."stock_movements" IS 'Complete audit trail of all stock movements';



CREATE TABLE IF NOT EXISTS "public"."stock_valuation" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "item_id" "uuid" NOT NULL,
    "warehouse_id" "uuid" NOT NULL,
    "quantity" numeric(12,3) NOT NULL,
    "cost_per_unit" numeric(12,2) NOT NULL,
    "total_cost" numeric(12,2) GENERATED ALWAYS AS (("quantity" * "cost_per_unit")) STORED,
    "valuation_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "stock_entry_id" "uuid",
    "batch_number" "text",
    "serial_number" "text",
    "remaining_quantity" numeric(12,3) DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "positive_quantity" CHECK (("quantity" > (0)::numeric)),
    CONSTRAINT "positive_remaining" CHECK (("remaining_quantity" >= (0)::numeric))
);


ALTER TABLE "public"."stock_valuation" OWNER TO "postgres";


COMMENT ON TABLE "public"."stock_valuation" IS 'Stock valuation entries for FIFO/LIFO/Average cost tracking';



CREATE TABLE IF NOT EXISTS "public"."structures" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "farm_id" "uuid",
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "location" "jsonb" DEFAULT '{"lat": 0, "lng": 0}'::"jsonb" NOT NULL,
    "installation_date" "date" NOT NULL,
    "condition" "text" DEFAULT 'good'::"text" NOT NULL,
    "usage" "text",
    "structure_details" "jsonb" DEFAULT '{}'::"jsonb",
    "notes" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "structures_condition_check" CHECK (("condition" = ANY (ARRAY['excellent'::"text", 'good'::"text", 'fair'::"text", 'poor'::"text", 'needs_repair'::"text"]))),
    CONSTRAINT "structures_type_check" CHECK (("type" = ANY (ARRAY['stable'::"text", 'technical_room'::"text", 'basin'::"text", 'well'::"text"])))
);


ALTER TABLE "public"."structures" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "polar_subscription_id" "text",
    "polar_customer_id" "text",
    "polar_product_id" "text",
    "plan_type" "text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "current_period_start" timestamp with time zone,
    "current_period_end" timestamp with time zone,
    "cancel_at_period_end" boolean DEFAULT false,
    "canceled_at" timestamp with time zone,
    "max_farms" integer DEFAULT 2 NOT NULL,
    "max_parcels" integer DEFAULT 25 NOT NULL,
    "max_users" integer DEFAULT 5 NOT NULL,
    "max_satellite_reports" integer DEFAULT 0,
    "has_analytics" boolean DEFAULT false,
    "has_sensor_integration" boolean DEFAULT false,
    "has_ai_recommendations" boolean DEFAULT false,
    "has_advanced_reporting" boolean DEFAULT false,
    "has_api_access" boolean DEFAULT false,
    "has_priority_support" boolean DEFAULT false,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "subscriptions_plan_type_check" CHECK (("plan_type" = ANY (ARRAY['essential'::"text", 'professional'::"text", 'enterprise'::"text"]))),
    CONSTRAINT "subscriptions_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'canceled'::"text", 'past_due'::"text", 'trialing'::"text", 'paused'::"text"])))
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."subscription_status" WITH ("security_invoker"='true') AS
 SELECT "s"."id",
    "s"."organization_id",
    "s"."plan_type" AS "subscription_tier",
    "s"."status",
    "s"."current_period_start",
    "s"."current_period_end",
    "s"."max_farms",
    "s"."max_parcels",
    "s"."max_users",
    "s"."max_satellite_reports",
    "s"."has_analytics",
    "s"."has_sensor_integration",
    "s"."has_api_access",
    "s"."has_advanced_reporting",
    "s"."has_ai_recommendations",
    "s"."has_priority_support",
    "o"."name" AS "organization_name",
    ( SELECT "count"(*) AS "count"
           FROM "public"."farms"
          WHERE ("farms"."organization_id" = "s"."organization_id")) AS "current_farms",
    ( SELECT "count"(*) AS "count"
           FROM ("public"."parcels" "p"
             JOIN "public"."farms" "f" ON (("f"."id" = "p"."farm_id")))
          WHERE ("f"."organization_id" = "s"."organization_id")) AS "current_parcels",
    ( SELECT "count"(*) AS "count"
           FROM "public"."organization_users"
          WHERE ("organization_users"."organization_id" = "s"."organization_id")) AS "current_users"
   FROM ("public"."subscriptions" "s"
     JOIN "public"."organizations" "o" ON (("o"."id" = "s"."organization_id")));


ALTER VIEW "public"."subscription_status" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscription_usage" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subscription_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "farms_count" integer DEFAULT 0,
    "parcels_count" integer DEFAULT 0,
    "users_count" integer DEFAULT 0,
    "satellite_reports_count" integer DEFAULT 0,
    "period_start" timestamp with time zone NOT NULL,
    "period_end" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."subscription_usage" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."suppliers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "contact_person" "text",
    "email" "text",
    "phone" "text",
    "address" "text",
    "city" "text",
    "postal_code" "text",
    "country" "text" DEFAULT 'Morocco'::"text",
    "website" "text",
    "tax_id" "text",
    "payment_terms" "text",
    "notes" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."suppliers" OWNER TO "postgres";


COMMENT ON TABLE "public"."suppliers" IS 'Suppliers for inventory management';



COMMENT ON COLUMN "public"."suppliers"."payment_terms" IS 'Payment terms like "Net 30", "COD", etc.';



CREATE TABLE IF NOT EXISTS "public"."task_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "icon" "text",
    "color" "text",
    "default_duration" integer,
    "default_skills" "text"[],
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."task_categories" OWNER TO "postgres";


COMMENT ON TABLE "public"."task_categories" IS 'Task categories/templates for standardization';



CREATE TABLE IF NOT EXISTS "public"."task_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "worker_id" "uuid",
    "comment" "text" NOT NULL,
    "type" "text" DEFAULT 'comment'::"text",
    "attachments" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "task_comments_type_check" CHECK (("type" = ANY (ARRAY['comment'::"text", 'status_update'::"text", 'completion_note'::"text", 'issue'::"text"])))
);


ALTER TABLE "public"."task_comments" OWNER TO "postgres";


COMMENT ON TABLE "public"."task_comments" IS 'Comments, updates, and notes on tasks';



CREATE TABLE IF NOT EXISTS "public"."task_costs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "cost_type" character varying(50) NOT NULL,
    "description" "text",
    "quantity" numeric(10,2),
    "unit_price" numeric(10,2),
    "total_amount" numeric(12,2) NOT NULL,
    "payment_status" character varying(20) DEFAULT 'pending'::character varying,
    "payment_date" "date",
    "payment_reference" character varying(100),
    "journal_entry_id" "uuid",
    "account_id" "uuid",
    "work_unit_id" "uuid",
    "units_completed" numeric(10,2),
    "rate_per_unit" numeric(10,2),
    "worker_id" "uuid",
    "piece_work_record_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    CONSTRAINT "task_costs_cost_type_check" CHECK ((("cost_type")::"text" = ANY ((ARRAY['labor'::character varying, 'material'::character varying, 'equipment'::character varying, 'utility'::character varying, 'other'::character varying])::"text"[]))),
    CONSTRAINT "task_costs_payment_status_check" CHECK ((("payment_status")::"text" = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'paid'::character varying, 'cancelled'::character varying])::"text"[])))
);


ALTER TABLE "public"."task_costs" OWNER TO "postgres";


COMMENT ON TABLE "public"."task_costs" IS 'Detailed cost tracking for tasks (labor, materials, equipment, utilities)';



CREATE TABLE IF NOT EXISTS "public"."task_dependencies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "depends_on_task_id" "uuid" NOT NULL,
    "dependency_type" "text" DEFAULT 'finish_to_start'::"text",
    "lag_days" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "no_self_dependency" CHECK (("task_id" <> "depends_on_task_id")),
    CONSTRAINT "task_dependencies_dependency_type_check" CHECK (("dependency_type" = ANY (ARRAY['finish_to_start'::"text", 'start_to_start'::"text", 'finish_to_finish'::"text"])))
);


ALTER TABLE "public"."task_dependencies" OWNER TO "postgres";


COMMENT ON TABLE "public"."task_dependencies" IS 'Task dependencies for scheduling and planning';



CREATE TABLE IF NOT EXISTS "public"."task_equipment" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "equipment_name" "text" NOT NULL,
    "quantity" integer DEFAULT 1,
    "start_time" timestamp with time zone,
    "end_time" timestamp with time zone,
    "condition_before" "text",
    "condition_after" "text",
    "fuel_used" numeric(8,2),
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "task_equipment_condition_after_check" CHECK (("condition_after" = ANY (ARRAY['excellent'::"text", 'good'::"text", 'fair'::"text", 'poor'::"text"]))),
    CONSTRAINT "task_equipment_condition_before_check" CHECK (("condition_before" = ANY (ARRAY['excellent'::"text", 'good'::"text", 'fair'::"text", 'poor'::"text"])))
);


ALTER TABLE "public"."task_equipment" OWNER TO "postgres";


COMMENT ON TABLE "public"."task_equipment" IS 'Equipment usage tracking for tasks';



CREATE OR REPLACE VIEW "public"."task_summary" WITH ("security_invoker"='true') AS
 SELECT "t"."id",
    "t"."title",
    "t"."description",
    "t"."status",
    "t"."priority",
    "t"."due_date",
    "t"."parcel_id",
    "t"."farm_id",
    "t"."assigned_to",
    "t"."completed_date",
    "t"."estimated_duration",
    "t"."actual_duration",
    "t"."category_id",
    "t"."crop_id",
    "t"."notes",
    "t"."created_at",
    "t"."updated_at",
    "p"."name" AS "parcel_name",
    "f"."name" AS "farm_name",
    "f"."organization_id"
   FROM (("public"."tasks" "t"
     LEFT JOIN "public"."parcels" "p" ON (("p"."id" = "t"."parcel_id")))
     LEFT JOIN "public"."farms" "f" ON (("f"."id" = "t"."farm_id")));


ALTER VIEW "public"."task_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_templates" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "category_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "estimated_duration" integer,
    "is_recurring" boolean DEFAULT false,
    "recurrence_pattern" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."task_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_time_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "worker_id" "uuid" NOT NULL,
    "start_time" timestamp with time zone NOT NULL,
    "end_time" timestamp with time zone,
    "break_duration" integer DEFAULT 0,
    "total_hours" numeric(4,2) GENERATED ALWAYS AS (
CASE
    WHEN ("end_time" IS NOT NULL) THEN GREATEST((0)::numeric, ((EXTRACT(epoch FROM ("end_time" - "start_time")) / (3600)::numeric) - (("break_duration")::numeric / 60.0)))
    ELSE (0)::numeric
END) STORED,
    "notes" "text",
    "location_lat" numeric(10,8),
    "location_lng" numeric(11,8),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."task_time_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."task_time_logs" IS 'Time tracking for tasks - clock in/out records';



CREATE TABLE IF NOT EXISTS "public"."taxes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "code" character varying(50) NOT NULL,
    "name" character varying(255) NOT NULL,
    "tax_type" "public"."tax_type" NOT NULL,
    "rate" numeric(5,2) NOT NULL,
    "sales_account_id" "uuid",
    "purchase_account_id" "uuid",
    "is_active" boolean DEFAULT true,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    CONSTRAINT "taxes_rate_check" CHECK ((("rate" >= (0)::numeric) AND ("rate" <= (100)::numeric)))
);


ALTER TABLE "public"."taxes" OWNER TO "postgres";


COMMENT ON TABLE "public"."taxes" IS 'Taxes - Tax rates and configurations';



CREATE TABLE IF NOT EXISTS "public"."temp_user_id" (
    "id" "uuid"
);


ALTER TABLE "public"."temp_user_id" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."test_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "parameters" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."test_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tree_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "category" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tree_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trees" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."trees" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "full_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."utilities" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "farm_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "provider" "text",
    "account_number" "text",
    "amount" numeric(10,2) NOT NULL,
    "billing_date" "date" NOT NULL,
    "due_date" "date",
    "payment_status" "text" DEFAULT 'pending'::"text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_recurring" boolean DEFAULT false,
    "recurring_frequency" "text",
    "consumption_value" numeric(10,2),
    "consumption_unit" "text",
    "invoice_url" "text",
    "parcel_id" "uuid",
    "cost_per_parcel" numeric(10,2),
    "journal_entry_id" "uuid",
    CONSTRAINT "utilities_recurring_frequency_check" CHECK (("recurring_frequency" = ANY (ARRAY['daily'::"text", 'weekly'::"text", 'monthly'::"text", 'yearly'::"text"])))
);


ALTER TABLE "public"."utilities" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_account_balances" WITH ("security_invoker"='true') AS
 SELECT "a"."id",
    "a"."code",
    "a"."name",
    "a"."account_type",
    "a"."account_subtype",
    "a"."organization_id",
    COALESCE("sum"("ji"."debit"), (0)::numeric) AS "total_debit",
    COALESCE("sum"("ji"."credit"), (0)::numeric) AS "total_credit",
    (COALESCE("sum"("ji"."debit"), (0)::numeric) - COALESCE("sum"("ji"."credit"), (0)::numeric)) AS "balance"
   FROM (("public"."accounts" "a"
     LEFT JOIN "public"."journal_items" "ji" ON (("ji"."account_id" = "a"."id")))
     LEFT JOIN "public"."journal_entries" "je" ON ((("je"."id" = "ji"."journal_entry_id") AND ("je"."status" = 'posted'::"public"."journal_entry_status"))))
  GROUP BY "a"."id", "a"."code", "a"."name", "a"."account_type", "a"."account_subtype", "a"."organization_id";


ALTER VIEW "public"."vw_account_balances" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_invoice_aging" WITH ("security_invoker"='true') AS
 SELECT "id",
    "invoice_number",
    "invoice_type",
    "invoice_date",
    "due_date",
    "party_name",
    "grand_total",
    "outstanding_amount",
    "organization_id",
    (CURRENT_DATE - "due_date") AS "days_overdue",
        CASE
            WHEN ("outstanding_amount" = (0)::numeric) THEN 'Paid'::"text"
            WHEN (CURRENT_DATE <= "due_date") THEN 'Current'::"text"
            WHEN ((CURRENT_DATE - "due_date") <= 30) THEN '1-30 days'::"text"
            WHEN ((CURRENT_DATE - "due_date") <= 60) THEN '31-60 days'::"text"
            WHEN ((CURRENT_DATE - "due_date") <= 90) THEN '61-90 days'::"text"
            ELSE '90+ days'::"text"
        END AS "aging_bucket"
   FROM "public"."invoices" "i"
  WHERE (("status" = 'submitted'::"public"."invoice_status") AND ("outstanding_amount" > (0)::numeric));


ALTER VIEW "public"."vw_invoice_aging" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_ledger" WITH ("security_invoker"='true') AS
 SELECT "ji"."id",
    "ji"."journal_entry_id",
    "ji"."account_id",
    "ji"."debit",
    "ji"."credit",
    "ji"."description",
    "ji"."cost_center_id",
    "a"."code" AS "account_code",
    "a"."name" AS "account_name",
    "a"."account_type",
    "je"."entry_date",
    "je"."entry_number",
    "je"."reference_type",
    "je"."reference_id",
    "je"."status" AS "entry_status",
    "je"."organization_id",
    "cc"."name" AS "cost_center_name",
    "cc"."farm_id",
    "cc"."parcel_id"
   FROM ((("public"."journal_items" "ji"
     JOIN "public"."accounts" "a" ON (("a"."id" = "ji"."account_id")))
     JOIN "public"."journal_entries" "je" ON (("je"."id" = "ji"."journal_entry_id")))
     LEFT JOIN "public"."cost_centers" "cc" ON (("cc"."id" = "ji"."cost_center_id")));


ALTER VIEW "public"."vw_ledger" OWNER TO "postgres";


COMMENT ON VIEW "public"."vw_ledger" IS 'Enhanced ledger view with IDs for filtering';



CREATE TABLE IF NOT EXISTS "public"."warehouses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "farm_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "location" "text",
    "address" "text",
    "city" "text",
    "postal_code" "text",
    "capacity" numeric(10,2),
    "capacity_unit" "text" DEFAULT 'm3'::"text",
    "temperature_controlled" boolean DEFAULT false,
    "humidity_controlled" boolean DEFAULT false,
    "security_level" "text" DEFAULT 'standard'::"text",
    "manager_name" "text",
    "manager_phone" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_reception_center" boolean DEFAULT false,
    "reception_type" "text",
    "has_weighing_station" boolean DEFAULT false,
    "has_quality_lab" boolean DEFAULT false,
    CONSTRAINT "warehouses_reception_type_check" CHECK (("reception_type" = ANY (ARRAY['general'::"text", 'olivier'::"text", 'viticole'::"text", 'laitier'::"text", 'fruiter'::"text", 'legumier'::"text"])))
);


ALTER TABLE "public"."warehouses" OWNER TO "postgres";


COMMENT ON TABLE "public"."warehouses" IS 'Warehouses and storage locations';



COMMENT ON COLUMN "public"."warehouses"."capacity" IS 'Storage capacity in the specified unit';



COMMENT ON COLUMN "public"."warehouses"."security_level" IS 'Security level: basic, standard, high, maximum';



COMMENT ON COLUMN "public"."warehouses"."is_reception_center" IS 'Whether this warehouse also functions as a reception center for harvests';



COMMENT ON COLUMN "public"."warehouses"."reception_type" IS 'Crop-specific reception type if this is a reception center';



COMMENT ON COLUMN "public"."warehouses"."has_weighing_station" IS 'Has equipment for weighing incoming harvests';



COMMENT ON COLUMN "public"."warehouses"."has_quality_lab" IS 'Has facilities for quality control testing';



CREATE TABLE IF NOT EXISTS "public"."work_records" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "farm_id" "uuid" NOT NULL,
    "worker_id" "uuid",
    "worker_type" "text" NOT NULL,
    "work_date" "date" NOT NULL,
    "hours_worked" numeric(4,2),
    "task_description" "text" NOT NULL,
    "hourly_rate" numeric(8,2),
    "total_payment" numeric(10,2),
    "payment_status" "text" DEFAULT 'pending'::"text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "amount_paid" numeric(10,2),
    "payment_date" "date"
);


ALTER TABLE "public"."work_records" OWNER TO "postgres";


COMMENT ON TABLE "public"."work_records" IS 'Daily work tracking for all worker types';



CREATE TABLE IF NOT EXISTS "public"."work_units" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "code" character varying(20) NOT NULL,
    "name" character varying(100) NOT NULL,
    "name_ar" character varying(100),
    "name_fr" character varying(100),
    "unit_category" character varying(50),
    "base_unit" character varying(20),
    "conversion_factor" numeric(10,4),
    "is_active" boolean DEFAULT true,
    "allow_decimal" boolean DEFAULT false,
    "usage_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    CONSTRAINT "work_units_unit_category_check" CHECK ((("unit_category")::"text" = ANY ((ARRAY['count'::character varying, 'weight'::character varying, 'volume'::character varying, 'area'::character varying, 'length'::character varying])::"text"[])))
);


ALTER TABLE "public"."work_units" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."worker_payment_history" WITH ("security_invoker"='true') AS
 SELECT "w"."id" AS "worker_id",
    "w"."first_name",
    "w"."last_name",
    (("w"."first_name" || ' '::"text") || "w"."last_name") AS "full_name",
    "w"."organization_id",
    "pr"."payment_date",
    "pr"."net_amount" AS "amount",
    "pr"."payment_method",
    "pr"."payment_reference" AS "reference_number"
   FROM ("public"."workers" "w"
     LEFT JOIN "public"."payment_records" "pr" ON (("pr"."worker_id" = "w"."id")))
  WHERE ("w"."is_active" = true);


ALTER VIEW "public"."worker_payment_history" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."worker_payment_summary" AS
 SELECT "w"."id" AS "worker_id",
    "w"."first_name",
    "w"."last_name",
    "w"."organization_id",
    "w"."worker_type",
    "w"."payment_frequency",
    "w"."daily_rate",
    "w"."rate_per_unit",
    "wu"."name" AS "default_unit_name",
    "count"(DISTINCT "pwr"."id") AS "total_piece_work_entries",
    "sum"("pwr"."units_completed") AS "total_units_completed",
    "sum"("pwr"."total_amount") AS "total_piece_work_earnings",
    "count"(DISTINCT "pr"."id") AS "total_payments",
    "sum"("pr"."net_amount") AS "total_paid_amount",
    "sum"(
        CASE
            WHEN ("pr"."status" = 'pending'::"text") THEN "pr"."net_amount"
            ELSE (0)::numeric
        END) AS "pending_amount"
   FROM ((("public"."workers" "w"
     LEFT JOIN "public"."work_units" "wu" ON (("wu"."id" = "w"."default_work_unit_id")))
     LEFT JOIN "public"."piece_work_records" "pwr" ON (("pwr"."worker_id" = "w"."id")))
     LEFT JOIN "public"."payment_records" "pr" ON (("pr"."worker_id" = "w"."id")))
  GROUP BY "w"."id", "w"."first_name", "w"."last_name", "w"."organization_id", "w"."worker_type", "w"."payment_frequency", "w"."daily_rate", "w"."rate_per_unit", "wu"."name";


ALTER VIEW "public"."worker_payment_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."yield_benchmarks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "farm_id" "uuid",
    "parcel_id" "uuid",
    "crop_type" "text" NOT NULL,
    "variety" "text",
    "benchmark_type" "text" NOT NULL,
    "target_yield_per_hectare" numeric(12,2) NOT NULL,
    "unit_of_measure" "text" DEFAULT 'kg'::"text",
    "excellent_threshold_percent" numeric(5,2) DEFAULT 110,
    "good_threshold_percent" numeric(5,2) DEFAULT 95,
    "acceptable_threshold_percent" numeric(5,2) DEFAULT 80,
    "target_revenue_per_hectare" numeric(12,2),
    "target_profit_margin_percent" numeric(5,2),
    "valid_from" "date",
    "valid_until" "date",
    "source" "text",
    "notes" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid"
);


ALTER TABLE "public"."yield_benchmarks" OWNER TO "postgres";


COMMENT ON TABLE "public"."yield_benchmarks" IS 'Target yields and performance thresholds for crops';



CREATE TABLE IF NOT EXISTS "public"."yield_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "farm_id" "uuid" NOT NULL,
    "parcel_id" "uuid" NOT NULL,
    "harvest_id" "uuid",
    "crop_type" "text" NOT NULL,
    "variety" "text",
    "harvest_date" "date" NOT NULL,
    "harvest_season" "text",
    "actual_yield_quantity" numeric(12,2) NOT NULL,
    "actual_yield_per_hectare" numeric(12,2),
    "unit_of_measure" "text" DEFAULT 'kg'::"text",
    "quality_grade" "text",
    "target_yield_quantity" numeric(12,2),
    "target_yield_per_hectare" numeric(12,2),
    "yield_variance_percent" numeric(5,2),
    "performance_rating" "text",
    "revenue_amount" numeric(12,2),
    "cost_amount" numeric(12,2),
    "profit_amount" numeric(12,2),
    "profit_margin_percent" numeric(5,2),
    "price_per_unit" numeric(12,2),
    "currency_code" "text" DEFAULT 'MAD'::"text",
    "growing_days" integer,
    "weather_conditions" "jsonb",
    "soil_conditions" "jsonb",
    "irrigation_total_m3" numeric(12,2),
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid"
);


ALTER TABLE "public"."yield_history" OWNER TO "postgres";


COMMENT ON TABLE "public"."yield_history" IS 'Historical yield records with actual vs target performance tracking';



ALTER TABLE ONLY "public"."accounting_payments"
    ADD CONSTRAINT "accounting_payments_organization_id_payment_number_key" UNIQUE ("organization_id", "payment_number");



ALTER TABLE ONLY "public"."accounting_payments"
    ADD CONSTRAINT "accounting_payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_organization_id_code_key" UNIQUE ("organization_id", "code");



ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analyses"
    ADD CONSTRAINT "analyses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analysis_recommendations"
    ADD CONSTRAINT "analysis_recommendations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bank_accounts"
    ADD CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cloud_coverage_checks"
    ADD CONSTRAINT "cloud_coverage_checks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cost_categories"
    ADD CONSTRAINT "cost_categories_organization_id_name_key" UNIQUE ("organization_id", "name");



ALTER TABLE ONLY "public"."cost_categories"
    ADD CONSTRAINT "cost_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cost_centers"
    ADD CONSTRAINT "cost_centers_organization_id_code_key" UNIQUE ("organization_id", "code");



ALTER TABLE ONLY "public"."cost_centers"
    ADD CONSTRAINT "cost_centers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."costs"
    ADD CONSTRAINT "costs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crop_categories"
    ADD CONSTRAINT "crop_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crop_categories"
    ADD CONSTRAINT "crop_categories_type_id_name_key" UNIQUE ("type_id", "name");



ALTER TABLE ONLY "public"."crop_types"
    ADD CONSTRAINT "crop_types_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."crop_types"
    ADD CONSTRAINT "crop_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crop_varieties"
    ADD CONSTRAINT "crop_varieties_category_id_name_key" UNIQUE ("category_id", "name");



ALTER TABLE ONLY "public"."crop_varieties"
    ADD CONSTRAINT "crop_varieties_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crops"
    ADD CONSTRAINT "crops_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."currencies"
    ADD CONSTRAINT "currencies_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dashboard_settings"
    ADD CONSTRAINT "dashboard_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dashboard_settings"
    ADD CONSTRAINT "dashboard_settings_user_id_organization_id_key" UNIQUE ("user_id", "organization_id");



ALTER TABLE ONLY "public"."day_laborers"
    ADD CONSTRAINT "day_laborers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."deliveries"
    ADD CONSTRAINT "deliveries_delivery_note_number_key" UNIQUE ("delivery_note_number");



ALTER TABLE ONLY "public"."deliveries"
    ADD CONSTRAINT "deliveries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."delivery_items"
    ADD CONSTRAINT "delivery_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."delivery_tracking"
    ADD CONSTRAINT "delivery_tracking_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."document_templates"
    ADD CONSTRAINT "document_templates_organization_id_name_key" UNIQUE ("organization_id", "name");



ALTER TABLE ONLY "public"."document_templates"
    ADD CONSTRAINT "document_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_employee_id_key" UNIQUE ("employee_id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."farm_management_roles"
    ADD CONSTRAINT "farm_management_roles_farm_id_user_id_key" UNIQUE ("farm_id", "user_id");



ALTER TABLE ONLY "public"."farm_management_roles"
    ADD CONSTRAINT "farm_management_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."farms"
    ADD CONSTRAINT "farms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."financial_transactions"
    ADD CONSTRAINT "financial_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."harvest_forecasts"
    ADD CONSTRAINT "harvest_forecasts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."harvest_records"
    ADD CONSTRAINT "harvest_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."harvests"
    ADD CONSTRAINT "harvests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_batches"
    ADD CONSTRAINT "inventory_batches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory"
    ADD CONSTRAINT "inventory_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_serial_numbers"
    ADD CONSTRAINT "inventory_serial_numbers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoice_items"
    ADD CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_organization_id_invoice_number_key" UNIQUE ("organization_id", "invoice_number");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."item_customer_details"
    ADD CONSTRAINT "item_customer_details_item_id_customer_id_key" UNIQUE ("item_id", "customer_id");



ALTER TABLE ONLY "public"."item_customer_details"
    ADD CONSTRAINT "item_customer_details_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."item_groups"
    ADD CONSTRAINT "item_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."item_prices"
    ADD CONSTRAINT "item_prices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."item_supplier_details"
    ADD CONSTRAINT "item_supplier_details_item_id_supplier_id_key" UNIQUE ("item_id", "supplier_id");



ALTER TABLE ONLY "public"."item_supplier_details"
    ADD CONSTRAINT "item_supplier_details_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."item_unit_conversions"
    ADD CONSTRAINT "item_unit_conversions_item_id_from_unit_to_unit_key" UNIQUE ("item_id", "from_unit", "to_unit");



ALTER TABLE ONLY "public"."item_unit_conversions"
    ADD CONSTRAINT "item_unit_conversions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."item_variants"
    ADD CONSTRAINT "item_variants_item_id_variant_code_key" UNIQUE ("item_id", "variant_code");



ALTER TABLE ONLY "public"."item_variants"
    ADD CONSTRAINT "item_variants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."items"
    ADD CONSTRAINT "items_organization_id_item_code_key" UNIQUE ("organization_id", "item_code");



ALTER TABLE ONLY "public"."items"
    ADD CONSTRAINT "items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."journal_entries"
    ADD CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."journal_items"
    ADD CONSTRAINT "journal_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lab_result_parameters"
    ADD CONSTRAINT "lab_result_parameters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lab_service_orders"
    ADD CONSTRAINT "lab_service_orders_order_number_key" UNIQUE ("order_number");



ALTER TABLE ONLY "public"."lab_service_orders"
    ADD CONSTRAINT "lab_service_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lab_service_providers"
    ADD CONSTRAINT "lab_service_providers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lab_service_recommendations"
    ADD CONSTRAINT "lab_service_recommendations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lab_service_types"
    ADD CONSTRAINT "lab_service_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."livestock"
    ADD CONSTRAINT "livestock_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."metayage_settlements"
    ADD CONSTRAINT "metayage_settlements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."opening_stock_balances"
    ADD CONSTRAINT "opening_stock_balances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_users"
    ADD CONSTRAINT "organization_users_organization_id_user_id_key" UNIQUE ("organization_id", "user_id");



ALTER TABLE ONLY "public"."organization_users"
    ADD CONSTRAINT "organization_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."parcel_reports"
    ADD CONSTRAINT "parcel_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."parcels"
    ADD CONSTRAINT "parcels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_advances"
    ADD CONSTRAINT "payment_advances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_allocations"
    ADD CONSTRAINT "payment_allocations_payment_id_invoice_id_key" UNIQUE ("payment_id", "invoice_id");



ALTER TABLE ONLY "public"."payment_allocations"
    ADD CONSTRAINT "payment_allocations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_bonuses"
    ADD CONSTRAINT "payment_bonuses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_deductions"
    ADD CONSTRAINT "payment_deductions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_records"
    ADD CONSTRAINT "payment_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."performance_alerts"
    ADD CONSTRAINT "performance_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."permission_groups"
    ADD CONSTRAINT "permission_groups_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."permission_groups"
    ADD CONSTRAINT "permission_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."piece_work_records"
    ADD CONSTRAINT "piece_work_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plantation_types"
    ADD CONSTRAINT "plantation_types_organization_id_type_spacing_key" UNIQUE ("organization_id", "type", "spacing");



ALTER TABLE ONLY "public"."plantation_types"
    ADD CONSTRAINT "plantation_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_categories"
    ADD CONSTRAINT "product_categories_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."product_categories"
    ADD CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_subcategories"
    ADD CONSTRAINT "product_subcategories_category_id_name_key" UNIQUE ("category_id", "name");



ALTER TABLE ONLY "public"."product_subcategories"
    ADD CONSTRAINT "product_subcategories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profitability_snapshots"
    ADD CONSTRAINT "profitability_snapshots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."purchase_order_items"
    ADD CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."purchase_order_items"
    ADD CONSTRAINT "purchase_order_items_purchase_order_id_line_number_key" UNIQUE ("purchase_order_id", "line_number");



ALTER TABLE ONLY "public"."purchase_orders"
    ADD CONSTRAINT "purchase_orders_organization_id_po_number_key" UNIQUE ("organization_id", "po_number");



ALTER TABLE ONLY "public"."purchase_orders"
    ADD CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quote_items"
    ADD CONSTRAINT "quote_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quote_items"
    ADD CONSTRAINT "quote_items_quote_id_line_number_key" UNIQUE ("quote_id", "line_number");



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_organization_id_quote_number_key" UNIQUE ("organization_id", "quote_number");



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reception_batches"
    ADD CONSTRAINT "reception_batches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."revenues"
    ADD CONSTRAINT "revenues_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."role_assignments_audit"
    ADD CONSTRAINT "role_assignments_audit_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_role_id_permission_id_key" UNIQUE ("role_id", "permission_id");



ALTER TABLE ONLY "public"."role_templates"
    ADD CONSTRAINT "role_templates_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."role_templates"
    ADD CONSTRAINT "role_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales_order_items"
    ADD CONSTRAINT "sales_order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales_order_items"
    ADD CONSTRAINT "sales_order_items_sales_order_id_line_number_key" UNIQUE ("sales_order_id", "line_number");



ALTER TABLE ONLY "public"."sales_orders"
    ADD CONSTRAINT "sales_orders_organization_id_order_number_key" UNIQUE ("organization_id", "order_number");



ALTER TABLE ONLY "public"."sales_orders"
    ADD CONSTRAINT "sales_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sample_collection_schedules"
    ADD CONSTRAINT "sample_collection_schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."satellite_aois"
    ADD CONSTRAINT "satellite_aois_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."satellite_files"
    ADD CONSTRAINT "satellite_files_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."satellite_indices_data"
    ADD CONSTRAINT "satellite_indices_data_parcel_id_date_index_name_key" UNIQUE ("parcel_id", "date", "index_name");



ALTER TABLE ONLY "public"."satellite_indices_data"
    ADD CONSTRAINT "satellite_indices_data_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."satellite_processing_jobs"
    ADD CONSTRAINT "satellite_processing_jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."satellite_processing_tasks"
    ADD CONSTRAINT "satellite_processing_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."soil_analyses"
    ADD CONSTRAINT "soil_analyses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock_account_mappings"
    ADD CONSTRAINT "stock_account_mappings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock_closing_entries"
    ADD CONSTRAINT "stock_closing_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock_closing_items"
    ADD CONSTRAINT "stock_closing_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock_entries"
    ADD CONSTRAINT "stock_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock_entry_items"
    ADD CONSTRAINT "stock_entry_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock_valuation"
    ADD CONSTRAINT "stock_valuation_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."structures"
    ADD CONSTRAINT "structures_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_usage"
    ADD CONSTRAINT "subscription_usage_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_organization_id_key" UNIQUE ("organization_id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_organization_id_unique" UNIQUE ("organization_id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_polar_subscription_id_key" UNIQUE ("polar_subscription_id");



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_categories"
    ADD CONSTRAINT "task_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_comments"
    ADD CONSTRAINT "task_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_costs"
    ADD CONSTRAINT "task_costs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_dependencies"
    ADD CONSTRAINT "task_dependencies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_equipment"
    ADD CONSTRAINT "task_equipment_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_templates"
    ADD CONSTRAINT "task_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_time_logs"
    ADD CONSTRAINT "task_time_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."taxes"
    ADD CONSTRAINT "taxes_organization_id_code_key" UNIQUE ("organization_id", "code");



ALTER TABLE ONLY "public"."taxes"
    ADD CONSTRAINT "taxes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."test_types"
    ADD CONSTRAINT "test_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tree_categories"
    ADD CONSTRAINT "tree_categories_organization_id_category_key" UNIQUE ("organization_id", "category");



ALTER TABLE ONLY "public"."tree_categories"
    ADD CONSTRAINT "tree_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trees"
    ADD CONSTRAINT "trees_category_id_name_key" UNIQUE ("category_id", "name");



ALTER TABLE ONLY "public"."trees"
    ADD CONSTRAINT "trees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."yield_benchmarks"
    ADD CONSTRAINT "unique_active_benchmark" UNIQUE ("organization_id", "crop_type", "variety", "farm_id", "parcel_id", "valid_from", "is_active");



ALTER TABLE ONLY "public"."inventory_batches"
    ADD CONSTRAINT "unique_batch_per_item" UNIQUE ("organization_id", "item_id", "batch_number");



ALTER TABLE ONLY "public"."task_categories"
    ADD CONSTRAINT "unique_category_name_per_org" UNIQUE ("organization_id", "name");



ALTER TABLE ONLY "public"."stock_closing_entries"
    ADD CONSTRAINT "unique_closing_per_period" UNIQUE ("organization_id", "closing_date", "fiscal_period");



ALTER TABLE ONLY "public"."task_dependencies"
    ADD CONSTRAINT "unique_dependency" UNIQUE ("task_id", "depends_on_task_id");



ALTER TABLE ONLY "public"."stock_entries"
    ADD CONSTRAINT "unique_entry_number_per_org" UNIQUE ("organization_id", "entry_number");



ALTER TABLE ONLY "public"."stock_entry_items"
    ADD CONSTRAINT "unique_line_per_entry" UNIQUE ("stock_entry_id", "line_number");



ALTER TABLE ONLY "public"."opening_stock_balances"
    ADD CONSTRAINT "unique_opening_stock" UNIQUE ("organization_id", "item_id", "warehouse_id", "opening_date", "batch_number");



ALTER TABLE ONLY "public"."reception_batches"
    ADD CONSTRAINT "unique_reception_batch_code" UNIQUE ("organization_id", "batch_code");



ALTER TABLE ONLY "public"."stock_valuation"
    ADD CONSTRAINT "unique_serial_number" UNIQUE ("serial_number", "item_id") DEFERRABLE INITIALLY DEFERRED;



ALTER TABLE ONLY "public"."inventory_serial_numbers"
    ADD CONSTRAINT "unique_serial_per_org" UNIQUE ("organization_id", "serial_number", "item_id");



ALTER TABLE ONLY "public"."stock_account_mappings"
    ADD CONSTRAINT "unique_stock_mapping" UNIQUE ("organization_id", "entry_type", "item_category");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."utilities"
    ADD CONSTRAINT "utilities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."warehouses"
    ADD CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."work_records"
    ADD CONSTRAINT "work_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."work_units"
    ADD CONSTRAINT "work_units_organization_id_code_key" UNIQUE ("organization_id", "code");



ALTER TABLE ONLY "public"."work_units"
    ADD CONSTRAINT "work_units_organization_id_name_key" UNIQUE ("organization_id", "name");



ALTER TABLE ONLY "public"."work_units"
    ADD CONSTRAINT "work_units_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workers"
    ADD CONSTRAINT "workers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."yield_benchmarks"
    ADD CONSTRAINT "yield_benchmarks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."yield_history"
    ADD CONSTRAINT "yield_history_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_accounting_payments_bank" ON "public"."accounting_payments" USING "btree" ("bank_account_id") WHERE ("bank_account_id" IS NOT NULL);



CREATE INDEX "idx_accounting_payments_date" ON "public"."accounting_payments" USING "btree" ("payment_date" DESC);



CREATE INDEX "idx_accounting_payments_org_type" ON "public"."accounting_payments" USING "btree" ("organization_id", "payment_type");



CREATE INDEX "idx_accounting_payments_party" ON "public"."accounting_payments" USING "btree" ("party_type", "party_id") WHERE ("party_id" IS NOT NULL);



CREATE INDEX "idx_accounting_payments_payment_type" ON "public"."accounting_payments" USING "btree" ("payment_type");



CREATE INDEX "idx_accounting_payments_status" ON "public"."accounting_payments" USING "btree" ("status");



CREATE INDEX "idx_accounts_active" ON "public"."accounts" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_accounts_org" ON "public"."accounts" USING "btree" ("organization_id");



CREATE INDEX "idx_accounts_parent" ON "public"."accounts" USING "btree" ("parent_id");



CREATE INDEX "idx_accounts_type" ON "public"."accounts" USING "btree" ("account_type");



CREATE INDEX "idx_analyses_data_gin" ON "public"."analyses" USING "gin" ("data");



CREATE INDEX "idx_analyses_date" ON "public"."analyses" USING "btree" ("analysis_date" DESC);



CREATE INDEX "idx_analyses_parcel_id" ON "public"."analyses" USING "btree" ("parcel_id");



CREATE INDEX "idx_analyses_parcel_type_date" ON "public"."analyses" USING "btree" ("parcel_id", "analysis_type", "analysis_date" DESC);



CREATE INDEX "idx_analyses_type" ON "public"."analyses" USING "btree" ("analysis_type");



CREATE INDEX "idx_analysis_recommendations_analysis_id" ON "public"."analysis_recommendations" USING "btree" ("analysis_id");



CREATE INDEX "idx_analysis_recommendations_priority" ON "public"."analysis_recommendations" USING "btree" ("priority");



CREATE INDEX "idx_audit_created" ON "public"."audit_logs" USING "btree" ("created_at");



CREATE INDEX "idx_audit_table_record" ON "public"."audit_logs" USING "btree" ("table_name", "record_id");



CREATE INDEX "idx_audit_user" ON "public"."audit_logs" USING "btree" ("user_id");



CREATE INDEX "idx_bank_accounts_active" ON "public"."bank_accounts" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_bank_accounts_org" ON "public"."bank_accounts" USING "btree" ("organization_id");



CREATE INDEX "idx_batches_expiry" ON "public"."inventory_batches" USING "btree" ("expiry_date") WHERE ("expiry_date" IS NOT NULL);



CREATE INDEX "idx_batches_item" ON "public"."inventory_batches" USING "btree" ("item_id");



CREATE INDEX "idx_batches_number" ON "public"."inventory_batches" USING "btree" ("batch_number");



CREATE INDEX "idx_batches_org" ON "public"."inventory_batches" USING "btree" ("organization_id");



CREATE INDEX "idx_batches_status" ON "public"."inventory_batches" USING "btree" ("status");



CREATE INDEX "idx_closing_date" ON "public"."stock_closing_entries" USING "btree" ("closing_date" DESC);



CREATE INDEX "idx_closing_items_closing" ON "public"."stock_closing_items" USING "btree" ("closing_id");



CREATE INDEX "idx_closing_items_item" ON "public"."stock_closing_items" USING "btree" ("item_id");



CREATE INDEX "idx_closing_items_warehouse" ON "public"."stock_closing_items" USING "btree" ("warehouse_id");



CREATE INDEX "idx_closing_org" ON "public"."stock_closing_entries" USING "btree" ("organization_id");



CREATE INDEX "idx_closing_status" ON "public"."stock_closing_entries" USING "btree" ("status");



CREATE INDEX "idx_cloud_coverage_checks_date" ON "public"."cloud_coverage_checks" USING "btree" ("check_date");



CREATE INDEX "idx_cloud_coverage_checks_org" ON "public"."cloud_coverage_checks" USING "btree" ("organization_id");



CREATE INDEX "idx_cloud_coverage_checks_parcel" ON "public"."cloud_coverage_checks" USING "btree" ("parcel_id");



CREATE INDEX "idx_cost_categories_organization" ON "public"."cost_categories" USING "btree" ("organization_id");



CREATE INDEX "idx_cost_centers_farm" ON "public"."cost_centers" USING "btree" ("farm_id") WHERE ("farm_id" IS NOT NULL);



CREATE INDEX "idx_cost_centers_org" ON "public"."cost_centers" USING "btree" ("organization_id");



CREATE INDEX "idx_cost_centers_parcel" ON "public"."cost_centers" USING "btree" ("parcel_id") WHERE ("parcel_id" IS NOT NULL);



CREATE INDEX "idx_cost_centers_parent" ON "public"."cost_centers" USING "btree" ("parent_id");



CREATE INDEX "idx_costs_date" ON "public"."costs" USING "btree" ("date");



CREATE INDEX "idx_costs_farm" ON "public"."costs" USING "btree" ("farm_id");



CREATE INDEX "idx_costs_organization" ON "public"."costs" USING "btree" ("organization_id");



CREATE INDEX "idx_costs_parcel" ON "public"."costs" USING "btree" ("parcel_id");



CREATE INDEX "idx_costs_reference" ON "public"."costs" USING "btree" ("reference_id", "reference_type");



CREATE INDEX "idx_crops_farm_id" ON "public"."crops" USING "btree" ("farm_id");



CREATE INDEX "idx_crops_parcel_id" ON "public"."crops" USING "btree" ("parcel_id");



CREATE INDEX "idx_customers_active" ON "public"."customers" USING "btree" ("organization_id", "is_active");



CREATE INDEX "idx_customers_code" ON "public"."customers" USING "btree" ("organization_id", "customer_code") WHERE ("customer_code" IS NOT NULL);



CREATE INDEX "idx_customers_name" ON "public"."customers" USING "btree" ("organization_id", "name");



CREATE INDEX "idx_customers_organization" ON "public"."customers" USING "btree" ("organization_id");



CREATE INDEX "idx_dashboard_settings_organization_id" ON "public"."dashboard_settings" USING "btree" ("organization_id");



CREATE INDEX "idx_dashboard_settings_user_id" ON "public"."dashboard_settings" USING "btree" ("user_id");



CREATE INDEX "idx_dashboard_settings_user_org" ON "public"."dashboard_settings" USING "btree" ("user_id", "organization_id");



CREATE INDEX "idx_day_laborers_farm_id" ON "public"."day_laborers" USING "btree" ("farm_id");



CREATE INDEX "idx_deliveries_customer_name" ON "public"."deliveries" USING "btree" ("customer_name");



CREATE INDEX "idx_deliveries_delivery_date" ON "public"."deliveries" USING "btree" ("delivery_date" DESC);



CREATE INDEX "idx_deliveries_farm_id" ON "public"."deliveries" USING "btree" ("farm_id");



CREATE INDEX "idx_deliveries_organization_id" ON "public"."deliveries" USING "btree" ("organization_id");



CREATE INDEX "idx_deliveries_payment_status" ON "public"."deliveries" USING "btree" ("payment_status");



CREATE INDEX "idx_deliveries_status" ON "public"."deliveries" USING "btree" ("status");



CREATE INDEX "idx_delivery_items_delivery_id" ON "public"."delivery_items" USING "btree" ("delivery_id");



CREATE INDEX "idx_delivery_items_harvest_record_id" ON "public"."delivery_items" USING "btree" ("harvest_record_id");



CREATE INDEX "idx_delivery_tracking_delivery_id" ON "public"."delivery_tracking" USING "btree" ("delivery_id");



CREATE INDEX "idx_delivery_tracking_recorded_at" ON "public"."delivery_tracking" USING "btree" ("recorded_at" DESC);



CREATE INDEX "idx_document_templates_default" ON "public"."document_templates" USING "btree" ("organization_id", "document_type", "is_default") WHERE ("is_default" = true);



CREATE INDEX "idx_document_templates_org_id" ON "public"."document_templates" USING "btree" ("organization_id");



CREATE INDEX "idx_document_templates_type" ON "public"."document_templates" USING "btree" ("organization_id", "document_type");



CREATE INDEX "idx_employees_farm_id" ON "public"."employees" USING "btree" ("farm_id");



CREATE INDEX "idx_farm_management_roles_farm_id" ON "public"."farm_management_roles" USING "btree" ("farm_id");



CREATE INDEX "idx_farm_management_roles_is_active" ON "public"."farm_management_roles" USING "btree" ("is_active");



CREATE INDEX "idx_farm_management_roles_user_id" ON "public"."farm_management_roles" USING "btree" ("user_id");



CREATE INDEX "idx_farms_organization_id" ON "public"."farms" USING "btree" ("organization_id");



CREATE INDEX "idx_financial_transactions_date" ON "public"."financial_transactions" USING "btree" ("transaction_date");



CREATE INDEX "idx_financial_transactions_farm_id" ON "public"."financial_transactions" USING "btree" ("farm_id");



CREATE INDEX "idx_harvest_forecasts_crop" ON "public"."harvest_forecasts" USING "btree" ("crop_type");



CREATE INDEX "idx_harvest_forecasts_date_end" ON "public"."harvest_forecasts" USING "btree" ("forecast_harvest_date_end");



CREATE INDEX "idx_harvest_forecasts_date_start" ON "public"."harvest_forecasts" USING "btree" ("forecast_harvest_date_start");



CREATE INDEX "idx_harvest_forecasts_farm" ON "public"."harvest_forecasts" USING "btree" ("farm_id");



CREATE INDEX "idx_harvest_forecasts_org" ON "public"."harvest_forecasts" USING "btree" ("organization_id");



CREATE INDEX "idx_harvest_forecasts_parcel" ON "public"."harvest_forecasts" USING "btree" ("parcel_id");



CREATE INDEX "idx_harvest_forecasts_status" ON "public"."harvest_forecasts" USING "btree" ("status");



CREATE INDEX "idx_harvest_records_farm_id" ON "public"."harvest_records" USING "btree" ("farm_id");



CREATE INDEX "idx_harvest_records_harvest_date" ON "public"."harvest_records" USING "btree" ("harvest_date" DESC);



CREATE INDEX "idx_harvest_records_organization_id" ON "public"."harvest_records" USING "btree" ("organization_id");



CREATE INDEX "idx_harvest_records_parcel_id" ON "public"."harvest_records" USING "btree" ("parcel_id");



CREATE INDEX "idx_harvest_records_reception_batch" ON "public"."harvest_records" USING "btree" ("reception_batch_id");



CREATE INDEX "idx_harvest_records_status" ON "public"."harvest_records" USING "btree" ("status");



CREATE INDEX "idx_harvest_records_workers_gin" ON "public"."harvest_records" USING "gin" ("workers");



CREATE INDEX "idx_harvests_delivery_status" ON "public"."harvests" USING "btree" ("delivery_status");



CREATE INDEX "idx_harvests_farm_id" ON "public"."harvests" USING "btree" ("farm_id");



CREATE INDEX "idx_harvests_harvest_date" ON "public"."harvests" USING "btree" ("harvest_date");



CREATE INDEX "idx_harvests_organization_id" ON "public"."harvests" USING "btree" ("organization_id");



CREATE INDEX "idx_harvests_parcel_id" ON "public"."harvests" USING "btree" ("parcel_id");



CREATE INDEX "idx_harvests_payment_status" ON "public"."harvests" USING "btree" ("payment_status");



CREATE INDEX "idx_inventory_farm_id" ON "public"."inventory" USING "btree" ("farm_id");



CREATE INDEX "idx_inventory_packaging_type" ON "public"."inventory" USING "btree" ("packaging_type") WHERE ("packaging_type" IS NOT NULL);



CREATE INDEX "idx_inventory_supplier_id" ON "public"."inventory" USING "btree" ("supplier_id");



CREATE INDEX "idx_inventory_warehouse_id" ON "public"."inventory" USING "btree" ("warehouse_id");



CREATE INDEX "idx_invoice_items_expense_account" ON "public"."invoice_items" USING "btree" ("expense_account_id") WHERE ("expense_account_id" IS NOT NULL);



CREATE INDEX "idx_invoice_items_income_account" ON "public"."invoice_items" USING "btree" ("income_account_id") WHERE ("income_account_id" IS NOT NULL);



CREATE INDEX "idx_invoice_items_invoice" ON "public"."invoice_items" USING "btree" ("invoice_id");



CREATE INDEX "idx_invoice_items_item" ON "public"."invoice_items" USING "btree" ("item_id") WHERE ("item_id" IS NOT NULL);



CREATE INDEX "idx_invoice_items_tax" ON "public"."invoice_items" USING "btree" ("tax_id") WHERE ("tax_id" IS NOT NULL);



CREATE INDEX "idx_invoices_date" ON "public"."invoices" USING "btree" ("invoice_date" DESC);



CREATE INDEX "idx_invoices_due_date" ON "public"."invoices" USING "btree" ("due_date") WHERE ("status" = ANY (ARRAY['submitted'::"public"."invoice_status", 'partially_paid'::"public"."invoice_status", 'overdue'::"public"."invoice_status"]));



CREATE INDEX "idx_invoices_farm" ON "public"."invoices" USING "btree" ("farm_id") WHERE ("farm_id" IS NOT NULL);



CREATE INDEX "idx_invoices_org_type" ON "public"."invoices" USING "btree" ("organization_id", "invoice_type");



CREATE INDEX "idx_invoices_parcel" ON "public"."invoices" USING "btree" ("parcel_id") WHERE ("parcel_id" IS NOT NULL);



CREATE INDEX "idx_invoices_party" ON "public"."invoices" USING "btree" ("party_type", "party_id") WHERE ("party_id" IS NOT NULL);



CREATE INDEX "idx_invoices_purchase_order" ON "public"."invoices" USING "btree" ("purchase_order_id") WHERE ("purchase_order_id" IS NOT NULL);



CREATE INDEX "idx_invoices_sales_order" ON "public"."invoices" USING "btree" ("sales_order_id") WHERE ("sales_order_id" IS NOT NULL);



CREATE INDEX "idx_invoices_status" ON "public"."invoices" USING "btree" ("status");



CREATE INDEX "idx_item_customer_details_customer" ON "public"."item_customer_details" USING "btree" ("customer_id");



CREATE INDEX "idx_item_customer_details_item" ON "public"."item_customer_details" USING "btree" ("item_id");



CREATE INDEX "idx_item_groups_active" ON "public"."item_groups" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_item_groups_org" ON "public"."item_groups" USING "btree" ("organization_id");



CREATE INDEX "idx_item_groups_parent" ON "public"."item_groups" USING "btree" ("parent_group_id") WHERE ("parent_group_id" IS NOT NULL);



CREATE INDEX "idx_item_groups_path" ON "public"."item_groups" USING "btree" ("path") WHERE ("path" IS NOT NULL);



CREATE UNIQUE INDEX "idx_item_groups_unique_name" ON "public"."item_groups" USING "btree" ("organization_id", "name", COALESCE("parent_group_id", '00000000-0000-0000-0000-000000000000'::"uuid"));



CREATE INDEX "idx_item_prices_active" ON "public"."item_prices" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_item_prices_customer" ON "public"."item_prices" USING "btree" ("customer_id") WHERE ("customer_id" IS NOT NULL);



CREATE INDEX "idx_item_prices_item" ON "public"."item_prices" USING "btree" ("item_id");



CREATE INDEX "idx_item_prices_org" ON "public"."item_prices" USING "btree" ("organization_id");



CREATE INDEX "idx_item_prices_supplier" ON "public"."item_prices" USING "btree" ("supplier_id") WHERE ("supplier_id" IS NOT NULL);



CREATE UNIQUE INDEX "idx_item_prices_unique" ON "public"."item_prices" USING "btree" ("organization_id", "item_id", "price_list_name", "unit", COALESCE("customer_id", '00000000-0000-0000-0000-000000000000'::"uuid"), COALESCE("supplier_id", '00000000-0000-0000-0000-000000000000'::"uuid"));



CREATE INDEX "idx_item_supplier_details_item" ON "public"."item_supplier_details" USING "btree" ("item_id");



CREATE INDEX "idx_item_supplier_details_supplier" ON "public"."item_supplier_details" USING "btree" ("supplier_id");



CREATE INDEX "idx_item_unit_conversions_item" ON "public"."item_unit_conversions" USING "btree" ("item_id");



CREATE INDEX "idx_item_variants_active" ON "public"."item_variants" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_item_variants_item" ON "public"."item_variants" USING "btree" ("item_id");



CREATE INDEX "idx_items_active" ON "public"."items" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_items_barcode" ON "public"."items" USING "btree" ("barcode") WHERE ("barcode" IS NOT NULL);



CREATE INDEX "idx_items_code" ON "public"."items" USING "btree" ("item_code");



CREATE INDEX "idx_items_crop_type" ON "public"."items" USING "btree" ("crop_type") WHERE ("crop_type" IS NOT NULL);



CREATE INDEX "idx_items_group" ON "public"."items" USING "btree" ("item_group_id");



CREATE INDEX "idx_items_org" ON "public"."items" USING "btree" ("organization_id");



CREATE INDEX "idx_items_purchase_item" ON "public"."items" USING "btree" ("is_purchase_item") WHERE ("is_purchase_item" = true);



CREATE INDEX "idx_items_sales_item" ON "public"."items" USING "btree" ("is_sales_item") WHERE ("is_sales_item" = true);



CREATE INDEX "idx_je_org_date" ON "public"."journal_entries" USING "btree" ("organization_id", "entry_date" DESC);



CREATE INDEX "idx_je_posting_date" ON "public"."journal_entries" USING "btree" ("posting_date" DESC);



CREATE INDEX "idx_je_reference" ON "public"."journal_entries" USING "btree" ("reference_type", "reference_id") WHERE ("reference_id" IS NOT NULL);



CREATE INDEX "idx_je_status" ON "public"."journal_entries" USING "btree" ("status");



CREATE INDEX "idx_ji_account" ON "public"."journal_items" USING "btree" ("account_id");



CREATE INDEX "idx_ji_cost_center" ON "public"."journal_items" USING "btree" ("cost_center_id") WHERE ("cost_center_id" IS NOT NULL);



CREATE INDEX "idx_ji_farm" ON "public"."journal_items" USING "btree" ("farm_id") WHERE ("farm_id" IS NOT NULL);



CREATE INDEX "idx_ji_journal" ON "public"."journal_items" USING "btree" ("journal_entry_id");



CREATE INDEX "idx_ji_parcel" ON "public"."journal_items" USING "btree" ("parcel_id") WHERE ("parcel_id" IS NOT NULL);



CREATE INDEX "idx_journal_entries_entry_date" ON "public"."journal_entries" USING "btree" ("entry_date");



CREATE UNIQUE INDEX "idx_journal_entries_entry_number_org" ON "public"."journal_entries" USING "btree" ("organization_id", "entry_number");



CREATE INDEX "idx_journal_entries_status" ON "public"."journal_entries" USING "btree" ("status");



CREATE INDEX "idx_journal_items_account_id" ON "public"."journal_items" USING "btree" ("account_id");



CREATE INDEX "idx_journal_items_cost_center_id" ON "public"."journal_items" USING "btree" ("cost_center_id");



CREATE INDEX "idx_lab_orders_date" ON "public"."lab_service_orders" USING "btree" ("order_date");



CREATE INDEX "idx_lab_orders_farm" ON "public"."lab_service_orders" USING "btree" ("farm_id");



CREATE INDEX "idx_lab_orders_org" ON "public"."lab_service_orders" USING "btree" ("organization_id");



CREATE INDEX "idx_lab_orders_parcel" ON "public"."lab_service_orders" USING "btree" ("parcel_id");



CREATE INDEX "idx_lab_orders_status" ON "public"."lab_service_orders" USING "btree" ("status");



CREATE INDEX "idx_lab_recommendations_order" ON "public"."lab_service_recommendations" USING "btree" ("order_id");



CREATE INDEX "idx_lab_recommendations_parcel" ON "public"."lab_service_recommendations" USING "btree" ("parcel_id");



CREATE INDEX "idx_lab_results_order" ON "public"."lab_result_parameters" USING "btree" ("order_id");



CREATE INDEX "idx_livestock_farm_id" ON "public"."livestock" USING "btree" ("farm_id");



CREATE INDEX "idx_metayage_settlements_period" ON "public"."metayage_settlements" USING "btree" ("period_start", "period_end");



CREATE INDEX "idx_metayage_settlements_worker" ON "public"."metayage_settlements" USING "btree" ("worker_id");



CREATE INDEX "idx_opening_stock_item" ON "public"."opening_stock_balances" USING "btree" ("item_id");



CREATE INDEX "idx_opening_stock_org" ON "public"."opening_stock_balances" USING "btree" ("organization_id");



CREATE INDEX "idx_opening_stock_status" ON "public"."opening_stock_balances" USING "btree" ("status");



CREATE INDEX "idx_opening_stock_warehouse" ON "public"."opening_stock_balances" USING "btree" ("warehouse_id");



CREATE INDEX "idx_organization_users_is_active" ON "public"."organization_users" USING "btree" ("is_active");



CREATE INDEX "idx_organization_users_org_user" ON "public"."organization_users" USING "btree" ("organization_id", "user_id");



CREATE INDEX "idx_organization_users_organization_id" ON "public"."organization_users" USING "btree" ("organization_id");



CREATE INDEX "idx_organization_users_role" ON "public"."organization_users" USING "btree" ("role");



CREATE INDEX "idx_organization_users_role_id" ON "public"."organization_users" USING "btree" ("role_id");



CREATE INDEX "idx_organization_users_user_id" ON "public"."organization_users" USING "btree" ("user_id");



CREATE INDEX "idx_organizations_currency" ON "public"."organizations" USING "btree" ("currency");



CREATE INDEX "idx_organizations_onboarding" ON "public"."organizations" USING "btree" ("onboarding_completed");



CREATE INDEX "idx_organizations_owner_id" ON "public"."organizations" USING "btree" ("owner_id");



CREATE INDEX "idx_parcel_reports_generated_at" ON "public"."parcel_reports" USING "btree" ("generated_at" DESC);



CREATE INDEX "idx_parcel_reports_parcel_id" ON "public"."parcel_reports" USING "btree" ("parcel_id");



CREATE INDEX "idx_parcel_reports_status" ON "public"."parcel_reports" USING "btree" ("status");



CREATE INDEX "idx_parcels_crop_category" ON "public"."parcels" USING "btree" ("crop_category") WHERE ("crop_category" IS NOT NULL);



CREATE INDEX "idx_parcels_farm_id" ON "public"."parcels" USING "btree" ("farm_id");



CREATE INDEX "idx_parcels_planting_date" ON "public"."parcels" USING "btree" ("planting_date") WHERE ("planting_date" IS NOT NULL);



CREATE INDEX "idx_parcels_planting_system" ON "public"."parcels" USING "btree" ("planting_system") WHERE ("planting_system" IS NOT NULL);



CREATE INDEX "idx_parcels_planting_year" ON "public"."parcels" USING "btree" ("planting_year") WHERE ("planting_year" IS NOT NULL);



CREATE INDEX "idx_parcels_tree_type" ON "public"."parcels" USING "btree" ("tree_type") WHERE ("tree_type" IS NOT NULL);



CREATE INDEX "idx_parcels_variety" ON "public"."parcels" USING "btree" ("variety") WHERE ("variety" IS NOT NULL);



CREATE INDEX "idx_payment_advances_requested_date" ON "public"."payment_advances" USING "btree" ("requested_date" DESC);



CREATE INDEX "idx_payment_advances_status" ON "public"."payment_advances" USING "btree" ("status");



CREATE INDEX "idx_payment_advances_worker_id" ON "public"."payment_advances" USING "btree" ("worker_id");



CREATE INDEX "idx_payment_alloc_invoice" ON "public"."payment_allocations" USING "btree" ("invoice_id");



CREATE INDEX "idx_payment_alloc_payment" ON "public"."payment_allocations" USING "btree" ("payment_id");



CREATE INDEX "idx_payment_bonuses_payment_record_id" ON "public"."payment_bonuses" USING "btree" ("payment_record_id");



CREATE INDEX "idx_payment_deductions_payment_record_id" ON "public"."payment_deductions" USING "btree" ("payment_record_id");



CREATE INDEX "idx_payment_deductions_type" ON "public"."payment_deductions" USING "btree" ("deduction_type");



CREATE INDEX "idx_payment_records_organization_id" ON "public"."payment_records" USING "btree" ("organization_id");



CREATE INDEX "idx_payment_records_payment_date" ON "public"."payment_records" USING "btree" ("payment_date" DESC);



CREATE INDEX "idx_payment_records_period" ON "public"."payment_records" USING "btree" ("period_start", "period_end");



CREATE INDEX "idx_payment_records_status" ON "public"."payment_records" USING "btree" ("status");



CREATE INDEX "idx_payment_records_worker_id" ON "public"."payment_records" USING "btree" ("worker_id");



CREATE INDEX "idx_payments_organization_id" ON "public"."payments" USING "btree" ("organization_id");



CREATE INDEX "idx_payments_payment_date" ON "public"."payments" USING "btree" ("payment_date");



CREATE INDEX "idx_payments_status" ON "public"."payments" USING "btree" ("status");



CREATE INDEX "idx_payments_supplier_id" ON "public"."payments" USING "btree" ("supplier_id");



CREATE INDEX "idx_payments_worker_id" ON "public"."payments" USING "btree" ("worker_id");



CREATE INDEX "idx_performance_alerts_created" ON "public"."performance_alerts" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_performance_alerts_farm" ON "public"."performance_alerts" USING "btree" ("farm_id");



CREATE INDEX "idx_performance_alerts_org" ON "public"."performance_alerts" USING "btree" ("organization_id");



CREATE INDEX "idx_performance_alerts_parcel" ON "public"."performance_alerts" USING "btree" ("parcel_id");



CREATE INDEX "idx_performance_alerts_severity" ON "public"."performance_alerts" USING "btree" ("severity");



CREATE INDEX "idx_performance_alerts_status" ON "public"."performance_alerts" USING "btree" ("status");



CREATE INDEX "idx_performance_alerts_type" ON "public"."performance_alerts" USING "btree" ("alert_type");



CREATE INDEX "idx_permission_groups_name" ON "public"."permission_groups" USING "btree" ("name");



CREATE INDEX "idx_permissions_action" ON "public"."permissions" USING "btree" ("action");



CREATE INDEX "idx_permissions_resource" ON "public"."permissions" USING "btree" ("resource");



CREATE INDEX "idx_piece_work_date" ON "public"."piece_work_records" USING "btree" ("work_date");



CREATE INDEX "idx_piece_work_farm" ON "public"."piece_work_records" USING "btree" ("farm_id");



CREATE INDEX "idx_piece_work_org" ON "public"."piece_work_records" USING "btree" ("organization_id");



CREATE INDEX "idx_piece_work_payment" ON "public"."piece_work_records" USING "btree" ("payment_record_id");



CREATE INDEX "idx_piece_work_status" ON "public"."piece_work_records" USING "btree" ("payment_status");



CREATE INDEX "idx_piece_work_task" ON "public"."piece_work_records" USING "btree" ("task_id");



CREATE INDEX "idx_piece_work_worker" ON "public"."piece_work_records" USING "btree" ("worker_id");



CREATE INDEX "idx_plantation_types_org_id" ON "public"."plantation_types" USING "btree" ("organization_id");



CREATE INDEX "idx_profitability_snapshots_organization" ON "public"."profitability_snapshots" USING "btree" ("organization_id");



CREATE INDEX "idx_profitability_snapshots_parcel" ON "public"."profitability_snapshots" USING "btree" ("parcel_id");



CREATE INDEX "idx_profitability_snapshots_period" ON "public"."profitability_snapshots" USING "btree" ("period_start", "period_end");



CREATE INDEX "idx_purchase_order_items_item" ON "public"."purchase_order_items" USING "btree" ("item_id") WHERE ("item_id" IS NOT NULL);



CREATE INDEX "idx_purchase_order_items_po" ON "public"."purchase_order_items" USING "btree" ("purchase_order_id");



CREATE INDEX "idx_purchase_orders_date" ON "public"."purchase_orders" USING "btree" ("po_date" DESC);



CREATE INDEX "idx_purchase_orders_org" ON "public"."purchase_orders" USING "btree" ("organization_id");



CREATE INDEX "idx_purchase_orders_status" ON "public"."purchase_orders" USING "btree" ("status");



CREATE INDEX "idx_purchase_orders_stock_entry" ON "public"."purchase_orders" USING "btree" ("stock_entry_id");



CREATE INDEX "idx_purchase_orders_supplier" ON "public"."purchase_orders" USING "btree" ("supplier_id");



CREATE INDEX "idx_quote_items_item_id" ON "public"."quote_items" USING "btree" ("item_id");



CREATE INDEX "idx_quote_items_quote" ON "public"."quote_items" USING "btree" ("quote_id");



CREATE INDEX "idx_quotes_customer" ON "public"."quotes" USING "btree" ("customer_id");



CREATE INDEX "idx_quotes_date" ON "public"."quotes" USING "btree" ("quote_date" DESC);



CREATE INDEX "idx_quotes_org" ON "public"."quotes" USING "btree" ("organization_id");



CREATE INDEX "idx_quotes_sales_order" ON "public"."quotes" USING "btree" ("sales_order_id") WHERE ("sales_order_id" IS NOT NULL);



CREATE INDEX "idx_quotes_status" ON "public"."quotes" USING "btree" ("status");



CREATE INDEX "idx_reception_batches_batch_code" ON "public"."reception_batches" USING "btree" ("batch_code");



CREATE INDEX "idx_reception_batches_date" ON "public"."reception_batches" USING "btree" ("reception_date" DESC);



CREATE INDEX "idx_reception_batches_decision" ON "public"."reception_batches" USING "btree" ("decision");



CREATE INDEX "idx_reception_batches_harvest" ON "public"."reception_batches" USING "btree" ("harvest_id");



CREATE INDEX "idx_reception_batches_organization" ON "public"."reception_batches" USING "btree" ("organization_id");



CREATE INDEX "idx_reception_batches_parcel" ON "public"."reception_batches" USING "btree" ("parcel_id");



CREATE INDEX "idx_reception_batches_status" ON "public"."reception_batches" USING "btree" ("status");



CREATE INDEX "idx_reception_batches_warehouse" ON "public"."reception_batches" USING "btree" ("warehouse_id");



CREATE INDEX "idx_revenues_date" ON "public"."revenues" USING "btree" ("date");



CREATE INDEX "idx_revenues_organization" ON "public"."revenues" USING "btree" ("organization_id");



CREATE INDEX "idx_revenues_parcel" ON "public"."revenues" USING "btree" ("parcel_id");



CREATE INDEX "idx_role_assignments_audit_assigned_by" ON "public"."role_assignments_audit" USING "btree" ("assigned_by");



CREATE INDEX "idx_role_assignments_audit_effective_date" ON "public"."role_assignments_audit" USING "btree" ("effective_date");



CREATE INDEX "idx_role_assignments_audit_user_org" ON "public"."role_assignments_audit" USING "btree" ("user_id", "organization_id");



CREATE INDEX "idx_role_permissions_permission_id" ON "public"."role_permissions" USING "btree" ("permission_id");



CREATE INDEX "idx_role_permissions_role_id" ON "public"."role_permissions" USING "btree" ("role_id");



CREATE INDEX "idx_role_templates_is_system" ON "public"."role_templates" USING "btree" ("is_system_template");



CREATE INDEX "idx_role_templates_org_id" ON "public"."role_templates" USING "btree" ("organization_id");



CREATE INDEX "idx_roles_level" ON "public"."roles" USING "btree" ("level");



CREATE INDEX "idx_roles_name" ON "public"."roles" USING "btree" ("name");



CREATE INDEX "idx_sales_order_items_item" ON "public"."sales_order_items" USING "btree" ("item_id") WHERE ("item_id" IS NOT NULL);



CREATE INDEX "idx_sales_order_items_order" ON "public"."sales_order_items" USING "btree" ("sales_order_id");



CREATE INDEX "idx_sales_orders_customer" ON "public"."sales_orders" USING "btree" ("customer_id");



CREATE INDEX "idx_sales_orders_date" ON "public"."sales_orders" USING "btree" ("order_date" DESC);



CREATE INDEX "idx_sales_orders_org" ON "public"."sales_orders" USING "btree" ("organization_id");



CREATE INDEX "idx_sales_orders_quote" ON "public"."sales_orders" USING "btree" ("quote_id") WHERE ("quote_id" IS NOT NULL);



CREATE INDEX "idx_sales_orders_status" ON "public"."sales_orders" USING "btree" ("status");



CREATE INDEX "idx_sales_orders_stock_entry" ON "public"."sales_orders" USING "btree" ("stock_entry_id");



CREATE INDEX "idx_sample_schedules_next_date" ON "public"."sample_collection_schedules" USING "btree" ("next_collection_date");



CREATE INDEX "idx_sample_schedules_org" ON "public"."sample_collection_schedules" USING "btree" ("organization_id");



CREATE INDEX "idx_satellite_aois_farm" ON "public"."satellite_aois" USING "btree" ("farm_id");



CREATE INDEX "idx_satellite_aois_org" ON "public"."satellite_aois" USING "btree" ("organization_id");



CREATE INDEX "idx_satellite_aois_parcel" ON "public"."satellite_aois" USING "btree" ("parcel_id");



CREATE INDEX "idx_satellite_files_created_at" ON "public"."satellite_files" USING "btree" ("created_at");



CREATE INDEX "idx_satellite_files_date" ON "public"."satellite_files" USING "btree" ("date");



CREATE INDEX "idx_satellite_files_index" ON "public"."satellite_files" USING "btree" ("index");



CREATE INDEX "idx_satellite_files_org_index_date" ON "public"."satellite_files" USING "btree" ("organization_id", "index", "date");



CREATE INDEX "idx_satellite_files_organization_id" ON "public"."satellite_files" USING "btree" ("organization_id");



CREATE INDEX "idx_satellite_files_parcel_id" ON "public"."satellite_files" USING "btree" ("parcel_id");



CREATE INDEX "idx_satellite_indices_data_date" ON "public"."satellite_indices_data" USING "btree" ("date");



CREATE INDEX "idx_satellite_indices_data_farm" ON "public"."satellite_indices_data" USING "btree" ("farm_id");



CREATE INDEX "idx_satellite_indices_data_index" ON "public"."satellite_indices_data" USING "btree" ("index_name");



CREATE INDEX "idx_satellite_indices_data_org" ON "public"."satellite_indices_data" USING "btree" ("organization_id");



CREATE INDEX "idx_satellite_indices_data_parcel" ON "public"."satellite_indices_data" USING "btree" ("parcel_id");



CREATE INDEX "idx_satellite_indices_data_parcel_date" ON "public"."satellite_indices_data" USING "btree" ("parcel_id", "date");



CREATE INDEX "idx_satellite_indices_data_parcel_index" ON "public"."satellite_indices_data" USING "btree" ("parcel_id", "index_name");



CREATE INDEX "idx_satellite_processing_jobs_created" ON "public"."satellite_processing_jobs" USING "btree" ("created_at");



CREATE INDEX "idx_satellite_processing_jobs_farm" ON "public"."satellite_processing_jobs" USING "btree" ("farm_id");



CREATE INDEX "idx_satellite_processing_jobs_org" ON "public"."satellite_processing_jobs" USING "btree" ("organization_id");



CREATE INDEX "idx_satellite_processing_jobs_parcel" ON "public"."satellite_processing_jobs" USING "btree" ("parcel_id");



CREATE INDEX "idx_satellite_processing_jobs_status" ON "public"."satellite_processing_jobs" USING "btree" ("status");



CREATE INDEX "idx_satellite_processing_tasks_job" ON "public"."satellite_processing_tasks" USING "btree" ("processing_job_id");



CREATE INDEX "idx_satellite_processing_tasks_org" ON "public"."satellite_processing_tasks" USING "btree" ("organization_id");



CREATE INDEX "idx_satellite_processing_tasks_parcel" ON "public"."satellite_processing_tasks" USING "btree" ("parcel_id");



CREATE INDEX "idx_satellite_processing_tasks_priority" ON "public"."satellite_processing_tasks" USING "btree" ("priority" DESC, "created_at");



CREATE INDEX "idx_satellite_processing_tasks_status" ON "public"."satellite_processing_tasks" USING "btree" ("status");



CREATE INDEX "idx_serial_item" ON "public"."inventory_serial_numbers" USING "btree" ("item_id");



CREATE INDEX "idx_serial_number" ON "public"."inventory_serial_numbers" USING "btree" ("serial_number");



CREATE INDEX "idx_serial_org" ON "public"."inventory_serial_numbers" USING "btree" ("organization_id");



CREATE INDEX "idx_serial_status" ON "public"."inventory_serial_numbers" USING "btree" ("status");



CREATE INDEX "idx_serial_warehouse" ON "public"."inventory_serial_numbers" USING "btree" ("warehouse_id") WHERE ("warehouse_id" IS NOT NULL);



CREATE INDEX "idx_soil_analyses_analysis_date" ON "public"."soil_analyses" USING "btree" ("analysis_date");



CREATE INDEX "idx_soil_analyses_parcel_id" ON "public"."soil_analyses" USING "btree" ("parcel_id");



CREATE INDEX "idx_stock_entries_date" ON "public"."stock_entries" USING "btree" ("entry_date" DESC);



CREATE INDEX "idx_stock_entries_from_warehouse" ON "public"."stock_entries" USING "btree" ("from_warehouse_id");



CREATE INDEX "idx_stock_entries_journal" ON "public"."stock_entries" USING "btree" ("journal_entry_id");



CREATE INDEX "idx_stock_entries_org" ON "public"."stock_entries" USING "btree" ("organization_id");



CREATE INDEX "idx_stock_entries_reception_batch" ON "public"."stock_entries" USING "btree" ("reception_batch_id");



CREATE INDEX "idx_stock_entries_reference" ON "public"."stock_entries" USING "btree" ("reference_type", "reference_id");



CREATE INDEX "idx_stock_entries_status" ON "public"."stock_entries" USING "btree" ("status");



CREATE INDEX "idx_stock_entries_to_warehouse" ON "public"."stock_entries" USING "btree" ("to_warehouse_id");



CREATE INDEX "idx_stock_entries_type" ON "public"."stock_entries" USING "btree" ("entry_type");



CREATE INDEX "idx_stock_entry_items_batch" ON "public"."stock_entry_items" USING "btree" ("batch_number");



CREATE INDEX "idx_stock_entry_items_entry" ON "public"."stock_entry_items" USING "btree" ("stock_entry_id");



CREATE INDEX "idx_stock_entry_items_item" ON "public"."stock_entry_items" USING "btree" ("item_id");



CREATE INDEX "idx_stock_entry_items_item_new" ON "public"."stock_entry_items" USING "btree" ("item_id") WHERE ("item_id" IS NOT NULL);



CREATE INDEX "idx_stock_entry_items_serial" ON "public"."stock_entry_items" USING "btree" ("serial_number");



CREATE INDEX "idx_stock_mapping_org" ON "public"."stock_account_mappings" USING "btree" ("organization_id");



CREATE INDEX "idx_stock_movements_date" ON "public"."stock_movements" USING "btree" ("movement_date" DESC);



CREATE INDEX "idx_stock_movements_entry" ON "public"."stock_movements" USING "btree" ("stock_entry_id");



CREATE INDEX "idx_stock_movements_item" ON "public"."stock_movements" USING "btree" ("item_id");



CREATE INDEX "idx_stock_movements_org" ON "public"."stock_movements" USING "btree" ("organization_id");



CREATE INDEX "idx_stock_movements_warehouse" ON "public"."stock_movements" USING "btree" ("warehouse_id");



CREATE INDEX "idx_stock_valuation_batch" ON "public"."stock_valuation" USING "btree" ("batch_number") WHERE ("batch_number" IS NOT NULL);



CREATE INDEX "idx_stock_valuation_date" ON "public"."stock_valuation" USING "btree" ("valuation_date" DESC);



CREATE INDEX "idx_stock_valuation_item" ON "public"."stock_valuation" USING "btree" ("item_id");



CREATE INDEX "idx_stock_valuation_org" ON "public"."stock_valuation" USING "btree" ("organization_id");



CREATE INDEX "idx_stock_valuation_remaining" ON "public"."stock_valuation" USING "btree" ("item_id", "warehouse_id", "remaining_quantity") WHERE ("remaining_quantity" > (0)::numeric);



CREATE INDEX "idx_stock_valuation_serial" ON "public"."stock_valuation" USING "btree" ("serial_number") WHERE ("serial_number" IS NOT NULL);



CREATE INDEX "idx_stock_valuation_warehouse" ON "public"."stock_valuation" USING "btree" ("warehouse_id");



CREATE INDEX "idx_structures_condition" ON "public"."structures" USING "btree" ("condition");



CREATE INDEX "idx_structures_farm_id" ON "public"."structures" USING "btree" ("farm_id");



CREATE INDEX "idx_structures_farm_type" ON "public"."structures" USING "btree" ("farm_id", "type");



CREATE INDEX "idx_structures_installation_date" ON "public"."structures" USING "btree" ("installation_date");



CREATE INDEX "idx_structures_is_active" ON "public"."structures" USING "btree" ("is_active");



CREATE INDEX "idx_structures_org_farm" ON "public"."structures" USING "btree" ("organization_id", "farm_id");



CREATE INDEX "idx_structures_organization_id" ON "public"."structures" USING "btree" ("organization_id");



CREATE INDEX "idx_structures_type" ON "public"."structures" USING "btree" ("type");



CREATE INDEX "idx_subscriptions_organization" ON "public"."subscriptions" USING "btree" ("organization_id");



CREATE INDEX "idx_subscriptions_polar_id" ON "public"."subscriptions" USING "btree" ("polar_subscription_id");



CREATE INDEX "idx_subscriptions_status" ON "public"."subscriptions" USING "btree" ("status");



CREATE INDEX "idx_suppliers_organization_id" ON "public"."suppliers" USING "btree" ("organization_id");



CREATE INDEX "idx_task_categories_organization_id" ON "public"."task_categories" USING "btree" ("organization_id");



CREATE INDEX "idx_task_comments_created_at" ON "public"."task_comments" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_task_comments_task_id" ON "public"."task_comments" USING "btree" ("task_id");



CREATE INDEX "idx_task_costs_status" ON "public"."task_costs" USING "btree" ("payment_status");



CREATE INDEX "idx_task_costs_task" ON "public"."task_costs" USING "btree" ("task_id");



CREATE INDEX "idx_task_costs_type" ON "public"."task_costs" USING "btree" ("cost_type");



CREATE INDEX "idx_task_costs_work_unit" ON "public"."task_costs" USING "btree" ("work_unit_id");



CREATE INDEX "idx_task_costs_worker" ON "public"."task_costs" USING "btree" ("worker_id");



CREATE INDEX "idx_task_dependencies_depends_on" ON "public"."task_dependencies" USING "btree" ("depends_on_task_id");



CREATE INDEX "idx_task_dependencies_task_id" ON "public"."task_dependencies" USING "btree" ("task_id");



CREATE INDEX "idx_task_equipment_task_id" ON "public"."task_equipment" USING "btree" ("task_id");



CREATE INDEX "idx_task_time_logs_start_time" ON "public"."task_time_logs" USING "btree" ("start_time" DESC);



CREATE INDEX "idx_task_time_logs_task_id" ON "public"."task_time_logs" USING "btree" ("task_id");



CREATE INDEX "idx_task_time_logs_worker_id" ON "public"."task_time_logs" USING "btree" ("worker_id");



CREATE INDEX "idx_tasks_assigned_to" ON "public"."tasks" USING "btree" ("assigned_to");



CREATE INDEX "idx_tasks_due_date" ON "public"."tasks" USING "btree" ("due_date");



CREATE INDEX "idx_tasks_farm_id" ON "public"."tasks" USING "btree" ("farm_id");



CREATE INDEX "idx_tasks_organization_id" ON "public"."tasks" USING "btree" ("organization_id");



CREATE INDEX "idx_tasks_parcel_id" ON "public"."tasks" USING "btree" ("parcel_id");



CREATE INDEX "idx_tasks_payment_type" ON "public"."tasks" USING "btree" ("payment_type");



CREATE INDEX "idx_tasks_scheduled_start" ON "public"."tasks" USING "btree" ("scheduled_start");



CREATE INDEX "idx_tasks_status" ON "public"."tasks" USING "btree" ("status");



CREATE INDEX "idx_tasks_task_type" ON "public"."tasks" USING "btree" ("task_type");



CREATE INDEX "idx_tasks_work_unit" ON "public"."tasks" USING "btree" ("work_unit_id");



CREATE INDEX "idx_tasks_worker_id" ON "public"."tasks" USING "btree" ("worker_id");



CREATE INDEX "idx_taxes_active" ON "public"."taxes" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_taxes_org" ON "public"."taxes" USING "btree" ("organization_id");



CREATE INDEX "idx_taxes_type" ON "public"."taxes" USING "btree" ("tax_type");



CREATE INDEX "idx_tree_categories_org_id" ON "public"."tree_categories" USING "btree" ("organization_id");



CREATE INDEX "idx_trees_category_id" ON "public"."trees" USING "btree" ("category_id");



CREATE INDEX "idx_usage_organization" ON "public"."subscription_usage" USING "btree" ("organization_id");



CREATE INDEX "idx_usage_subscription" ON "public"."subscription_usage" USING "btree" ("subscription_id");



CREATE INDEX "idx_user_profiles_password_set" ON "public"."user_profiles" USING "btree" ("password_set");



CREATE INDEX "idx_utilities_billing_date" ON "public"."utilities" USING "btree" ("billing_date");



CREATE INDEX "idx_utilities_farm_id" ON "public"."utilities" USING "btree" ("farm_id");



CREATE INDEX "idx_utilities_journal_entry" ON "public"."utilities" USING "btree" ("journal_entry_id") WHERE ("journal_entry_id" IS NOT NULL);



CREATE INDEX "idx_utilities_payment_status" ON "public"."utilities" USING "btree" ("payment_status");



CREATE INDEX "idx_utilities_type" ON "public"."utilities" USING "btree" ("type");



CREATE INDEX "idx_warehouses_farm_id" ON "public"."warehouses" USING "btree" ("farm_id");



CREATE INDEX "idx_warehouses_organization_id" ON "public"."warehouses" USING "btree" ("organization_id");



CREATE INDEX "idx_warehouses_reception_center" ON "public"."warehouses" USING "btree" ("is_reception_center") WHERE ("is_reception_center" = true);



CREATE INDEX "idx_work_records_date" ON "public"."work_records" USING "btree" ("work_date");



CREATE INDEX "idx_work_records_farm_id" ON "public"."work_records" USING "btree" ("farm_id");



CREATE INDEX "idx_work_records_worker" ON "public"."work_records" USING "btree" ("worker_id");



CREATE INDEX "idx_work_units_active" ON "public"."work_units" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_work_units_category" ON "public"."work_units" USING "btree" ("unit_category");



CREATE INDEX "idx_work_units_org" ON "public"."work_units" USING "btree" ("organization_id");



CREATE INDEX "idx_workers_active" ON "public"."workers" USING "btree" ("is_active");



CREATE INDEX "idx_workers_farm" ON "public"."workers" USING "btree" ("farm_id");



CREATE INDEX "idx_workers_organization" ON "public"."workers" USING "btree" ("organization_id");



CREATE INDEX "idx_workers_type" ON "public"."workers" USING "btree" ("worker_type");



CREATE INDEX "idx_workers_user_id" ON "public"."workers" USING "btree" ("user_id");



CREATE UNIQUE INDEX "idx_workers_user_id_unique" ON "public"."workers" USING "btree" ("user_id") WHERE ("user_id" IS NOT NULL);



CREATE INDEX "idx_yield_benchmarks_active" ON "public"."yield_benchmarks" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_yield_benchmarks_crop" ON "public"."yield_benchmarks" USING "btree" ("crop_type");



CREATE INDEX "idx_yield_benchmarks_farm" ON "public"."yield_benchmarks" USING "btree" ("farm_id");



CREATE INDEX "idx_yield_benchmarks_org" ON "public"."yield_benchmarks" USING "btree" ("organization_id");



CREATE INDEX "idx_yield_benchmarks_parcel" ON "public"."yield_benchmarks" USING "btree" ("parcel_id");



CREATE INDEX "idx_yield_history_crop" ON "public"."yield_history" USING "btree" ("crop_type");



CREATE INDEX "idx_yield_history_date" ON "public"."yield_history" USING "btree" ("harvest_date" DESC);



CREATE INDEX "idx_yield_history_farm" ON "public"."yield_history" USING "btree" ("farm_id");



CREATE INDEX "idx_yield_history_harvest_id" ON "public"."yield_history" USING "btree" ("harvest_id");



CREATE INDEX "idx_yield_history_org" ON "public"."yield_history" USING "btree" ("organization_id");



CREATE INDEX "idx_yield_history_parcel" ON "public"."yield_history" USING "btree" ("parcel_id");



CREATE INDEX "idx_yield_history_season" ON "public"."yield_history" USING "btree" ("harvest_season");



CREATE OR REPLACE TRIGGER "audit_crops" AFTER INSERT OR DELETE OR UPDATE ON "public"."crops" FOR EACH ROW EXECUTE FUNCTION "public"."audit_trigger"();



CREATE OR REPLACE TRIGGER "audit_farms" AFTER INSERT OR DELETE OR UPDATE ON "public"."farms" FOR EACH ROW EXECUTE FUNCTION "public"."audit_trigger"();



CREATE OR REPLACE TRIGGER "audit_financial_transactions" AFTER INSERT OR DELETE OR UPDATE ON "public"."financial_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."audit_trigger"();



CREATE OR REPLACE TRIGGER "audit_organization_users" AFTER INSERT OR DELETE OR UPDATE ON "public"."organization_users" FOR EACH ROW EXECUTE FUNCTION "public"."audit_trigger"();



CREATE OR REPLACE TRIGGER "audit_organizations" AFTER INSERT OR DELETE OR UPDATE ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."audit_trigger"();



CREATE OR REPLACE TRIGGER "audit_parcels" AFTER INSERT OR DELETE OR UPDATE ON "public"."parcels" FOR EACH ROW EXECUTE FUNCTION "public"."audit_trigger"();



CREATE OR REPLACE TRIGGER "audit_role_assignment_trigger" AFTER UPDATE ON "public"."organization_users" FOR EACH ROW EXECUTE FUNCTION "public"."audit_role_assignment"();



CREATE OR REPLACE TRIGGER "audit_structures" AFTER INSERT OR DELETE OR UPDATE ON "public"."structures" FOR EACH ROW EXECUTE FUNCTION "public"."audit_trigger"();



CREATE OR REPLACE TRIGGER "block_analyses_without_sub" BEFORE INSERT OR DELETE OR UPDATE ON "public"."analyses" FOR EACH ROW EXECUTE FUNCTION "public"."block_write_without_subscription"();



CREATE OR REPLACE TRIGGER "block_farms_without_sub" BEFORE INSERT OR DELETE OR UPDATE ON "public"."farms" FOR EACH ROW EXECUTE FUNCTION "public"."block_write_without_subscription"();



CREATE OR REPLACE TRIGGER "block_parcels_without_sub" BEFORE INSERT OR DELETE OR UPDATE ON "public"."parcels" FOR EACH ROW EXECUTE FUNCTION "public"."block_write_without_subscription"();



CREATE OR REPLACE TRIGGER "calculate_parcel_area_trigger" BEFORE INSERT OR UPDATE ON "public"."parcels" FOR EACH ROW EXECUTE FUNCTION "public"."calculate_parcel_area_from_boundary"();



CREATE OR REPLACE TRIGGER "create_metayage_settlement_trigger" AFTER UPDATE ON "public"."harvest_records" FOR EACH ROW WHEN ((("new"."status" = ANY (ARRAY['delivered'::"text", 'sold'::"text"])) AND (("old"."status" IS NULL) OR ("old"."status" <> ALL (ARRAY['delivered'::"text", 'sold'::"text"]))))) EXECUTE FUNCTION "public"."create_metayage_settlement_from_harvest"();



CREATE OR REPLACE TRIGGER "enforce_subscription_creation" BEFORE INSERT ON "public"."subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_unauthorized_subscription_creation"();



CREATE OR REPLACE TRIGGER "enforce_system_admin_permissions_delete" BEFORE DELETE ON "public"."permissions" FOR EACH ROW EXECUTE FUNCTION "public"."check_system_admin_for_reference_tables"();



CREATE OR REPLACE TRIGGER "enforce_system_admin_permissions_insert" BEFORE INSERT ON "public"."permissions" FOR EACH ROW EXECUTE FUNCTION "public"."check_system_admin_for_reference_tables"();



CREATE OR REPLACE TRIGGER "enforce_system_admin_permissions_update" BEFORE UPDATE ON "public"."permissions" FOR EACH ROW EXECUTE FUNCTION "public"."check_system_admin_for_reference_tables"();



CREATE OR REPLACE TRIGGER "enforce_system_admin_roles_delete" BEFORE DELETE ON "public"."roles" FOR EACH ROW EXECUTE FUNCTION "public"."check_system_admin_for_reference_tables"();



CREATE OR REPLACE TRIGGER "enforce_system_admin_roles_insert" BEFORE INSERT ON "public"."roles" FOR EACH ROW EXECUTE FUNCTION "public"."check_system_admin_for_reference_tables"();



CREATE OR REPLACE TRIGGER "enforce_system_admin_roles_update" BEFORE UPDATE ON "public"."roles" FOR EACH ROW EXECUTE FUNCTION "public"."check_system_admin_for_reference_tables"();



CREATE OR REPLACE TRIGGER "ensure_owner_has_admin_role" BEFORE INSERT ON "public"."organization_users" FOR EACH ROW EXECUTE FUNCTION "public"."assign_owner_admin_role"();



CREATE OR REPLACE TRIGGER "generate_delivery_note_number_trigger" BEFORE INSERT ON "public"."deliveries" FOR EACH ROW WHEN (("new"."delivery_note_number" IS NULL)) EXECUTE FUNCTION "public"."generate_delivery_note_number"();



CREATE OR REPLACE TRIGGER "handle_analyses_updated_at" BEFORE UPDATE ON "public"."analyses" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_analysis_recommendations_updated_at" BEFORE UPDATE ON "public"."analysis_recommendations" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_cost_categories" BEFORE UPDATE ON "public"."cost_categories" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_costs" BEFORE UPDATE ON "public"."costs" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_dashboard_settings" BEFORE UPDATE ON "public"."dashboard_settings" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_farm_management_roles" BEFORE UPDATE ON "public"."farm_management_roles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_parcel_reports" BEFORE UPDATE ON "public"."parcel_reports" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_profitability_snapshots" BEFORE UPDATE ON "public"."profitability_snapshots" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_revenues" BEFORE UPDATE ON "public"."revenues" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_roles" BEFORE UPDATE ON "public"."roles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_structures" BEFORE UPDATE ON "public"."structures" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at_utilities" BEFORE UPDATE ON "public"."utilities" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "on_subscription_plan_change" BEFORE INSERT OR UPDATE OF "plan_type" ON "public"."subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."update_subscription_limits"();



CREATE OR REPLACE TRIGGER "payment_record_journal_trigger" AFTER INSERT OR UPDATE OF "status" ON "public"."payment_records" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_create_payment_journal"();



CREATE OR REPLACE TRIGGER "piece_work_payment_link_trigger" BEFORE UPDATE OF "payment_record_id" ON "public"."piece_work_records" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_link_piece_work_to_payment"();



CREATE OR REPLACE TRIGGER "set_item_group_path" BEFORE INSERT OR UPDATE ON "public"."item_groups" FOR EACH ROW EXECUTE FUNCTION "public"."update_item_group_path"();



CREATE OR REPLACE TRIGGER "task_cost_journal_trigger" AFTER INSERT OR UPDATE OF "payment_status" ON "public"."task_costs" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_create_task_cost_journal"();



CREATE OR REPLACE TRIGGER "trg_accounting_payments_updated_at" BEFORE UPDATE ON "public"."accounting_payments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_accounts_updated_at" BEFORE UPDATE ON "public"."accounts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_bank_accounts_updated_at" BEFORE UPDATE ON "public"."bank_accounts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_customers_updated_at" BEFORE UPDATE ON "public"."customers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_invoices_updated_at" BEFORE UPDATE ON "public"."invoices" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_journal_entries_updated_at" BEFORE UPDATE ON "public"."journal_entries" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_purchase_orders_updated_at" BEFORE UPDATE ON "public"."purchase_orders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_quotes_updated_at" BEFORE UPDATE ON "public"."quotes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_sales_orders_updated_at" BEFORE UPDATE ON "public"."sales_orders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_taxes_updated_at" BEFORE UPDATE ON "public"."taxes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_update_invoice_outstanding" AFTER INSERT OR DELETE OR UPDATE ON "public"."payment_allocations" FOR EACH ROW EXECUTE FUNCTION "public"."update_invoice_outstanding"();



CREATE OR REPLACE TRIGGER "trg_update_invoice_totals" AFTER INSERT OR DELETE OR UPDATE ON "public"."invoice_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_invoice_totals"();



CREATE OR REPLACE TRIGGER "trg_validate_journal_balance" AFTER INSERT OR DELETE OR UPDATE ON "public"."journal_items" FOR EACH ROW EXECUTE FUNCTION "public"."validate_journal_balance"();



CREATE OR REPLACE TRIGGER "trigger_auto_create_yield_from_harvest" AFTER INSERT ON "public"."harvests" FOR EACH ROW EXECUTE FUNCTION "public"."auto_create_yield_from_harvest"();



CREATE OR REPLACE TRIGGER "trigger_auto_seed_chart_of_accounts" AFTER INSERT ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."auto_seed_chart_of_accounts"();



CREATE OR REPLACE TRIGGER "trigger_calculate_plant_count" BEFORE INSERT OR UPDATE OF "area", "density_per_hectare" ON "public"."parcels" FOR EACH ROW EXECUTE FUNCTION "public"."calculate_plant_count"();



CREATE OR REPLACE TRIGGER "trigger_ensure_single_default_template" BEFORE INSERT OR UPDATE OF "is_default" ON "public"."document_templates" FOR EACH ROW WHEN (("new"."is_default" = true)) EXECUTE FUNCTION "public"."ensure_single_default_template"();



CREATE OR REPLACE TRIGGER "trigger_reception_batch_status_update" BEFORE INSERT OR UPDATE ON "public"."reception_batches" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_update_reception_batch_status"();



CREATE OR REPLACE TRIGGER "trigger_seed_tree_data_for_new_organization" AFTER INSERT ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."seed_tree_data_for_new_organization"();



CREATE OR REPLACE TRIGGER "trigger_set_lab_order_number" BEFORE INSERT ON "public"."lab_service_orders" FOR EACH ROW EXECUTE FUNCTION "public"."set_lab_order_number"();



CREATE OR REPLACE TRIGGER "trigger_stock_entry_journal" AFTER UPDATE ON "public"."stock_entries" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_create_stock_journal"();



CREATE OR REPLACE TRIGGER "trigger_stock_entry_updated" BEFORE UPDATE ON "public"."stock_entries" FOR EACH ROW EXECUTE FUNCTION "public"."update_stock_entry_timestamp"();



CREATE OR REPLACE TRIGGER "trigger_update_document_template_updated_at" BEFORE UPDATE ON "public"."document_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_document_template_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_lab_orders_timestamp" BEFORE UPDATE ON "public"."lab_service_orders" FOR EACH ROW EXECUTE FUNCTION "public"."update_lab_timestamp"();



CREATE OR REPLACE TRIGGER "trigger_update_lab_recommendations_timestamp" BEFORE UPDATE ON "public"."lab_service_recommendations" FOR EACH ROW EXECUTE FUNCTION "public"."update_lab_timestamp"();



CREATE OR REPLACE TRIGGER "trigger_update_po_on_receipt" AFTER UPDATE ON "public"."stock_entries" FOR EACH ROW WHEN ((("new"."status" = 'Posted'::"text") AND ("new"."entry_type" = 'Material Receipt'::"text"))) EXECUTE FUNCTION "public"."update_po_on_receipt_post"();



CREATE OR REPLACE TRIGGER "trigger_update_so_on_issue" AFTER UPDATE ON "public"."stock_entries" FOR EACH ROW WHEN ((("new"."status" = 'Posted'::"text") AND ("new"."entry_type" = 'Material Issue'::"text"))) EXECUTE FUNCTION "public"."update_so_on_issue_post"();



CREATE OR REPLACE TRIGGER "trigger_update_stock_on_post" BEFORE UPDATE ON "public"."stock_entries" FOR EACH ROW EXECUTE FUNCTION "public"."update_stock_on_entry_post"();



CREATE OR REPLACE TRIGGER "trigger_update_yield_variance" BEFORE INSERT OR UPDATE ON "public"."yield_history" FOR EACH ROW EXECUTE FUNCTION "public"."update_yield_variance"();



CREATE OR REPLACE TRIGGER "update_advance_balance_on_payment" AFTER UPDATE ON "public"."payment_records" FOR EACH ROW WHEN ((("new"."status" = 'paid'::"text") AND (("old"."status" IS NULL) OR ("old"."status" <> 'paid'::"text")))) EXECUTE FUNCTION "public"."update_advance_balance"();



CREATE OR REPLACE TRIGGER "update_deliveries_updated_at" BEFORE UPDATE ON "public"."deliveries" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_delivery_totals_on_items_change" AFTER INSERT OR DELETE OR UPDATE ON "public"."delivery_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_delivery_totals"();



CREATE OR REPLACE TRIGGER "update_farms_updated_at" BEFORE UPDATE ON "public"."farms" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_harvest_on_delivery_item" AFTER INSERT ON "public"."delivery_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_harvest_status_on_delivery"();



CREATE OR REPLACE TRIGGER "update_harvest_on_delivery_status" AFTER UPDATE ON "public"."deliveries" FOR EACH ROW WHEN ((("new"."status" = 'delivered'::"text") AND (("old"."status" IS NULL) OR ("old"."status" <> 'delivered'::"text")))) EXECUTE FUNCTION "public"."update_harvest_status_on_delivery_complete"();



CREATE OR REPLACE TRIGGER "update_harvest_records_updated_at" BEFORE UPDATE ON "public"."harvest_records" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_organization_users_updated_at" BEFORE UPDATE ON "public"."organization_users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_organizations_updated_at" BEFORE UPDATE ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_payment_advances_updated_at" BEFORE UPDATE ON "public"."payment_advances" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_payment_records_updated_at" BEFORE UPDATE ON "public"."payment_records" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_plantation_types_updated_at" BEFORE UPDATE ON "public"."plantation_types" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_satellite_files_updated_at" BEFORE UPDATE ON "public"."satellite_files" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_task_categories_updated_at" BEFORE UPDATE ON "public"."task_categories" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_task_comments_updated_at" BEFORE UPDATE ON "public"."task_comments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_task_costs_timestamp" BEFORE UPDATE ON "public"."task_costs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_task_equipment_updated_at" BEFORE UPDATE ON "public"."task_equipment" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_task_time_logs_updated_at" BEFORE UPDATE ON "public"."task_time_logs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tasks_updated_at" BEFORE UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tree_categories_updated_at" BEFORE UPDATE ON "public"."tree_categories" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_trees_updated_at" BEFORE UPDATE ON "public"."trees" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_profiles_updated_at" BEFORE UPDATE ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_worker_stats_on_task_complete" AFTER UPDATE ON "public"."tasks" FOR EACH ROW WHEN ((("new"."status" = 'completed'::"text") AND (("old"."status" IS NULL) OR ("old"."status" <> 'completed'::"text")))) EXECUTE FUNCTION "public"."update_worker_stats_from_task"();



CREATE OR REPLACE TRIGGER "update_workers_updated_at" BEFORE UPDATE ON "public"."workers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."accounting_payments"
    ADD CONSTRAINT "accounting_payments_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."accounting_payments"
    ADD CONSTRAINT "accounting_payments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."accounting_payments"
    ADD CONSTRAINT "accounting_payments_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "public"."currencies"("code");



ALTER TABLE ONLY "public"."accounting_payments"
    ADD CONSTRAINT "accounting_payments_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."accounting_payments"
    ADD CONSTRAINT "accounting_payments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "public"."currencies"("code");



ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."accounts"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."analyses"
    ADD CONSTRAINT "analyses_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "public"."parcels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."analysis_recommendations"
    ADD CONSTRAINT "analysis_recommendations_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."bank_accounts"
    ADD CONSTRAINT "bank_accounts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."bank_accounts"
    ADD CONSTRAINT "bank_accounts_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "public"."currencies"("code");



ALTER TABLE ONLY "public"."bank_accounts"
    ADD CONSTRAINT "bank_accounts_gl_account_id_fkey" FOREIGN KEY ("gl_account_id") REFERENCES "public"."accounts"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."bank_accounts"
    ADD CONSTRAINT "bank_accounts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cloud_coverage_checks"
    ADD CONSTRAINT "cloud_coverage_checks_aoi_id_fkey" FOREIGN KEY ("aoi_id") REFERENCES "public"."satellite_aois"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cloud_coverage_checks"
    ADD CONSTRAINT "cloud_coverage_checks_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cloud_coverage_checks"
    ADD CONSTRAINT "cloud_coverage_checks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cloud_coverage_checks"
    ADD CONSTRAINT "cloud_coverage_checks_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "public"."parcels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cost_categories"
    ADD CONSTRAINT "cost_categories_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cost_centers"
    ADD CONSTRAINT "cost_centers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."cost_centers"
    ADD CONSTRAINT "cost_centers_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cost_centers"
    ADD CONSTRAINT "cost_centers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cost_centers"
    ADD CONSTRAINT "cost_centers_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "public"."parcels"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cost_centers"
    ADD CONSTRAINT "cost_centers_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."cost_centers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."costs"
    ADD CONSTRAINT "costs_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."cost_categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."costs"
    ADD CONSTRAINT "costs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."costs"
    ADD CONSTRAINT "costs_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."costs"
    ADD CONSTRAINT "costs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."costs"
    ADD CONSTRAINT "costs_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "public"."parcels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crop_categories"
    ADD CONSTRAINT "crop_categories_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "public"."crop_types"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crop_varieties"
    ADD CONSTRAINT "crop_varieties_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."crop_categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crops"
    ADD CONSTRAINT "crops_variety_id_fkey" FOREIGN KEY ("variety_id") REFERENCES "public"."crop_varieties"("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dashboard_settings"
    ADD CONSTRAINT "dashboard_settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dashboard_settings"
    ADD CONSTRAINT "dashboard_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."deliveries"
    ADD CONSTRAINT "deliveries_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."deliveries"
    ADD CONSTRAINT "deliveries_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "public"."workers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."deliveries"
    ADD CONSTRAINT "deliveries_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."deliveries"
    ADD CONSTRAINT "deliveries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."delivery_items"
    ADD CONSTRAINT "delivery_items_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "public"."deliveries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."delivery_items"
    ADD CONSTRAINT "delivery_items_harvest_record_id_fkey" FOREIGN KEY ("harvest_record_id") REFERENCES "public"."harvest_records"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."delivery_tracking"
    ADD CONSTRAINT "delivery_tracking_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "public"."deliveries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."delivery_tracking"
    ADD CONSTRAINT "delivery_tracking_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."document_templates"
    ADD CONSTRAINT "document_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."document_templates"
    ADD CONSTRAINT "document_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."farm_management_roles"
    ADD CONSTRAINT "farm_management_roles_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."farm_management_roles"
    ADD CONSTRAINT "farm_management_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id");



ALTER TABLE ONLY "public"."farm_management_roles"
    ADD CONSTRAINT "farm_management_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."farms"
    ADD CONSTRAINT "farms_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."harvest_forecasts"
    ADD CONSTRAINT "harvest_forecasts_actual_harvest_id_fkey" FOREIGN KEY ("actual_harvest_id") REFERENCES "public"."harvests"("id");



ALTER TABLE ONLY "public"."harvest_forecasts"
    ADD CONSTRAINT "harvest_forecasts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."harvest_forecasts"
    ADD CONSTRAINT "harvest_forecasts_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "public"."currencies"("code");



ALTER TABLE ONLY "public"."harvest_forecasts"
    ADD CONSTRAINT "harvest_forecasts_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."harvest_forecasts"
    ADD CONSTRAINT "harvest_forecasts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."harvest_forecasts"
    ADD CONSTRAINT "harvest_forecasts_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "public"."parcels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."harvest_records"
    ADD CONSTRAINT "harvest_records_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."harvest_records"
    ADD CONSTRAINT "harvest_records_crop_id_fkey" FOREIGN KEY ("crop_id") REFERENCES "public"."crops"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."harvest_records"
    ADD CONSTRAINT "harvest_records_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."harvest_records"
    ADD CONSTRAINT "harvest_records_harvest_task_id_fkey" FOREIGN KEY ("harvest_task_id") REFERENCES "public"."tasks"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."harvest_records"
    ADD CONSTRAINT "harvest_records_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."harvest_records"
    ADD CONSTRAINT "harvest_records_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "public"."parcels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."harvest_records"
    ADD CONSTRAINT "harvest_records_reception_batch_id_fkey" FOREIGN KEY ("reception_batch_id") REFERENCES "public"."reception_batches"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."harvest_records"
    ADD CONSTRAINT "harvest_records_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "public"."workers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."harvests"
    ADD CONSTRAINT "harvests_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."harvests"
    ADD CONSTRAINT "harvests_crop_id_fkey" FOREIGN KEY ("crop_id") REFERENCES "public"."crops"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."harvests"
    ADD CONSTRAINT "harvests_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."harvests"
    ADD CONSTRAINT "harvests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."harvests"
    ADD CONSTRAINT "harvests_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "public"."parcels"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inventory_batches"
    ADD CONSTRAINT "inventory_batches_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_batches"
    ADD CONSTRAINT "inventory_batches_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id");



ALTER TABLE ONLY "public"."inventory_batches"
    ADD CONSTRAINT "inventory_batches_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id");



ALTER TABLE ONLY "public"."inventory"
    ADD CONSTRAINT "inventory_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id");



ALTER TABLE ONLY "public"."inventory_serial_numbers"
    ADD CONSTRAINT "inventory_serial_numbers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_serial_numbers"
    ADD CONSTRAINT "inventory_serial_numbers_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id");



ALTER TABLE ONLY "public"."inventory_serial_numbers"
    ADD CONSTRAINT "inventory_serial_numbers_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id");



ALTER TABLE ONLY "public"."inventory_serial_numbers"
    ADD CONSTRAINT "inventory_serial_numbers_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id");



ALTER TABLE ONLY "public"."inventory"
    ADD CONSTRAINT "inventory_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "public"."product_subcategories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inventory"
    ADD CONSTRAINT "inventory_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inventory"
    ADD CONSTRAINT "inventory_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoice_items"
    ADD CONSTRAINT "invoice_items_expense_account_id_fkey" FOREIGN KEY ("expense_account_id") REFERENCES "public"."accounts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoice_items"
    ADD CONSTRAINT "invoice_items_income_account_id_fkey" FOREIGN KEY ("income_account_id") REFERENCES "public"."accounts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoice_items"
    ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoice_items"
    ADD CONSTRAINT "invoice_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoice_items"
    ADD CONSTRAINT "invoice_items_tax_id_fkey" FOREIGN KEY ("tax_id") REFERENCES "public"."taxes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "public"."currencies"("code");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "public"."parcels"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_sales_order_id_fkey" FOREIGN KEY ("sales_order_id") REFERENCES "public"."sales_orders"("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."item_customer_details"
    ADD CONSTRAINT "item_customer_details_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."item_customer_details"
    ADD CONSTRAINT "item_customer_details_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."item_groups"
    ADD CONSTRAINT "item_groups_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."item_groups"
    ADD CONSTRAINT "item_groups_default_cost_center_id_fkey" FOREIGN KEY ("default_cost_center_id") REFERENCES "public"."cost_centers"("id");



ALTER TABLE ONLY "public"."item_groups"
    ADD CONSTRAINT "item_groups_default_expense_account_id_fkey" FOREIGN KEY ("default_expense_account_id") REFERENCES "public"."accounts"("id");



ALTER TABLE ONLY "public"."item_groups"
    ADD CONSTRAINT "item_groups_default_sales_account_id_fkey" FOREIGN KEY ("default_sales_account_id") REFERENCES "public"."accounts"("id");



ALTER TABLE ONLY "public"."item_groups"
    ADD CONSTRAINT "item_groups_default_tax_id_fkey" FOREIGN KEY ("default_tax_id") REFERENCES "public"."taxes"("id");



ALTER TABLE ONLY "public"."item_groups"
    ADD CONSTRAINT "item_groups_default_warehouse_id_fkey" FOREIGN KEY ("default_warehouse_id") REFERENCES "public"."warehouses"("id");



ALTER TABLE ONLY "public"."item_groups"
    ADD CONSTRAINT "item_groups_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."item_groups"
    ADD CONSTRAINT "item_groups_parent_group_id_fkey" FOREIGN KEY ("parent_group_id") REFERENCES "public"."item_groups"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."item_groups"
    ADD CONSTRAINT "item_groups_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."item_prices"
    ADD CONSTRAINT "item_prices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."item_prices"
    ADD CONSTRAINT "item_prices_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."item_prices"
    ADD CONSTRAINT "item_prices_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."item_prices"
    ADD CONSTRAINT "item_prices_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id");



ALTER TABLE ONLY "public"."item_supplier_details"
    ADD CONSTRAINT "item_supplier_details_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."item_supplier_details"
    ADD CONSTRAINT "item_supplier_details_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."item_unit_conversions"
    ADD CONSTRAINT "item_unit_conversions_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."item_variants"
    ADD CONSTRAINT "item_variants_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."items"
    ADD CONSTRAINT "items_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."items"
    ADD CONSTRAINT "items_default_cost_center_id_fkey" FOREIGN KEY ("default_cost_center_id") REFERENCES "public"."cost_centers"("id");



ALTER TABLE ONLY "public"."items"
    ADD CONSTRAINT "items_default_expense_account_id_fkey" FOREIGN KEY ("default_expense_account_id") REFERENCES "public"."accounts"("id");



ALTER TABLE ONLY "public"."items"
    ADD CONSTRAINT "items_default_sales_account_id_fkey" FOREIGN KEY ("default_sales_account_id") REFERENCES "public"."accounts"("id");



ALTER TABLE ONLY "public"."items"
    ADD CONSTRAINT "items_default_warehouse_id_fkey" FOREIGN KEY ("default_warehouse_id") REFERENCES "public"."warehouses"("id");



ALTER TABLE ONLY "public"."items"
    ADD CONSTRAINT "items_item_group_id_fkey" FOREIGN KEY ("item_group_id") REFERENCES "public"."item_groups"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."items"
    ADD CONSTRAINT "items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."items"
    ADD CONSTRAINT "items_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."journal_entries"
    ADD CONSTRAINT "journal_entries_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."journal_entries"
    ADD CONSTRAINT "journal_entries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."journal_entries"
    ADD CONSTRAINT "journal_entries_posted_by_fkey" FOREIGN KEY ("posted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."journal_items"
    ADD CONSTRAINT "journal_items_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."journal_items"
    ADD CONSTRAINT "journal_items_cost_center_id_fkey" FOREIGN KEY ("cost_center_id") REFERENCES "public"."cost_centers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."journal_items"
    ADD CONSTRAINT "journal_items_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."journal_items"
    ADD CONSTRAINT "journal_items_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."journal_items"
    ADD CONSTRAINT "journal_items_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "public"."parcels"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."lab_result_parameters"
    ADD CONSTRAINT "lab_result_parameters_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."lab_service_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lab_service_orders"
    ADD CONSTRAINT "lab_service_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user_profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."lab_service_orders"
    ADD CONSTRAINT "lab_service_orders_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."lab_service_orders"
    ADD CONSTRAINT "lab_service_orders_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lab_service_orders"
    ADD CONSTRAINT "lab_service_orders_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "public"."parcels"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."lab_service_orders"
    ADD CONSTRAINT "lab_service_orders_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."lab_service_providers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."lab_service_orders"
    ADD CONSTRAINT "lab_service_orders_sample_collected_by_fkey" FOREIGN KEY ("sample_collected_by") REFERENCES "public"."user_profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."lab_service_orders"
    ADD CONSTRAINT "lab_service_orders_service_type_id_fkey" FOREIGN KEY ("service_type_id") REFERENCES "public"."lab_service_types"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."lab_service_recommendations"
    ADD CONSTRAINT "lab_service_recommendations_implemented_by_fkey" FOREIGN KEY ("implemented_by") REFERENCES "public"."user_profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."lab_service_recommendations"
    ADD CONSTRAINT "lab_service_recommendations_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."lab_service_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lab_service_recommendations"
    ADD CONSTRAINT "lab_service_recommendations_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "public"."parcels"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."lab_service_types"
    ADD CONSTRAINT "lab_service_types_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."lab_service_providers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."metayage_settlements"
    ADD CONSTRAINT "metayage_settlements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."metayage_settlements"
    ADD CONSTRAINT "metayage_settlements_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."metayage_settlements"
    ADD CONSTRAINT "metayage_settlements_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "public"."parcels"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."metayage_settlements"
    ADD CONSTRAINT "metayage_settlements_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."opening_stock_balances"
    ADD CONSTRAINT "opening_stock_balances_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."opening_stock_balances"
    ADD CONSTRAINT "opening_stock_balances_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."opening_stock_balances"
    ADD CONSTRAINT "opening_stock_balances_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."opening_stock_balances"
    ADD CONSTRAINT "opening_stock_balances_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."opening_stock_balances"
    ADD CONSTRAINT "opening_stock_balances_posted_by_fkey" FOREIGN KEY ("posted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."opening_stock_balances"
    ADD CONSTRAINT "opening_stock_balances_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_users"
    ADD CONSTRAINT "organization_users_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."organization_users"
    ADD CONSTRAINT "organization_users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_users"
    ADD CONSTRAINT "organization_users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id");



ALTER TABLE ONLY "public"."organization_users"
    ADD CONSTRAINT "organization_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."parcel_reports"
    ADD CONSTRAINT "parcel_reports_generated_by_fkey" FOREIGN KEY ("generated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."parcel_reports"
    ADD CONSTRAINT "parcel_reports_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "public"."parcels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_advances"
    ADD CONSTRAINT "payment_advances_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."payment_advances"
    ADD CONSTRAINT "payment_advances_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_advances"
    ADD CONSTRAINT "payment_advances_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_advances"
    ADD CONSTRAINT "payment_advances_paid_by_fkey" FOREIGN KEY ("paid_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."payment_advances"
    ADD CONSTRAINT "payment_advances_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_allocations"
    ADD CONSTRAINT "payment_allocations_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."payment_allocations"
    ADD CONSTRAINT "payment_allocations_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."accounting_payments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_bonuses"
    ADD CONSTRAINT "payment_bonuses_payment_record_id_fkey" FOREIGN KEY ("payment_record_id") REFERENCES "public"."payment_records"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_deductions"
    ADD CONSTRAINT "payment_deductions_payment_record_id_fkey" FOREIGN KEY ("payment_record_id") REFERENCES "public"."payment_records"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_records"
    ADD CONSTRAINT "payment_records_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."payment_records"
    ADD CONSTRAINT "payment_records_calculated_by_fkey" FOREIGN KEY ("calculated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."payment_records"
    ADD CONSTRAINT "payment_records_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_records"
    ADD CONSTRAINT "payment_records_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_records"
    ADD CONSTRAINT "payment_records_paid_by_fkey" FOREIGN KEY ("paid_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."payment_records"
    ADD CONSTRAINT "payment_records_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."performance_alerts"
    ADD CONSTRAINT "performance_alerts_acknowledged_by_fkey" FOREIGN KEY ("acknowledged_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."performance_alerts"
    ADD CONSTRAINT "performance_alerts_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."performance_alerts"
    ADD CONSTRAINT "performance_alerts_forecast_id_fkey" FOREIGN KEY ("forecast_id") REFERENCES "public"."harvest_forecasts"("id");



ALTER TABLE ONLY "public"."performance_alerts"
    ADD CONSTRAINT "performance_alerts_harvest_id_fkey" FOREIGN KEY ("harvest_id") REFERENCES "public"."harvests"("id");



ALTER TABLE ONLY "public"."performance_alerts"
    ADD CONSTRAINT "performance_alerts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."performance_alerts"
    ADD CONSTRAINT "performance_alerts_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "public"."parcels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."performance_alerts"
    ADD CONSTRAINT "performance_alerts_yield_history_id_fkey" FOREIGN KEY ("yield_history_id") REFERENCES "public"."yield_history"("id");



ALTER TABLE ONLY "public"."piece_work_records"
    ADD CONSTRAINT "piece_work_records_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."piece_work_records"
    ADD CONSTRAINT "piece_work_records_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."piece_work_records"
    ADD CONSTRAINT "piece_work_records_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."piece_work_records"
    ADD CONSTRAINT "piece_work_records_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "public"."parcels"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."piece_work_records"
    ADD CONSTRAINT "piece_work_records_payment_record_id_fkey" FOREIGN KEY ("payment_record_id") REFERENCES "public"."payment_records"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."piece_work_records"
    ADD CONSTRAINT "piece_work_records_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."piece_work_records"
    ADD CONSTRAINT "piece_work_records_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."piece_work_records"
    ADD CONSTRAINT "piece_work_records_work_unit_id_fkey" FOREIGN KEY ("work_unit_id") REFERENCES "public"."work_units"("id");



ALTER TABLE ONLY "public"."piece_work_records"
    ADD CONSTRAINT "piece_work_records_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."plantation_types"
    ADD CONSTRAINT "plantation_types_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_subcategories"
    ADD CONSTRAINT "product_subcategories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profitability_snapshots"
    ADD CONSTRAINT "profitability_snapshots_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profitability_snapshots"
    ADD CONSTRAINT "profitability_snapshots_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profitability_snapshots"
    ADD CONSTRAINT "profitability_snapshots_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "public"."parcels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."purchase_order_items"
    ADD CONSTRAINT "purchase_order_items_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id");



ALTER TABLE ONLY "public"."purchase_order_items"
    ADD CONSTRAINT "purchase_order_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."purchase_order_items"
    ADD CONSTRAINT "purchase_order_items_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."purchase_order_items"
    ADD CONSTRAINT "purchase_order_items_tax_id_fkey" FOREIGN KEY ("tax_id") REFERENCES "public"."taxes"("id");



ALTER TABLE ONLY "public"."purchase_orders"
    ADD CONSTRAINT "purchase_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."purchase_orders"
    ADD CONSTRAINT "purchase_orders_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "public"."currencies"("code");



ALTER TABLE ONLY "public"."purchase_orders"
    ADD CONSTRAINT "purchase_orders_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."purchase_orders"
    ADD CONSTRAINT "purchase_orders_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."purchase_orders"
    ADD CONSTRAINT "purchase_orders_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "public"."parcels"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."purchase_orders"
    ADD CONSTRAINT "purchase_orders_stock_entry_id_fkey" FOREIGN KEY ("stock_entry_id") REFERENCES "public"."stock_entries"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."purchase_orders"
    ADD CONSTRAINT "purchase_orders_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."purchase_orders"
    ADD CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."quote_items"
    ADD CONSTRAINT "quote_items_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id");



ALTER TABLE ONLY "public"."quote_items"
    ADD CONSTRAINT "quote_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."quote_items"
    ADD CONSTRAINT "quote_items_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quote_items"
    ADD CONSTRAINT "quote_items_tax_id_fkey" FOREIGN KEY ("tax_id") REFERENCES "public"."taxes"("id");



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_converted_by_fkey" FOREIGN KEY ("converted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "public"."currencies"("code");



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "public"."parcels"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_sent_by_fkey" FOREIGN KEY ("sent_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."reception_batches"
    ADD CONSTRAINT "reception_batches_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."reception_batches"
    ADD CONSTRAINT "reception_batches_crop_id_fkey" FOREIGN KEY ("crop_id") REFERENCES "public"."crops"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reception_batches"
    ADD CONSTRAINT "reception_batches_destination_warehouse_id_fkey" FOREIGN KEY ("destination_warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reception_batches"
    ADD CONSTRAINT "reception_batches_harvest_id_fkey" FOREIGN KEY ("harvest_id") REFERENCES "public"."harvest_records"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reception_batches"
    ADD CONSTRAINT "reception_batches_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reception_batches"
    ADD CONSTRAINT "reception_batches_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "public"."parcels"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."reception_batches"
    ADD CONSTRAINT "reception_batches_quality_checked_by_fkey" FOREIGN KEY ("quality_checked_by") REFERENCES "public"."workers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reception_batches"
    ADD CONSTRAINT "reception_batches_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "public"."workers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reception_batches"
    ADD CONSTRAINT "reception_batches_sales_order_id_fkey" FOREIGN KEY ("sales_order_id") REFERENCES "public"."sales_orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reception_batches"
    ADD CONSTRAINT "reception_batches_stock_entry_id_fkey" FOREIGN KEY ("stock_entry_id") REFERENCES "public"."stock_entries"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reception_batches"
    ADD CONSTRAINT "reception_batches_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."reception_batches"
    ADD CONSTRAINT "reception_batches_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."revenues"
    ADD CONSTRAINT "revenues_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."revenues"
    ADD CONSTRAINT "revenues_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."revenues"
    ADD CONSTRAINT "revenues_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."revenues"
    ADD CONSTRAINT "revenues_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "public"."parcels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."role_assignments_audit"
    ADD CONSTRAINT "role_assignments_audit_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."role_assignments_audit"
    ADD CONSTRAINT "role_assignments_audit_new_role_id_fkey" FOREIGN KEY ("new_role_id") REFERENCES "public"."roles"("id");



ALTER TABLE ONLY "public"."role_assignments_audit"
    ADD CONSTRAINT "role_assignments_audit_old_role_id_fkey" FOREIGN KEY ("old_role_id") REFERENCES "public"."roles"("id");



ALTER TABLE ONLY "public"."role_assignments_audit"
    ADD CONSTRAINT "role_assignments_audit_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."role_assignments_audit"
    ADD CONSTRAINT "role_assignments_audit_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."role_templates"
    ADD CONSTRAINT "role_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."role_templates"
    ADD CONSTRAINT "role_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sales_order_items"
    ADD CONSTRAINT "sales_order_items_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id");



ALTER TABLE ONLY "public"."sales_order_items"
    ADD CONSTRAINT "sales_order_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sales_order_items"
    ADD CONSTRAINT "sales_order_items_sales_order_id_fkey" FOREIGN KEY ("sales_order_id") REFERENCES "public"."sales_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sales_order_items"
    ADD CONSTRAINT "sales_order_items_tax_id_fkey" FOREIGN KEY ("tax_id") REFERENCES "public"."taxes"("id");



ALTER TABLE ONLY "public"."sales_orders"
    ADD CONSTRAINT "sales_orders_confirmed_by_fkey" FOREIGN KEY ("confirmed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."sales_orders"
    ADD CONSTRAINT "sales_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."sales_orders"
    ADD CONSTRAINT "sales_orders_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "public"."currencies"("code");



ALTER TABLE ONLY "public"."sales_orders"
    ADD CONSTRAINT "sales_orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."sales_orders"
    ADD CONSTRAINT "sales_orders_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sales_orders"
    ADD CONSTRAINT "sales_orders_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sales_orders"
    ADD CONSTRAINT "sales_orders_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "public"."parcels"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sales_orders"
    ADD CONSTRAINT "sales_orders_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id");



ALTER TABLE ONLY "public"."sales_orders"
    ADD CONSTRAINT "sales_orders_stock_entry_id_fkey" FOREIGN KEY ("stock_entry_id") REFERENCES "public"."stock_entries"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sample_collection_schedules"
    ADD CONSTRAINT "sample_collection_schedules_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."user_profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sample_collection_schedules"
    ADD CONSTRAINT "sample_collection_schedules_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sample_collection_schedules"
    ADD CONSTRAINT "sample_collection_schedules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sample_collection_schedules"
    ADD CONSTRAINT "sample_collection_schedules_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "public"."parcels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sample_collection_schedules"
    ADD CONSTRAINT "sample_collection_schedules_service_type_id_fkey" FOREIGN KEY ("service_type_id") REFERENCES "public"."lab_service_types"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."satellite_aois"
    ADD CONSTRAINT "satellite_aois_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."satellite_aois"
    ADD CONSTRAINT "satellite_aois_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."satellite_aois"
    ADD CONSTRAINT "satellite_aois_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "public"."parcels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."satellite_files"
    ADD CONSTRAINT "satellite_files_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."satellite_files"
    ADD CONSTRAINT "satellite_files_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "public"."parcels"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."satellite_indices_data"
    ADD CONSTRAINT "satellite_indices_data_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."satellite_indices_data"
    ADD CONSTRAINT "satellite_indices_data_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."satellite_indices_data"
    ADD CONSTRAINT "satellite_indices_data_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "public"."parcels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."satellite_indices_data"
    ADD CONSTRAINT "satellite_indices_data_processing_job_id_fkey" FOREIGN KEY ("processing_job_id") REFERENCES "public"."satellite_processing_jobs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."satellite_processing_jobs"
    ADD CONSTRAINT "satellite_processing_jobs_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."satellite_processing_jobs"
    ADD CONSTRAINT "satellite_processing_jobs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."satellite_processing_jobs"
    ADD CONSTRAINT "satellite_processing_jobs_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "public"."parcels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."satellite_processing_tasks"
    ADD CONSTRAINT "satellite_processing_tasks_aoi_id_fkey" FOREIGN KEY ("aoi_id") REFERENCES "public"."satellite_aois"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."satellite_processing_tasks"
    ADD CONSTRAINT "satellite_processing_tasks_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."satellite_processing_tasks"
    ADD CONSTRAINT "satellite_processing_tasks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."satellite_processing_tasks"
    ADD CONSTRAINT "satellite_processing_tasks_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "public"."parcels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."satellite_processing_tasks"
    ADD CONSTRAINT "satellite_processing_tasks_processing_job_id_fkey" FOREIGN KEY ("processing_job_id") REFERENCES "public"."satellite_processing_jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."soil_analyses"
    ADD CONSTRAINT "soil_analyses_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "public"."parcels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_account_mappings"
    ADD CONSTRAINT "stock_account_mappings_credit_account_id_fkey" FOREIGN KEY ("credit_account_id") REFERENCES "public"."accounts"("id");



ALTER TABLE ONLY "public"."stock_account_mappings"
    ADD CONSTRAINT "stock_account_mappings_debit_account_id_fkey" FOREIGN KEY ("debit_account_id") REFERENCES "public"."accounts"("id");



ALTER TABLE ONLY "public"."stock_account_mappings"
    ADD CONSTRAINT "stock_account_mappings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_closing_entries"
    ADD CONSTRAINT "stock_closing_entries_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."stock_closing_entries"
    ADD CONSTRAINT "stock_closing_entries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_closing_entries"
    ADD CONSTRAINT "stock_closing_entries_posted_by_fkey" FOREIGN KEY ("posted_by") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."stock_closing_items"
    ADD CONSTRAINT "stock_closing_items_closing_id_fkey" FOREIGN KEY ("closing_id") REFERENCES "public"."stock_closing_entries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_closing_items"
    ADD CONSTRAINT "stock_closing_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_closing_items"
    ADD CONSTRAINT "stock_closing_items_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id");



ALTER TABLE ONLY "public"."stock_entries"
    ADD CONSTRAINT "stock_entries_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."stock_entries"
    ADD CONSTRAINT "stock_entries_from_warehouse_id_fkey" FOREIGN KEY ("from_warehouse_id") REFERENCES "public"."warehouses"("id");



ALTER TABLE ONLY "public"."stock_entries"
    ADD CONSTRAINT "stock_entries_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."stock_entries"
    ADD CONSTRAINT "stock_entries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_entries"
    ADD CONSTRAINT "stock_entries_posted_by_fkey" FOREIGN KEY ("posted_by") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."stock_entries"
    ADD CONSTRAINT "stock_entries_reception_batch_id_fkey" FOREIGN KEY ("reception_batch_id") REFERENCES "public"."reception_batches"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."stock_entries"
    ADD CONSTRAINT "stock_entries_to_warehouse_id_fkey" FOREIGN KEY ("to_warehouse_id") REFERENCES "public"."warehouses"("id");



ALTER TABLE ONLY "public"."stock_entries"
    ADD CONSTRAINT "stock_entries_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."stock_entry_items"
    ADD CONSTRAINT "stock_entry_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."stock_entry_items"
    ADD CONSTRAINT "stock_entry_items_source_warehouse_id_fkey" FOREIGN KEY ("source_warehouse_id") REFERENCES "public"."warehouses"("id");



ALTER TABLE ONLY "public"."stock_entry_items"
    ADD CONSTRAINT "stock_entry_items_stock_entry_id_fkey" FOREIGN KEY ("stock_entry_id") REFERENCES "public"."stock_entries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_entry_items"
    ADD CONSTRAINT "stock_entry_items_target_warehouse_id_fkey" FOREIGN KEY ("target_warehouse_id") REFERENCES "public"."warehouses"("id");



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_stock_entry_id_fkey" FOREIGN KEY ("stock_entry_id") REFERENCES "public"."stock_entries"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_stock_entry_item_id_fkey" FOREIGN KEY ("stock_entry_item_id") REFERENCES "public"."stock_entry_items"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id");



ALTER TABLE ONLY "public"."stock_valuation"
    ADD CONSTRAINT "stock_valuation_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_valuation"
    ADD CONSTRAINT "stock_valuation_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_valuation"
    ADD CONSTRAINT "stock_valuation_stock_entry_id_fkey" FOREIGN KEY ("stock_entry_id") REFERENCES "public"."stock_entries"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."stock_valuation"
    ADD CONSTRAINT "stock_valuation_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."structures"
    ADD CONSTRAINT "structures_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."structures"
    ADD CONSTRAINT "structures_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscription_usage"
    ADD CONSTRAINT "subscription_usage_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscription_usage"
    ADD CONSTRAINT "subscription_usage_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_categories"
    ADD CONSTRAINT "task_categories_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_comments"
    ADD CONSTRAINT "task_comments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_comments"
    ADD CONSTRAINT "task_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_comments"
    ADD CONSTRAINT "task_comments_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."task_costs"
    ADD CONSTRAINT "task_costs_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id");



ALTER TABLE ONLY "public"."task_costs"
    ADD CONSTRAINT "task_costs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."task_costs"
    ADD CONSTRAINT "task_costs_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entries"("id");



ALTER TABLE ONLY "public"."task_costs"
    ADD CONSTRAINT "task_costs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_costs"
    ADD CONSTRAINT "task_costs_piece_work_record_id_fkey" FOREIGN KEY ("piece_work_record_id") REFERENCES "public"."piece_work_records"("id");



ALTER TABLE ONLY "public"."task_costs"
    ADD CONSTRAINT "task_costs_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_costs"
    ADD CONSTRAINT "task_costs_work_unit_id_fkey" FOREIGN KEY ("work_unit_id") REFERENCES "public"."work_units"("id");



ALTER TABLE ONLY "public"."task_costs"
    ADD CONSTRAINT "task_costs_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id");



ALTER TABLE ONLY "public"."task_dependencies"
    ADD CONSTRAINT "task_dependencies_depends_on_task_id_fkey" FOREIGN KEY ("depends_on_task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_dependencies"
    ADD CONSTRAINT "task_dependencies_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_equipment"
    ADD CONSTRAINT "task_equipment_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_time_logs"
    ADD CONSTRAINT "task_time_logs_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_time_logs"
    ADD CONSTRAINT "task_time_logs_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."workers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_crop_id_fkey" FOREIGN KEY ("crop_id") REFERENCES "public"."crops"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "public"."parcels"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_parent_task_id_fkey" FOREIGN KEY ("parent_task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."task_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_work_unit_id_fkey" FOREIGN KEY ("work_unit_id") REFERENCES "public"."work_units"("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."taxes"
    ADD CONSTRAINT "taxes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."taxes"
    ADD CONSTRAINT "taxes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."taxes"
    ADD CONSTRAINT "taxes_purchase_account_id_fkey" FOREIGN KEY ("purchase_account_id") REFERENCES "public"."accounts"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."taxes"
    ADD CONSTRAINT "taxes_sales_account_id_fkey" FOREIGN KEY ("sales_account_id") REFERENCES "public"."accounts"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."tree_categories"
    ADD CONSTRAINT "tree_categories_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trees"
    ADD CONSTRAINT "trees_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."tree_categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."utilities"
    ADD CONSTRAINT "utilities_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."utilities"
    ADD CONSTRAINT "utilities_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "public"."parcels"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."warehouses"
    ADD CONSTRAINT "warehouses_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."warehouses"
    ADD CONSTRAINT "warehouses_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."work_units"
    ADD CONSTRAINT "work_units_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."work_units"
    ADD CONSTRAINT "work_units_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workers"
    ADD CONSTRAINT "workers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."workers"
    ADD CONSTRAINT "workers_default_work_unit_id_fkey" FOREIGN KEY ("default_work_unit_id") REFERENCES "public"."work_units"("id");



ALTER TABLE ONLY "public"."workers"
    ADD CONSTRAINT "workers_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."workers"
    ADD CONSTRAINT "workers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workers"
    ADD CONSTRAINT "workers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."yield_benchmarks"
    ADD CONSTRAINT "yield_benchmarks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."yield_benchmarks"
    ADD CONSTRAINT "yield_benchmarks_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."yield_benchmarks"
    ADD CONSTRAINT "yield_benchmarks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."yield_benchmarks"
    ADD CONSTRAINT "yield_benchmarks_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "public"."parcels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."yield_history"
    ADD CONSTRAINT "yield_history_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."yield_history"
    ADD CONSTRAINT "yield_history_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "public"."currencies"("code");



ALTER TABLE ONLY "public"."yield_history"
    ADD CONSTRAINT "yield_history_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."yield_history"
    ADD CONSTRAINT "yield_history_harvest_id_fkey" FOREIGN KEY ("harvest_id") REFERENCES "public"."harvests"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."yield_history"
    ADD CONSTRAINT "yield_history_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."yield_history"
    ADD CONSTRAINT "yield_history_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "public"."parcels"("id") ON DELETE CASCADE;



CREATE POLICY "Admins and managers can create document templates" ON "public"."document_templates" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "ou"."organization_id"
   FROM ("public"."organization_users" "ou"
     JOIN "public"."roles" "r" ON (("r"."id" = "ou"."role_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("r"."name" = ANY (ARRAY['organization_admin'::"text", 'farm_manager'::"text", 'system_admin'::"text"]))))));



CREATE POLICY "Admins and managers can create payments" ON "public"."payment_records" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "ou"."organization_id"
   FROM ("public"."organization_users" "ou"
     JOIN "public"."roles" "r" ON (("r"."id" = "ou"."role_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."is_active" = true) AND ("r"."name" = ANY (ARRAY['system_admin'::"text", 'organization_admin'::"text", 'farm_manager'::"text"]))))));



CREATE POLICY "Admins and managers can delete plantation types" ON "public"."plantation_types" FOR DELETE USING (("organization_id" IN ( SELECT "ou"."organization_id"
   FROM ("public"."organization_users" "ou"
     JOIN "public"."roles" "r" ON (("r"."id" = "ou"."role_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."is_active" = true) AND ("r"."name" = ANY (ARRAY['organization_admin'::"text", 'farm_manager'::"text"]))))));



CREATE POLICY "Admins and managers can delete tree categories" ON "public"."tree_categories" FOR DELETE USING (("organization_id" IN ( SELECT "ou"."organization_id"
   FROM ("public"."organization_users" "ou"
     JOIN "public"."roles" "r" ON (("r"."id" = "ou"."role_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."is_active" = true) AND ("r"."name" = ANY (ARRAY['organization_admin'::"text", 'farm_manager'::"text"]))))));



CREATE POLICY "Admins and managers can delete trees" ON "public"."trees" FOR DELETE USING (("category_id" IN ( SELECT "tree_categories"."id"
   FROM (("public"."tree_categories"
     JOIN "public"."organization_users" "ou" ON (("tree_categories"."organization_id" = "ou"."organization_id")))
     JOIN "public"."roles" "r" ON (("r"."id" = "ou"."role_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."is_active" = true) AND ("r"."name" = ANY (ARRAY['organization_admin'::"text", 'farm_manager'::"text"]))))));



CREATE POLICY "Admins and managers can insert plantation types" ON "public"."plantation_types" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "ou"."organization_id"
   FROM ("public"."organization_users" "ou"
     JOIN "public"."roles" "r" ON (("r"."id" = "ou"."role_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."is_active" = true) AND ("r"."name" = ANY (ARRAY['organization_admin'::"text", 'farm_manager'::"text"]))))));



CREATE POLICY "Admins and managers can insert tree categories" ON "public"."tree_categories" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "ou"."organization_id"
   FROM ("public"."organization_users" "ou"
     JOIN "public"."roles" "r" ON (("r"."id" = "ou"."role_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."is_active" = true) AND ("r"."name" = ANY (ARRAY['organization_admin'::"text", 'farm_manager'::"text"]))))));



CREATE POLICY "Admins and managers can insert trees" ON "public"."trees" FOR INSERT WITH CHECK (("category_id" IN ( SELECT "tree_categories"."id"
   FROM (("public"."tree_categories"
     JOIN "public"."organization_users" "ou" ON (("tree_categories"."organization_id" = "ou"."organization_id")))
     JOIN "public"."roles" "r" ON (("r"."id" = "ou"."role_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."is_active" = true) AND ("r"."name" = ANY (ARRAY['organization_admin'::"text", 'farm_manager'::"text"]))))));



CREATE POLICY "Admins and managers can manage work records" ON "public"."work_records" USING (("worker_id" IN ( SELECT "w"."id"
   FROM (("public"."workers" "w"
     JOIN "public"."organization_users" "ou" ON (("ou"."organization_id" = "w"."organization_id")))
     JOIN "public"."roles" "r" ON (("r"."id" = "ou"."role_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."is_active" = true) AND ("r"."name" = ANY (ARRAY['system_admin'::"text", 'organization_admin'::"text", 'farm_manager'::"text"]))))));



CREATE POLICY "Admins and managers can manage workers" ON "public"."workers" USING ((EXISTS ( SELECT 1
   FROM ("public"."organization_users" "ou"
     JOIN "public"."roles" "r" ON (("r"."id" = "ou"."role_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."organization_id" = "workers"."organization_id") AND ("ou"."is_active" = true) AND ("r"."name" = ANY (ARRAY['system_admin'::"text", 'organization_admin'::"text", 'farm_manager'::"text"]))))));



CREATE POLICY "Admins and managers can update document templates" ON "public"."document_templates" FOR UPDATE USING (("organization_id" IN ( SELECT "ou"."organization_id"
   FROM ("public"."organization_users" "ou"
     JOIN "public"."roles" "r" ON (("r"."id" = "ou"."role_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("r"."name" = ANY (ARRAY['organization_admin'::"text", 'farm_manager'::"text", 'system_admin'::"text"]))))));



CREATE POLICY "Admins and managers can update payments" ON "public"."payment_records" FOR UPDATE USING (("organization_id" IN ( SELECT "ou"."organization_id"
   FROM ("public"."organization_users" "ou"
     JOIN "public"."roles" "r" ON (("r"."id" = "ou"."role_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."is_active" = true) AND ("r"."name" = ANY (ARRAY['system_admin'::"text", 'organization_admin'::"text", 'farm_manager'::"text"]))))));



CREATE POLICY "Admins and managers can update plantation types" ON "public"."plantation_types" FOR UPDATE USING (("organization_id" IN ( SELECT "ou"."organization_id"
   FROM ("public"."organization_users" "ou"
     JOIN "public"."roles" "r" ON (("r"."id" = "ou"."role_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."is_active" = true) AND ("r"."name" = ANY (ARRAY['organization_admin'::"text", 'farm_manager'::"text"]))))));



CREATE POLICY "Admins and managers can update tree categories" ON "public"."tree_categories" FOR UPDATE USING (("organization_id" IN ( SELECT "ou"."organization_id"
   FROM ("public"."organization_users" "ou"
     JOIN "public"."roles" "r" ON (("r"."id" = "ou"."role_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."is_active" = true) AND ("r"."name" = ANY (ARRAY['organization_admin'::"text", 'farm_manager'::"text"]))))));



CREATE POLICY "Admins and managers can update trees" ON "public"."trees" FOR UPDATE USING (("category_id" IN ( SELECT "tree_categories"."id"
   FROM (("public"."tree_categories"
     JOIN "public"."organization_users" "ou" ON (("tree_categories"."organization_id" = "ou"."organization_id")))
     JOIN "public"."roles" "r" ON (("r"."id" = "ou"."role_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."is_active" = true) AND ("r"."name" = ANY (ARRAY['organization_admin'::"text", 'farm_manager'::"text"]))))));



CREATE POLICY "Admins can delete costs" ON "public"."task_costs" FOR DELETE USING (("organization_id" IN ( SELECT "ou"."organization_id"
   FROM ("public"."organization_users" "ou"
     JOIN "public"."roles" "r" ON (("ou"."role_id" = "r"."id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."is_active" = true) AND ("r"."level" <= 2)))));



CREATE POLICY "Admins can delete document templates" ON "public"."document_templates" FOR DELETE USING (("organization_id" IN ( SELECT "ou"."organization_id"
   FROM ("public"."organization_users" "ou"
     JOIN "public"."roles" "r" ON (("r"."id" = "ou"."role_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("r"."name" = ANY (ARRAY['organization_admin'::"text", 'system_admin'::"text"]))))));



CREATE POLICY "Admins can manage closings in their organization" ON "public"."stock_closing_entries" USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Admins can manage profitability snapshots" ON "public"."profitability_snapshots" USING ((EXISTS ( SELECT 1
   FROM ("public"."organization_users" "ou"
     JOIN "public"."roles" "r" ON (("r"."id" = "ou"."role_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."organization_id" = "profitability_snapshots"."organization_id") AND ("r"."level" <= 2)))));



CREATE POLICY "Admins can manage settlements" ON "public"."metayage_settlements" USING (("worker_id" IN ( SELECT "w"."id"
   FROM (("public"."workers" "w"
     JOIN "public"."organization_users" "ou" ON (("ou"."organization_id" = "w"."organization_id")))
     JOIN "public"."roles" "r" ON (("r"."id" = "ou"."role_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."is_active" = true) AND ("r"."name" = ANY (ARRAY['system_admin'::"text", 'organization_admin'::"text"]))))));



CREATE POLICY "Admins can manage task categories" ON "public"."task_categories" USING (("organization_id" IN ( SELECT "ou"."organization_id"
   FROM ("public"."organization_users" "ou"
     JOIN "public"."roles" "r" ON (("r"."id" = "ou"."role_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."is_active" = true) AND ("r"."name" = ANY (ARRAY['system_admin'::"text", 'organization_admin'::"text"]))))));



CREATE POLICY "Admins can manage units in their organization" ON "public"."work_units" USING (("organization_id" IN ( SELECT "ou"."organization_id"
   FROM ("public"."organization_users" "ou"
     JOIN "public"."roles" "r" ON (("r"."id" = "ou"."role_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("r"."name" = ANY (ARRAY['organization_admin'::"text", 'system_admin'::"text"]))))));



CREATE POLICY "Admins can view audit logs" ON "public"."audit_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."organization_users" "ou"
     JOIN "public"."roles" "r" ON (("r"."id" = "ou"."role_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("r"."name" = ANY (ARRAY['system_admin'::"text", 'organization_admin'::"text"]))))));



CREATE POLICY "Anyone can view active lab providers" ON "public"."lab_service_providers" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Anyone can view active lab service types" ON "public"."lab_service_types" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Anyone can view user profiles" ON "public"."users" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Farm admins can delete analyses" ON "public"."analyses" FOR DELETE USING (("parcel_id" IN ( SELECT "p"."id"
   FROM ((("public"."parcels" "p"
     JOIN "public"."farms" "f" ON (("p"."farm_id" = "f"."id")))
     JOIN "public"."organization_users" "ou" ON (("f"."organization_id" = "ou"."organization_id")))
     JOIN "public"."roles" "r" ON (("r"."id" = "ou"."role_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."is_active" = true) AND ("r"."name" = ANY (ARRAY['organization_admin'::"text", 'farm_manager'::"text"]))))));



CREATE POLICY "Farm managers and above can create costs" ON "public"."task_costs" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "ou"."organization_id"
   FROM ("public"."organization_users" "ou"
     JOIN "public"."roles" "r" ON (("ou"."role_id" = "r"."id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."is_active" = true) AND ("r"."level" <= 3)))));



CREATE POLICY "Farm managers and above can update costs" ON "public"."task_costs" FOR UPDATE USING (("organization_id" IN ( SELECT "ou"."organization_id"
   FROM ("public"."organization_users" "ou"
     JOIN "public"."roles" "r" ON (("ou"."role_id" = "r"."id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."is_active" = true) AND ("r"."level" <= 3)))));



CREATE POLICY "Farm managers and admins can manage piece work" ON "public"."piece_work_records" USING (("organization_id" IN ( SELECT "ou"."organization_id"
   FROM ("public"."organization_users" "ou"
     JOIN "public"."roles" "r" ON (("r"."id" = "ou"."role_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("r"."name" = ANY (ARRAY['organization_admin'::"text", 'farm_manager'::"text", 'system_admin'::"text"]))))));



CREATE POLICY "Farm members can insert analyses" ON "public"."analyses" FOR INSERT WITH CHECK (("parcel_id" IN ( SELECT "p"."id"
   FROM ((("public"."parcels" "p"
     JOIN "public"."farms" "f" ON (("p"."farm_id" = "f"."id")))
     JOIN "public"."organization_users" "ou" ON (("f"."organization_id" = "ou"."organization_id")))
     JOIN "public"."roles" "r" ON (("r"."id" = "ou"."role_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."is_active" = true) AND ("r"."name" = ANY (ARRAY['organization_admin'::"text", 'farm_manager'::"text", 'farm_worker'::"text"]))))));



CREATE POLICY "Farm members can manage recommendations" ON "public"."analysis_recommendations" USING (("analysis_id" IN ( SELECT "a"."id"
   FROM (((("public"."analyses" "a"
     JOIN "public"."parcels" "p" ON (("a"."parcel_id" = "p"."id")))
     JOIN "public"."farms" "f" ON (("p"."farm_id" = "f"."id")))
     JOIN "public"."organization_users" "ou" ON (("f"."organization_id" = "ou"."organization_id")))
     JOIN "public"."roles" "r" ON (("r"."id" = "ou"."role_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."is_active" = true) AND ("r"."name" = ANY (ARRAY['organization_admin'::"text", 'farm_manager'::"text", 'farm_worker'::"text"]))))));



CREATE POLICY "Farm members can update analyses" ON "public"."analyses" FOR UPDATE USING (("parcel_id" IN ( SELECT "p"."id"
   FROM ((("public"."parcels" "p"
     JOIN "public"."farms" "f" ON (("p"."farm_id" = "f"."id")))
     JOIN "public"."organization_users" "ou" ON (("f"."organization_id" = "ou"."organization_id")))
     JOIN "public"."roles" "r" ON (("r"."id" = "ou"."role_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."is_active" = true) AND ("r"."name" = ANY (ARRAY['organization_admin'::"text", 'farm_manager'::"text", 'farm_worker'::"text"]))))));



CREATE POLICY "Farm members can view analyses" ON "public"."analyses" FOR SELECT USING (("parcel_id" IN ( SELECT "p"."id"
   FROM (("public"."parcels" "p"
     JOIN "public"."farms" "f" ON (("p"."farm_id" = "f"."id")))
     JOIN "public"."organization_users" "ou" ON (("f"."organization_id" = "ou"."organization_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."is_active" = true)))));



CREATE POLICY "Farm members can view recommendations" ON "public"."analysis_recommendations" FOR SELECT USING (("analysis_id" IN ( SELECT "a"."id"
   FROM ((("public"."analyses" "a"
     JOIN "public"."parcels" "p" ON (("a"."parcel_id" = "p"."id")))
     JOIN "public"."farms" "f" ON (("p"."farm_id" = "f"."id")))
     JOIN "public"."organization_users" "ou" ON (("f"."organization_id" = "ou"."organization_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."is_active" = true)))));



CREATE POLICY "Managers and drivers can update deliveries" ON "public"."deliveries" FOR UPDATE USING ((("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))) AND (("organization_id" IN ( SELECT "ou"."organization_id"
   FROM ("public"."organization_users" "ou"
     JOIN "public"."roles" "r" ON (("r"."id" = "ou"."role_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("r"."name" = ANY (ARRAY['system_admin'::"text", 'organization_admin'::"text", 'farm_manager'::"text"]))))) OR ("driver_id" IN ( SELECT "w"."id"
   FROM "public"."workers" "w"
  WHERE ("w"."organization_id" IN ( SELECT "organization_users"."organization_id"
           FROM "public"."organization_users"
          WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))))))));



CREATE POLICY "Managers can approve advances" ON "public"."payment_advances" FOR UPDATE USING (("organization_id" IN ( SELECT "ou"."organization_id"
   FROM ("public"."organization_users" "ou"
     JOIN "public"."roles" "r" ON (("r"."id" = "ou"."role_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."is_active" = true) AND ("r"."name" = ANY (ARRAY['system_admin'::"text", 'organization_admin'::"text", 'farm_manager'::"text"]))))));



CREATE POLICY "Managers can create deliveries" ON "public"."deliveries" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "ou"."organization_id"
   FROM ("public"."organization_users" "ou"
     JOIN "public"."roles" "r" ON (("r"."id" = "ou"."role_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."is_active" = true) AND ("r"."name" = ANY (ARRAY['system_admin'::"text", 'organization_admin'::"text", 'farm_manager'::"text"]))))));



CREATE POLICY "Managers can manage bonuses" ON "public"."payment_bonuses" USING (("payment_record_id" IN ( SELECT "pr"."id"
   FROM "public"."payment_records" "pr"
  WHERE ("pr"."organization_id" IN ( SELECT "ou"."organization_id"
           FROM ("public"."organization_users" "ou"
             JOIN "public"."roles" "r" ON (("r"."id" = "ou"."role_id")))
          WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."is_active" = true) AND ("r"."name" = ANY (ARRAY['system_admin'::"text", 'organization_admin'::"text", 'farm_manager'::"text"]))))))));



CREATE POLICY "Managers can manage deductions" ON "public"."payment_deductions" USING (("payment_record_id" IN ( SELECT "pr"."id"
   FROM "public"."payment_records" "pr"
  WHERE ("pr"."organization_id" IN ( SELECT "ou"."organization_id"
           FROM ("public"."organization_users" "ou"
             JOIN "public"."roles" "r" ON (("r"."id" = "ou"."role_id")))
          WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."is_active" = true) AND ("r"."name" = ANY (ARRAY['system_admin'::"text", 'organization_admin'::"text", 'farm_manager'::"text"]))))))));



CREATE POLICY "Managers can manage delivery items" ON "public"."delivery_items" USING (("delivery_id" IN ( SELECT "d"."id"
   FROM "public"."deliveries" "d"
  WHERE ("d"."organization_id" IN ( SELECT "ou"."organization_id"
           FROM ("public"."organization_users" "ou"
             JOIN "public"."roles" "r" ON (("r"."id" = "ou"."role_id")))
          WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."is_active" = true) AND ("r"."name" = ANY (ARRAY['system_admin'::"text", 'organization_admin'::"text", 'farm_manager'::"text"]))))))));



CREATE POLICY "Managers can manage task dependencies" ON "public"."task_dependencies" USING (("task_id" IN ( SELECT "t"."id"
   FROM "public"."tasks" "t"
  WHERE ("t"."organization_id" IN ( SELECT "ou"."organization_id"
           FROM ("public"."organization_users" "ou"
             JOIN "public"."roles" "r" ON (("r"."id" = "ou"."role_id")))
          WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."is_active" = true) AND ("r"."name" = ANY (ARRAY['system_admin'::"text", 'organization_admin'::"text", 'farm_manager'::"text"]))))))));



CREATE POLICY "Org members can delete farm roles" ON "public"."farm_management_roles" FOR DELETE USING (("farm_id" IN ( SELECT "f"."id"
   FROM ("public"."farms" "f"
     JOIN "public"."organization_users" "ou" ON (("ou"."organization_id" = "f"."organization_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."is_active" = true)))));



CREATE POLICY "Org members can insert farm roles" ON "public"."farm_management_roles" FOR INSERT WITH CHECK (("farm_id" IN ( SELECT "f"."id"
   FROM ("public"."farms" "f"
     JOIN "public"."organization_users" "ou" ON (("ou"."organization_id" = "f"."organization_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."is_active" = true)))));



CREATE POLICY "Org members can update farm roles" ON "public"."farm_management_roles" FOR UPDATE USING (("farm_id" IN ( SELECT "f"."id"
   FROM ("public"."farms" "f"
     JOIN "public"."organization_users" "ou" ON (("ou"."organization_id" = "f"."organization_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."is_active" = true)))));



CREATE POLICY "Org members can view farm roles" ON "public"."farm_management_roles" FOR SELECT USING (("farm_id" IN ( SELECT "f"."id"
   FROM ("public"."farms" "f"
     JOIN "public"."organization_users" "ou" ON (("ou"."organization_id" = "f"."organization_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."is_active" = true)))));



CREATE POLICY "Organization members can manage AOIs" ON "public"."satellite_aois" USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))));



CREATE POLICY "Organization members can manage processing jobs" ON "public"."satellite_processing_jobs" USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))));



CREATE POLICY "Organization members can view cloud checks" ON "public"."cloud_coverage_checks" FOR SELECT USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))));



CREATE POLICY "Organization members can view processing tasks" ON "public"."satellite_processing_tasks" FOR SELECT USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))));



CREATE POLICY "Organization members can view satellite data" ON "public"."satellite_indices_data" FOR SELECT USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))));



CREATE POLICY "Service can insert cloud checks" ON "public"."cloud_coverage_checks" FOR INSERT WITH CHECK (true);



CREATE POLICY "Service can insert satellite data" ON "public"."satellite_indices_data" FOR INSERT WITH CHECK (true);



CREATE POLICY "Service can manage processing tasks" ON "public"."satellite_processing_tasks" USING (true);



CREATE POLICY "Service can update satellite data" ON "public"."satellite_indices_data" FOR UPDATE USING (true);



CREATE POLICY "Service role can create any subscription" ON "public"."subscriptions" FOR INSERT TO "service_role" WITH CHECK (true);



COMMENT ON POLICY "Service role can create any subscription" ON "public"."subscriptions" IS 'Service role can create any subscription (used by webhooks and admin operations)';



CREATE POLICY "Service role can manage all satellite files" ON "public"."satellite_files" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can manage subscriptions" ON "public"."subscriptions" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage usage" ON "public"."subscription_usage" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "System can manage stock valuation" ON "public"."stock_valuation" USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can access satellite files for their organizations" ON "public"."satellite_files" USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can create comments on accessible tasks" ON "public"."task_comments" FOR INSERT WITH CHECK (("task_id" IN ( SELECT "t"."id"
   FROM "public"."tasks" "t"
  WHERE ("t"."organization_id" IN ( SELECT "organization_users"."organization_id"
           FROM "public"."organization_users"
          WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))))));



CREATE POLICY "Users can create harvests for their organization" ON "public"."harvests" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can create harvests in their organization" ON "public"."harvest_records" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))));



CREATE POLICY "Users can create lab orders for their organization" ON "public"."lab_service_orders" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can create payments for their organization" ON "public"."payments" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can create reports for their organization parcels" ON "public"."parcel_reports" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (("public"."parcels" "p"
     JOIN "public"."farms" "f" ON (("f"."id" = "p"."farm_id")))
     JOIN "public"."organization_users" "ou" ON (("ou"."organization_id" = "f"."organization_id")))
  WHERE (("p"."id" = "parcel_reports"."parcel_id") AND ("ou"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can create stock entries in their organization" ON "public"."stock_entries" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can create suppliers for their organization" ON "public"."suppliers" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can create tracking updates" ON "public"."delivery_tracking" FOR INSERT WITH CHECK (("delivery_id" IN ( SELECT "d"."id"
   FROM "public"."deliveries" "d"
  WHERE ("d"."organization_id" IN ( SELECT "organization_users"."organization_id"
           FROM "public"."organization_users"
          WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))))));



CREATE POLICY "Users can create trial subscriptions for their organization" ON "public"."subscriptions" FOR INSERT TO "authenticated" WITH CHECK ((("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))) AND ("status" = 'trialing'::"text")));



CREATE POLICY "Users can delete draft opening stock in their organization" ON "public"."opening_stock_balances" FOR DELETE USING ((("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))) AND ("status" = 'Draft'::"text")));



CREATE POLICY "Users can delete draft stock entries in their organization" ON "public"."stock_entries" FOR DELETE USING ((("status" = 'Draft'::"text") AND ("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete harvests for their organization" ON "public"."harvests" FOR DELETE USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can delete item groups in their organization" ON "public"."item_groups" FOR DELETE USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can delete item variants for items in their organization" ON "public"."item_variants" FOR DELETE USING (("item_id" IN ( SELECT "items"."id"
   FROM "public"."items"
  WHERE ("items"."organization_id" IN ( SELECT "organization_users"."organization_id"
           FROM "public"."organization_users"
          WHERE ("organization_users"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can delete items in their organization" ON "public"."items" FOR DELETE USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can delete payments for their organization" ON "public"."payments" FOR DELETE USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can delete structures from their organization's farms" ON "public"."structures" FOR DELETE USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))));



CREATE POLICY "Users can delete suppliers for their organization" ON "public"."suppliers" FOR DELETE USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can delete suppliers in their organization" ON "public"."suppliers" FOR DELETE USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))));



CREATE POLICY "Users can delete their own dashboard settings" ON "public"."dashboard_settings" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete utilities from their organization's farms" ON "public"."utilities" FOR DELETE USING (("farm_id" IN ( SELECT "f"."id"
   FROM (("public"."farms" "f"
     JOIN "public"."organizations" "o" ON (("f"."organization_id" = "o"."id")))
     JOIN "public"."organization_users" "uo" ON (("o"."id" = "uo"."organization_id")))
  WHERE ("uo"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can delete warehouses in their organization" ON "public"."warehouses" FOR DELETE USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))));



CREATE POLICY "Users can insert harvest forecasts in their organizations" ON "public"."harvest_forecasts" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can insert item groups in their organization" ON "public"."item_groups" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can insert item variants for items in their organization" ON "public"."item_variants" FOR INSERT WITH CHECK (("item_id" IN ( SELECT "items"."id"
   FROM "public"."items"
  WHERE ("items"."organization_id" IN ( SELECT "organization_users"."organization_id"
           FROM "public"."organization_users"
          WHERE ("organization_users"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can insert items in their organization" ON "public"."items" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can insert opening stock in their organization" ON "public"."opening_stock_balances" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can insert stock movements in their organization" ON "public"."stock_movements" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can insert structures to their organization's farms" ON "public"."structures" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))));



CREATE POLICY "Users can insert suppliers in their organization" ON "public"."suppliers" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))));



CREATE POLICY "Users can insert their own dashboard settings" ON "public"."dashboard_settings" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own profile" ON "public"."user_profiles" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));



COMMENT ON POLICY "Users can insert their own profile" ON "public"."user_profiles" IS 'Allows users to create their own profile';



CREATE POLICY "Users can insert utilities to their organization's farms" ON "public"."utilities" FOR INSERT WITH CHECK (("farm_id" IN ( SELECT "f"."id"
   FROM (("public"."farms" "f"
     JOIN "public"."organizations" "o" ON (("f"."organization_id" = "o"."id")))
     JOIN "public"."organization_users" "uo" ON (("o"."id" = "uo"."organization_id")))
  WHERE ("uo"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can insert warehouses in their organization" ON "public"."warehouses" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))));



CREATE POLICY "Users can insert yield benchmarks in their organizations" ON "public"."yield_benchmarks" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can insert yield history in their organizations" ON "public"."yield_history" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can manage batches in their organization" ON "public"."inventory_batches" USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can manage customer details for items in their organizati" ON "public"."item_customer_details" USING (("item_id" IN ( SELECT "items"."id"
   FROM "public"."items"
  WHERE ("items"."organization_id" IN ( SELECT "organization_users"."organization_id"
           FROM "public"."organization_users"
          WHERE ("organization_users"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can manage equipment for accessible tasks" ON "public"."task_equipment" USING (("task_id" IN ( SELECT "t"."id"
   FROM "public"."tasks" "t"
  WHERE ("t"."organization_id" IN ( SELECT "organization_users"."organization_id"
           FROM "public"."organization_users"
          WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))))));



CREATE POLICY "Users can manage prices for items in their organization" ON "public"."item_prices" USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can manage reception batches in their organization" ON "public"."reception_batches" USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can manage serial numbers in their organization" ON "public"."inventory_serial_numbers" USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can manage stock entry items in their organization" ON "public"."stock_entry_items" USING (("stock_entry_id" IN ( SELECT "stock_entries"."id"
   FROM "public"."stock_entries"
  WHERE ("stock_entries"."organization_id" IN ( SELECT "organization_users"."organization_id"
           FROM "public"."organization_users"
          WHERE ("organization_users"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can manage stock mappings in their organization" ON "public"."stock_account_mappings" USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can manage supplier details for items in their organizati" ON "public"."item_supplier_details" USING (("item_id" IN ( SELECT "items"."id"
   FROM "public"."items"
  WHERE ("items"."organization_id" IN ( SELECT "organization_users"."organization_id"
           FROM "public"."organization_users"
          WHERE ("organization_users"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can manage their organization's schedules" ON "public"."sample_collection_schedules" USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can manage unit conversions for items in their organizati" ON "public"."item_unit_conversions" USING (("item_id" IN ( SELECT "items"."id"
   FROM "public"."items"
  WHERE ("items"."organization_id" IN ( SELECT "organization_users"."organization_id"
           FROM "public"."organization_users"
          WHERE ("organization_users"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can update draft opening stock in their organization" ON "public"."opening_stock_balances" FOR UPDATE USING ((("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))) AND ("status" = 'Draft'::"text")));



CREATE POLICY "Users can update harvest forecasts in their organizations" ON "public"."harvest_forecasts" FOR UPDATE USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update harvests for their organization" ON "public"."harvests" FOR UPDATE USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update harvests in their organization" ON "public"."harvest_records" FOR UPDATE USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))));



CREATE POLICY "Users can update item groups in their organization" ON "public"."item_groups" FOR UPDATE USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update item variants for items in their organization" ON "public"."item_variants" FOR UPDATE USING (("item_id" IN ( SELECT "items"."id"
   FROM "public"."items"
  WHERE ("items"."organization_id" IN ( SELECT "organization_users"."organization_id"
           FROM "public"."organization_users"
          WHERE ("organization_users"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can update items in their organization" ON "public"."items" FOR UPDATE USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update own profile" ON "public"."users" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can update payments for their organization" ON "public"."payments" FOR UPDATE USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update performance alerts in their organizations" ON "public"."performance_alerts" FOR UPDATE USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update recommendations for their organization" ON "public"."lab_service_recommendations" FOR UPDATE USING (("order_id" IN ( SELECT "lab_service_orders"."id"
   FROM "public"."lab_service_orders"
  WHERE ("lab_service_orders"."organization_id" IN ( SELECT "organization_users"."organization_id"
           FROM "public"."organization_users"
          WHERE ("organization_users"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can update stock entries in their organization" ON "public"."stock_entries" FOR UPDATE USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update stock movements in their organization" ON "public"."stock_movements" FOR UPDATE USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update structures from their organization's farms" ON "public"."structures" FOR UPDATE USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))));



CREATE POLICY "Users can update suppliers for their organization" ON "public"."suppliers" FOR UPDATE USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update suppliers in their organization" ON "public"."suppliers" FOR UPDATE USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))));



CREATE POLICY "Users can update their organization subscription" ON "public"."subscriptions" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true))))) WITH CHECK (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))));



CREATE POLICY "Users can update their organization's lab orders" ON "public"."lab_service_orders" FOR UPDATE USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update their own dashboard settings" ON "public"."dashboard_settings" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own reports" ON "public"."parcel_reports" FOR UPDATE USING ((("generated_by" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM ((("public"."parcels" "p"
     JOIN "public"."farms" "f" ON (("f"."id" = "p"."farm_id")))
     JOIN "public"."organization_users" "ou" ON (("ou"."organization_id" = "f"."organization_id")))
     JOIN "public"."roles" "r" ON (("r"."id" = "ou"."role_id")))
  WHERE (("p"."id" = "parcel_reports"."parcel_id") AND ("ou"."user_id" = "auth"."uid"()) AND ("r"."level" <= 2))))));



CREATE POLICY "Users can update their own time logs" ON "public"."task_time_logs" FOR UPDATE USING (("worker_id" IN ( SELECT "w"."id"
   FROM "public"."workers" "w"
  WHERE ("w"."organization_id" IN ( SELECT "organization_users"."organization_id"
           FROM "public"."organization_users"
          WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))))));



CREATE POLICY "Users can update utilities from their organization's farms" ON "public"."utilities" FOR UPDATE USING (("farm_id" IN ( SELECT "f"."id"
   FROM (("public"."farms" "f"
     JOIN "public"."organizations" "o" ON (("f"."organization_id" = "o"."id")))
     JOIN "public"."organization_users" "uo" ON (("o"."id" = "uo"."organization_id")))
  WHERE ("uo"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update warehouses in their organization" ON "public"."warehouses" FOR UPDATE USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))));



CREATE POLICY "Users can update yield benchmarks in their organizations" ON "public"."yield_benchmarks" FOR UPDATE USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update yield history in their organizations" ON "public"."yield_history" FOR UPDATE USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view advances in their organization" ON "public"."payment_advances" FOR SELECT USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))));



CREATE POLICY "Users can view batches in their organization" ON "public"."inventory_batches" FOR SELECT USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view bonuses for accessible payments" ON "public"."payment_bonuses" FOR SELECT USING (("payment_record_id" IN ( SELECT "pr"."id"
   FROM "public"."payment_records" "pr"
  WHERE ("pr"."organization_id" IN ( SELECT "organization_users"."organization_id"
           FROM "public"."organization_users"
          WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))))));



CREATE POLICY "Users can view categories in their organization" ON "public"."task_categories" FOR SELECT USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))));



CREATE POLICY "Users can view closing items in their organization" ON "public"."stock_closing_items" FOR SELECT USING (("closing_id" IN ( SELECT "stock_closing_entries"."id"
   FROM "public"."stock_closing_entries"
  WHERE ("stock_closing_entries"."organization_id" IN ( SELECT "organization_users"."organization_id"
           FROM "public"."organization_users"
          WHERE ("organization_users"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can view closings in their organization" ON "public"."stock_closing_entries" FOR SELECT USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view comments on tasks they have access to" ON "public"."task_comments" FOR SELECT USING (("task_id" IN ( SELECT "t"."id"
   FROM "public"."tasks" "t"
  WHERE ("t"."organization_id" IN ( SELECT "organization_users"."organization_id"
           FROM "public"."organization_users"
          WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))))));



CREATE POLICY "Users can view costs in their organization" ON "public"."task_costs" FOR SELECT USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))));



CREATE POLICY "Users can view deductions for accessible payments" ON "public"."payment_deductions" FOR SELECT USING (("payment_record_id" IN ( SELECT "pr"."id"
   FROM "public"."payment_records" "pr"
  WHERE ("pr"."organization_id" IN ( SELECT "organization_users"."organization_id"
           FROM "public"."organization_users"
          WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))))));



CREATE POLICY "Users can view deliveries in their organization" ON "public"."deliveries" FOR SELECT USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))));



CREATE POLICY "Users can view delivery items in their organization" ON "public"."delivery_items" FOR SELECT USING (("delivery_id" IN ( SELECT "d"."id"
   FROM "public"."deliveries" "d"
  WHERE ("d"."organization_id" IN ( SELECT "organization_users"."organization_id"
           FROM "public"."organization_users"
          WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))))));



CREATE POLICY "Users can view equipment usage in their organization" ON "public"."task_equipment" FOR SELECT USING (("task_id" IN ( SELECT "t"."id"
   FROM "public"."tasks" "t"
  WHERE ("t"."organization_id" IN ( SELECT "organization_users"."organization_id"
           FROM "public"."organization_users"
          WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))))));



CREATE POLICY "Users can view harvest forecasts in their organizations" ON "public"."harvest_forecasts" FOR SELECT USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view harvests for their organization" ON "public"."harvests" FOR SELECT USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view harvests in their organization" ON "public"."harvest_records" FOR SELECT USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))));



CREATE POLICY "Users can view item groups in their organization" ON "public"."item_groups" FOR SELECT USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view item variants for items in their organization" ON "public"."item_variants" FOR SELECT USING (("item_id" IN ( SELECT "items"."id"
   FROM "public"."items"
  WHERE ("items"."organization_id" IN ( SELECT "organization_users"."organization_id"
           FROM "public"."organization_users"
          WHERE ("organization_users"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can view items in their organization" ON "public"."items" FOR SELECT USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view opening stock in their organization" ON "public"."opening_stock_balances" FOR SELECT USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view payments for their organization" ON "public"."payments" FOR SELECT USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view payments in their organization" ON "public"."payment_records" FOR SELECT USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))));



CREATE POLICY "Users can view performance alerts in their organizations" ON "public"."performance_alerts" FOR SELECT USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view piece work in their organization" ON "public"."piece_work_records" FOR SELECT USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view plantation types in their organization" ON "public"."plantation_types" FOR SELECT USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))));



CREATE POLICY "Users can view profitability snapshots" ON "public"."profitability_snapshots" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."organization_users" "ou"
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."organization_id" = "profitability_snapshots"."organization_id")))));



CREATE POLICY "Users can view reception batches in their organization" ON "public"."reception_batches" FOR SELECT USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view recommendations for their organization's orders" ON "public"."lab_service_recommendations" FOR SELECT USING (("order_id" IN ( SELECT "lab_service_orders"."id"
   FROM "public"."lab_service_orders"
  WHERE ("lab_service_orders"."organization_id" IN ( SELECT "organization_users"."organization_id"
           FROM "public"."organization_users"
          WHERE ("organization_users"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can view reports for their organization parcels" ON "public"."parcel_reports" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (("public"."parcels" "p"
     JOIN "public"."farms" "f" ON (("f"."id" = "p"."farm_id")))
     JOIN "public"."organization_users" "ou" ON (("ou"."organization_id" = "f"."organization_id")))
  WHERE (("p"."id" = "parcel_reports"."parcel_id") AND ("ou"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view results for their organization's orders" ON "public"."lab_result_parameters" FOR SELECT USING (("order_id" IN ( SELECT "lab_service_orders"."id"
   FROM "public"."lab_service_orders"
  WHERE ("lab_service_orders"."organization_id" IN ( SELECT "organization_users"."organization_id"
           FROM "public"."organization_users"
          WHERE ("organization_users"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can view serial numbers in their organization" ON "public"."inventory_serial_numbers" FOR SELECT USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view settlements in their organization" ON "public"."metayage_settlements" FOR SELECT USING (("worker_id" IN ( SELECT "workers"."id"
   FROM "public"."workers"
  WHERE ("workers"."organization_id" IN ( SELECT "organization_users"."organization_id"
           FROM "public"."organization_users"
          WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))))));



CREATE POLICY "Users can view stock entries in their organization" ON "public"."stock_entries" FOR SELECT USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view stock entry items in their organization" ON "public"."stock_entry_items" FOR SELECT USING (("stock_entry_id" IN ( SELECT "stock_entries"."id"
   FROM "public"."stock_entries"
  WHERE ("stock_entries"."organization_id" IN ( SELECT "organization_users"."organization_id"
           FROM "public"."organization_users"
          WHERE ("organization_users"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can view stock mappings in their organization" ON "public"."stock_account_mappings" FOR SELECT USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view stock movements in their organization" ON "public"."stock_movements" FOR SELECT USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view stock valuation in their organization" ON "public"."stock_valuation" FOR SELECT USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view structures from their organization's farms" ON "public"."structures" FOR SELECT USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))));



CREATE POLICY "Users can view suppliers for their organization" ON "public"."suppliers" FOR SELECT USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view suppliers in their organization" ON "public"."suppliers" FOR SELECT USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))));



CREATE POLICY "Users can view task dependencies in their organization" ON "public"."task_dependencies" FOR SELECT USING (("task_id" IN ( SELECT "t"."id"
   FROM "public"."tasks" "t"
  WHERE ("t"."organization_id" IN ( SELECT "organization_users"."organization_id"
           FROM "public"."organization_users"
          WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))))));



CREATE POLICY "Users can view their organization subscription" ON "public"."subscriptions" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))));



CREATE POLICY "Users can view their organization subscriptions" ON "public"."subscriptions" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))));



CREATE POLICY "Users can view their organization usage" ON "public"."subscription_usage" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))));



CREATE POLICY "Users can view their organization's document templates" ON "public"."document_templates" FOR SELECT USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their organization's lab orders" ON "public"."lab_service_orders" FOR SELECT USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their organization's schedules" ON "public"."sample_collection_schedules" FOR SELECT USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their own dashboard settings" ON "public"."dashboard_settings" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view time logs for their organization" ON "public"."task_time_logs" FOR SELECT USING (("task_id" IN ( SELECT "t"."id"
   FROM "public"."tasks" "t"
  WHERE ("t"."organization_id" IN ( SELECT "organization_users"."organization_id"
           FROM "public"."organization_users"
          WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))))));



CREATE POLICY "Users can view tracking in their organization" ON "public"."delivery_tracking" FOR SELECT USING (("delivery_id" IN ( SELECT "d"."id"
   FROM "public"."deliveries" "d"
  WHERE ("d"."organization_id" IN ( SELECT "organization_users"."organization_id"
           FROM "public"."organization_users"
          WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))))));



CREATE POLICY "Users can view tree categories in their organization" ON "public"."tree_categories" FOR SELECT USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))));



CREATE POLICY "Users can view trees in their organization" ON "public"."trees" FOR SELECT USING (("category_id" IN ( SELECT "tree_categories"."id"
   FROM "public"."tree_categories"
  WHERE ("tree_categories"."organization_id" IN ( SELECT "organization_users"."organization_id"
           FROM "public"."organization_users"
          WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))))));



CREATE POLICY "Users can view units in their organization" ON "public"."work_units" FOR SELECT USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view utilities from their organization's farms" ON "public"."utilities" FOR SELECT USING (("farm_id" IN ( SELECT "f"."id"
   FROM (("public"."farms" "f"
     JOIN "public"."organizations" "o" ON (("f"."organization_id" = "o"."id")))
     JOIN "public"."organization_users" "uo" ON (("o"."id" = "uo"."organization_id")))
  WHERE ("uo"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view warehouses in their organization" ON "public"."warehouses" FOR SELECT USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))));



CREATE POLICY "Users can view work records in their organization" ON "public"."work_records" FOR SELECT USING (("worker_id" IN ( SELECT "workers"."id"
   FROM "public"."workers"
  WHERE ("workers"."organization_id" IN ( SELECT "organization_users"."organization_id"
           FROM "public"."organization_users"
          WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))))));



CREATE POLICY "Users can view workers in their organization" ON "public"."workers" FOR SELECT USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))));



CREATE POLICY "Users can view yield benchmarks in their organizations" ON "public"."yield_benchmarks" FOR SELECT USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view yield history in their organizations" ON "public"."yield_history" FOR SELECT USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Utilities: org members can delete" ON "public"."utilities" FOR DELETE USING (("farm_id" IN ( SELECT "f"."id"
   FROM ("public"."farms" "f"
     JOIN "public"."organization_users" "ou" ON (("f"."organization_id" = "ou"."organization_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."is_active" = true)))));



CREATE POLICY "Utilities: org members can insert" ON "public"."utilities" FOR INSERT WITH CHECK (("farm_id" IN ( SELECT "f"."id"
   FROM ("public"."farms" "f"
     JOIN "public"."organization_users" "ou" ON (("f"."organization_id" = "ou"."organization_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."is_active" = true)))));



CREATE POLICY "Utilities: org members can select" ON "public"."utilities" FOR SELECT USING (("farm_id" IN ( SELECT "f"."id"
   FROM ("public"."farms" "f"
     JOIN "public"."organization_users" "ou" ON (("f"."organization_id" = "ou"."organization_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."is_active" = true)))));



CREATE POLICY "Utilities: org members can update" ON "public"."utilities" FOR UPDATE USING (("farm_id" IN ( SELECT "f"."id"
   FROM ("public"."farms" "f"
     JOIN "public"."organization_users" "ou" ON (("f"."organization_id" = "ou"."organization_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."is_active" = true)))));



CREATE POLICY "Workers can create time logs for their tasks" ON "public"."task_time_logs" FOR INSERT WITH CHECK (("worker_id" IN ( SELECT "w"."id"
   FROM "public"."workers" "w"
  WHERE ("w"."organization_id" IN ( SELECT "organization_users"."organization_id"
           FROM "public"."organization_users"
          WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))))));



CREATE POLICY "Workers can request advances" ON "public"."payment_advances" FOR INSERT WITH CHECK (("worker_id" IN ( SELECT "w"."id"
   FROM "public"."workers" "w"
  WHERE ("w"."organization_id" IN ( SELECT "organization_users"."organization_id"
           FROM "public"."organization_users"
          WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))))));



CREATE POLICY "Workers can view their own piece work" ON "public"."piece_work_records" FOR SELECT USING (("worker_id" IN ( SELECT "workers"."id"
   FROM "public"."workers"
  WHERE ("workers"."user_id" = "auth"."uid"()))));



CREATE POLICY "Workers can view their own record" ON "public"."workers" FOR SELECT USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."accounting_payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."accounts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."analyses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."analysis_recommendations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "authenticated_can_create" ON "public"."organizations" FOR INSERT TO "authenticated" WITH CHECK (true);



COMMENT ON POLICY "authenticated_can_create" ON "public"."organizations" IS 'Allows authenticated users to create organizations';



CREATE POLICY "authenticated_can_view_crop_types" ON "public"."crop_types" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "authenticated_can_view_crop_varieties" ON "public"."crop_varieties" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "authenticated_can_view_permission_groups" ON "public"."permission_groups" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "authenticated_can_view_product_categories" ON "public"."product_categories" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "authenticated_can_view_product_subcategories" ON "public"."product_subcategories" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "authenticated_can_view_system_templates" ON "public"."role_templates" FOR SELECT USING (("is_system_template" = true));



CREATE POLICY "authenticated_can_view_task_templates" ON "public"."task_templates" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "authenticated_can_view_test_types" ON "public"."test_types" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "authenticated_users_can_view_all_subscriptions" ON "public"."subscriptions" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."bank_accounts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cloud_coverage_checks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cost_categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cost_categories_modify_org_admins" ON "public"."cost_categories" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."organization_users" "ou"
     JOIN "public"."roles" "r" ON (("r"."id" = "ou"."role_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."organization_id" = "cost_categories"."organization_id") AND ("ou"."is_active" = true) AND ("r"."level" <= 2)))));



CREATE POLICY "cost_categories_select_org_members" ON "public"."cost_categories" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_users" "ou"
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."organization_id" = "cost_categories"."organization_id") AND ("ou"."is_active" = true)))));



ALTER TABLE "public"."cost_centers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."costs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "costs_delete_org_members" ON "public"."costs" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_users" "ou"
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."organization_id" = "costs"."organization_id") AND ("ou"."is_active" = true)))));



CREATE POLICY "costs_insert_org_members" ON "public"."costs" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."organization_users" "ou"
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."organization_id" = "costs"."organization_id") AND ("ou"."is_active" = true)))));



CREATE POLICY "costs_select_org_members" ON "public"."costs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_users" "ou"
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."organization_id" = "costs"."organization_id") AND ("ou"."is_active" = true)))));



CREATE POLICY "costs_update_org_members" ON "public"."costs" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_users" "ou"
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."organization_id" = "costs"."organization_id") AND ("ou"."is_active" = true)))));



ALTER TABLE "public"."crop_categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "crop_categories_modify_org_members" ON "public"."crop_categories" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_users" "ou"
  WHERE ("ou"."user_id" = "auth"."uid"()))));



CREATE POLICY "crop_categories_select_all" ON "public"."crop_categories" FOR SELECT USING (true);



ALTER TABLE "public"."crop_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."crop_varieties" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."crops" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."currencies" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "currencies_modify_admin" ON "public"."currencies" USING ((EXISTS ( SELECT 1
   FROM ("public"."organization_users" "ou"
     JOIN "public"."roles" "r" ON (("r"."id" = "ou"."role_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("r"."name" = ANY (ARRAY['system_admin'::"text", 'organization_admin'::"text"]))))));



CREATE POLICY "currencies_select_all" ON "public"."currencies" FOR SELECT USING (true);



ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "customers_delete_policy" ON "public"."customers" FOR DELETE USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "customers_insert_policy" ON "public"."customers" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "customers_select_policy" ON "public"."customers" FOR SELECT USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "customers_update_policy" ON "public"."customers" FOR UPDATE USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."dashboard_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."day_laborers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."deliveries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."delivery_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."delivery_tracking" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."document_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."employees" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."farm_management_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."farms" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "farms_delete_policy" ON "public"."farms" FOR DELETE TO "authenticated" USING (("public"."user_has_role"("auth"."uid"(), "organization_id", ARRAY['system_admin'::"text", 'organization_admin'::"text"]) AND "public"."has_valid_subscription"("organization_id")));



CREATE POLICY "farms_insert_policy" ON "public"."farms" FOR INSERT TO "authenticated" WITH CHECK (("public"."user_has_role"("auth"."uid"(), "organization_id", ARRAY['system_admin'::"text", 'organization_admin'::"text"]) AND ("public"."can_create_resource"("organization_id", 'farm'::"text") = true)));



CREATE POLICY "farms_select_policy" ON "public"."farms" FOR SELECT TO "authenticated" USING (("public"."is_active_org_member"("auth"."uid"(), "organization_id") AND "public"."has_valid_subscription"("organization_id")));



CREATE POLICY "farms_update_policy" ON "public"."farms" FOR UPDATE TO "authenticated" USING (("public"."user_has_role"("auth"."uid"(), "organization_id", ARRAY['system_admin'::"text", 'organization_admin'::"text", 'farm_manager'::"text"]) AND ("public"."has_valid_subscription"("organization_id") = true)));



ALTER TABLE "public"."financial_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."harvest_forecasts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."harvest_records" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."harvests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inventory" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inventory_batches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inventory_serial_numbers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invoice_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invoices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."item_customer_details" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."item_groups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."item_prices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."item_supplier_details" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."item_unit_conversions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."item_variants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."journal_entries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."journal_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lab_result_parameters" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lab_service_orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lab_service_providers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lab_service_recommendations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lab_service_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."livestock" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."metayage_settlements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."opening_stock_balances" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "org_access_accounts" ON "public"."accounts" USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "org_access_bank_accounts" ON "public"."bank_accounts" USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "org_access_cost_centers" ON "public"."cost_centers" USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "org_access_invoice_items" ON "public"."invoice_items" USING (("invoice_id" IN ( SELECT "i"."id"
   FROM "public"."invoices" "i"
  WHERE ("i"."organization_id" IN ( SELECT "organization_users"."organization_id"
           FROM "public"."organization_users"
          WHERE ("organization_users"."user_id" = "auth"."uid"()))))));



CREATE POLICY "org_access_journal_items" ON "public"."journal_items" USING (("journal_entry_id" IN ( SELECT "je"."id"
   FROM "public"."journal_entries" "je"
  WHERE ("je"."organization_id" IN ( SELECT "organization_users"."organization_id"
           FROM "public"."organization_users"
          WHERE ("organization_users"."user_id" = "auth"."uid"()))))));



CREATE POLICY "org_access_payment_allocations" ON "public"."payment_allocations" USING (("payment_id" IN ( SELECT "p"."id"
   FROM "public"."accounting_payments" "p"
  WHERE ("p"."organization_id" IN ( SELECT "organization_users"."organization_id"
           FROM "public"."organization_users"
          WHERE ("organization_users"."user_id" = "auth"."uid"()))))));



CREATE POLICY "org_access_purchase_order_items" ON "public"."purchase_order_items" USING (("purchase_order_id" IN ( SELECT "purchase_orders"."id"
   FROM "public"."purchase_orders"
  WHERE ("purchase_orders"."organization_id" IN ( SELECT "organization_users"."organization_id"
           FROM "public"."organization_users"
          WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))))));



CREATE POLICY "org_access_quote_items" ON "public"."quote_items" USING (("quote_id" IN ( SELECT "quotes"."id"
   FROM "public"."quotes"
  WHERE ("quotes"."organization_id" IN ( SELECT "organization_users"."organization_id"
           FROM "public"."organization_users"
          WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))))));



CREATE POLICY "org_access_sales_order_items" ON "public"."sales_order_items" USING (("sales_order_id" IN ( SELECT "sales_orders"."id"
   FROM "public"."sales_orders"
  WHERE ("sales_orders"."organization_id" IN ( SELECT "organization_users"."organization_id"
           FROM "public"."organization_users"
          WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))))));



CREATE POLICY "org_access_taxes" ON "public"."taxes" USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "org_admins_can_delete_farms" ON "public"."farms" FOR DELETE USING ("public"."user_has_permission_for_org"("auth"."uid"(), "organization_id", 'farms.delete'::"text"));



CREATE POLICY "org_admins_can_manage_crop_types" ON "public"."crop_types" USING ((EXISTS ( SELECT 1
   FROM ("public"."organization_users" "ou"
     JOIN "public"."roles" "r" ON (("r"."id" = "ou"."role_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."is_active" = true) AND ("r"."level" <= 2)))));



CREATE POLICY "org_admins_can_manage_crop_varieties" ON "public"."crop_varieties" USING ((EXISTS ( SELECT 1
   FROM ("public"."organization_users" "ou"
     JOIN "public"."roles" "r" ON (("r"."id" = "ou"."role_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."is_active" = true) AND ("r"."level" <= 2)))));



CREATE POLICY "org_admins_can_manage_day_laborers" ON "public"."day_laborers" USING ("public"."user_has_permission_for_org"("auth"."uid"(), "farm_id", 'day_laborers.manage'::"text"));



CREATE POLICY "org_admins_can_manage_employees" ON "public"."employees" USING ("public"."user_has_permission_for_org"("auth"."uid"(), "farm_id", 'employees.manage'::"text"));



CREATE POLICY "org_admins_can_manage_org_templates" ON "public"."role_templates" USING ("public"."user_has_permission_for_org"("auth"."uid"(), "organization_id", 'templates.manage'::"text"));



CREATE POLICY "org_admins_can_manage_product_categories" ON "public"."product_categories" USING ((EXISTS ( SELECT 1
   FROM ("public"."organization_users" "ou"
     JOIN "public"."roles" "r" ON (("r"."id" = "ou"."role_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."is_active" = true) AND ("r"."level" <= 2)))));



CREATE POLICY "org_admins_can_manage_product_subcategories" ON "public"."product_subcategories" USING ((EXISTS ( SELECT 1
   FROM ("public"."organization_users" "ou"
     JOIN "public"."roles" "r" ON (("r"."id" = "ou"."role_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."is_active" = true) AND ("r"."level" <= 2)))));



CREATE POLICY "org_admins_can_manage_task_templates" ON "public"."task_templates" USING ((EXISTS ( SELECT 1
   FROM ("public"."organization_users" "ou"
     JOIN "public"."roles" "r" ON (("r"."id" = "ou"."role_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."is_active" = true) AND ("r"."level" <= 2)))));



CREATE POLICY "org_admins_can_manage_test_types" ON "public"."test_types" USING ((EXISTS ( SELECT 1
   FROM ("public"."organization_users" "ou"
     JOIN "public"."roles" "r" ON (("r"."id" = "ou"."role_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."is_active" = true) AND ("r"."level" <= 2)))));



CREATE POLICY "org_admins_can_manage_transactions" ON "public"."financial_transactions" USING ("public"."user_has_permission_for_org"("auth"."uid"(), "farm_id", 'financial.manage'::"text"));



CREATE POLICY "org_admins_can_update" ON "public"."organizations" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM ("public"."organization_users" "ou"
     JOIN "public"."roles" "r" ON (("r"."id" = "ou"."role_id")))
  WHERE (("ou"."organization_id" = "organizations"."id") AND ("ou"."user_id" = "auth"."uid"()) AND ("ou"."is_active" = true) AND ("r"."name" = ANY (ARRAY['organization_admin'::"text", 'system_admin'::"text"]))))));



CREATE POLICY "org_admins_can_view_profiles" ON "public"."user_profiles" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."organization_users" "ou"
     JOIN "public"."roles" "r" ON (("r"."id" = "ou"."role_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."is_active" = true) AND ("r"."level" <= 2)))));



CREATE POLICY "org_admins_can_view_role_audit" ON "public"."role_assignments_audit" FOR SELECT USING ("public"."user_has_permission_for_org"("auth"."uid"(), "organization_id", 'audit.view'::"text"));



CREATE POLICY "org_delete_accounting_payments" ON "public"."accounting_payments" FOR DELETE USING ((("organization_id" IN ( SELECT "ou"."organization_id"
   FROM ("public"."organization_users" "ou"
     JOIN "public"."roles" "r" ON (("r"."id" = "ou"."role_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."is_active" = true) AND ("r"."name" = ANY (ARRAY['system_admin'::"text", 'organization_admin'::"text", 'farm_manager'::"text"]))))) AND ("status" = 'draft'::"public"."accounting_payment_status")));



COMMENT ON POLICY "org_delete_accounting_payments" ON "public"."accounting_payments" IS 'Allow admins and farm managers to delete draft payment records only';



CREATE POLICY "org_delete_invoices" ON "public"."invoices" FOR DELETE USING (("organization_id" IN ( SELECT "ou"."organization_id"
   FROM ("public"."organization_users" "ou"
     JOIN "public"."roles" "r" ON (("r"."id" = "ou"."role_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("r"."name" = ANY (ARRAY['organization_admin'::"text", 'farm_manager'::"text"]))))));



CREATE POLICY "org_members_can_create_farms" ON "public"."farms" FOR INSERT WITH CHECK ("public"."user_has_permission_for_org"("auth"."uid"(), "organization_id", 'farms.create'::"text"));



CREATE POLICY "org_members_can_create_parcels" ON "public"."parcels" FOR INSERT WITH CHECK ("public"."user_has_permission_for_org"("auth"."uid"(), "farm_id", 'parcels.create'::"text"));



CREATE POLICY "org_members_can_delete_parcels" ON "public"."parcels" FOR DELETE USING ("public"."user_has_permission_for_org"("auth"."uid"(), "farm_id", 'parcels.delete'::"text"));



CREATE POLICY "org_members_can_manage_crops" ON "public"."crops" USING ("public"."user_has_permission_for_org"("auth"."uid"(), "farm_id", 'crops.manage'::"text"));



CREATE POLICY "org_members_can_manage_inventory" ON "public"."inventory" USING ("public"."user_has_permission_for_org"("auth"."uid"(), "farm_id", 'inventory.manage'::"text"));



CREATE POLICY "org_members_can_manage_livestock" ON "public"."livestock" USING ("public"."user_has_permission_for_org"("auth"."uid"(), "farm_id", 'livestock.manage'::"text"));



CREATE POLICY "org_members_can_manage_soil_analyses" ON "public"."soil_analyses" USING ("public"."user_has_permission_for_org"("auth"."uid"(), "parcel_id", 'soil_analyses.manage'::"text"));



CREATE POLICY "org_members_can_manage_work_records" ON "public"."work_records" USING ("public"."user_has_permission_for_org"("auth"."uid"(), "farm_id", 'work_records.manage'::"text"));



CREATE POLICY "org_members_can_update_farms" ON "public"."farms" FOR UPDATE USING ("public"."user_has_permission_for_org"("auth"."uid"(), "organization_id", 'farms.update'::"text"));



CREATE POLICY "org_members_can_update_parcels" ON "public"."parcels" FOR UPDATE USING ("public"."user_has_permission_for_org"("auth"."uid"(), "farm_id", 'parcels.update'::"text"));



CREATE POLICY "org_members_can_view" ON "public"."organizations" FOR SELECT USING ("public"."is_active_org_member"("auth"."uid"(), "id"));



CREATE POLICY "org_members_can_view_crops" ON "public"."crops" FOR SELECT USING ("public"."is_active_org_member"("auth"."uid"(), "farm_id"));



CREATE POLICY "org_members_can_view_day_laborers" ON "public"."day_laborers" FOR SELECT USING ("public"."is_active_org_member"("auth"."uid"(), "farm_id"));



CREATE POLICY "org_members_can_view_employees" ON "public"."employees" FOR SELECT USING ("public"."is_active_org_member"("auth"."uid"(), "farm_id"));



CREATE POLICY "org_members_can_view_farms" ON "public"."farms" FOR SELECT USING ("public"."is_active_org_member"("auth"."uid"(), "organization_id"));



CREATE POLICY "org_members_can_view_inventory" ON "public"."inventory" FOR SELECT USING ("public"."is_active_org_member"("auth"."uid"(), "farm_id"));



CREATE POLICY "org_members_can_view_livestock" ON "public"."livestock" FOR SELECT USING ("public"."is_active_org_member"("auth"."uid"(), "farm_id"));



CREATE POLICY "org_members_can_view_org_templates" ON "public"."role_templates" FOR SELECT USING ("public"."is_active_org_member"("auth"."uid"(), "organization_id"));



CREATE POLICY "org_members_can_view_parcels" ON "public"."parcels" FOR SELECT USING ("public"."is_active_org_member"("auth"."uid"(), "farm_id"));



CREATE POLICY "org_members_can_view_soil_analyses" ON "public"."soil_analyses" FOR SELECT USING ("public"."is_active_org_member"("auth"."uid"(), "parcel_id"));



CREATE POLICY "org_members_can_view_transactions" ON "public"."financial_transactions" FOR SELECT USING ("public"."is_active_org_member"("auth"."uid"(), "farm_id"));



CREATE POLICY "org_members_can_view_work_records" ON "public"."work_records" FOR SELECT USING ("public"."is_active_org_member"("auth"."uid"(), "farm_id"));



CREATE POLICY "org_read_accounting_payments" ON "public"."accounting_payments" FOR SELECT USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "org_read_invoices" ON "public"."invoices" FOR SELECT USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "org_read_journal_entries" ON "public"."journal_entries" FOR SELECT USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "org_read_purchase_orders" ON "public"."purchase_orders" FOR SELECT USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))));



CREATE POLICY "org_read_quotes" ON "public"."quotes" FOR SELECT USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))));



CREATE POLICY "org_read_sales_orders" ON "public"."sales_orders" FOR SELECT USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))));



CREATE POLICY "org_update_accounting_payments" ON "public"."accounting_payments" FOR UPDATE USING (("organization_id" IN ( SELECT "ou"."organization_id"
   FROM ("public"."organization_users" "ou"
     JOIN "public"."roles" "r" ON (("r"."id" = "ou"."role_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."is_active" = true) AND ("r"."name" = ANY (ARRAY['system_admin'::"text", 'organization_admin'::"text", 'farm_manager'::"text"]))))));



COMMENT ON POLICY "org_update_accounting_payments" ON "public"."accounting_payments" IS 'Allow admins and farm managers to update payment records';



CREATE POLICY "org_update_invoices" ON "public"."invoices" FOR UPDATE USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "org_update_journal_entries" ON "public"."journal_entries" FOR UPDATE USING (("organization_id" IN ( SELECT "ou"."organization_id"
   FROM ("public"."organization_users" "ou"
     JOIN "public"."roles" "r" ON (("r"."id" = "ou"."role_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("r"."name" = ANY (ARRAY['organization_admin'::"text", 'farm_manager'::"text"]))))));



CREATE POLICY "org_update_purchase_orders" ON "public"."purchase_orders" FOR UPDATE USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))));



CREATE POLICY "org_update_quotes" ON "public"."quotes" FOR UPDATE USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))));



CREATE POLICY "org_update_sales_orders" ON "public"."sales_orders" FOR UPDATE USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))));



CREATE POLICY "org_write_accounting_payments" ON "public"."accounting_payments" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "ou"."organization_id"
   FROM ("public"."organization_users" "ou"
     JOIN "public"."roles" "r" ON (("r"."id" = "ou"."role_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."is_active" = true) AND ("r"."name" = ANY (ARRAY['system_admin'::"text", 'organization_admin'::"text", 'farm_manager'::"text"]))))));



COMMENT ON POLICY "org_write_accounting_payments" ON "public"."accounting_payments" IS 'Allow admins and farm managers to create payment records';



CREATE POLICY "org_write_invoices" ON "public"."invoices" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "org_write_journal_entries" ON "public"."journal_entries" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "ou"."organization_id"
   FROM ("public"."organization_users" "ou"
     JOIN "public"."roles" "r" ON (("r"."id" = "ou"."role_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("r"."name" = ANY (ARRAY['organization_admin'::"text", 'farm_manager'::"text"]))))));



CREATE POLICY "org_write_purchase_orders" ON "public"."purchase_orders" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))));



CREATE POLICY "org_write_quotes" ON "public"."quotes" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))));



CREATE POLICY "org_write_sales_orders" ON "public"."sales_orders" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))));



ALTER TABLE "public"."organization_users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organization_users_delete_policy" ON "public"."organization_users" FOR DELETE TO "authenticated" USING ("public"."is_organization_owner"("organization_id", "auth"."uid"()));



CREATE POLICY "organization_users_insert_policy" ON "public"."organization_users" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_organization_admin"("organization_id", "auth"."uid"()));



CREATE POLICY "organization_users_select_policy" ON "public"."organization_users" FOR SELECT TO "authenticated" USING ("public"."user_can_view_org_membership"("organization_id", "auth"."uid"(), "user_id"));



CREATE POLICY "organization_users_update_policy" ON "public"."organization_users" FOR UPDATE TO "authenticated" USING ("public"."is_organization_admin"("organization_id", "auth"."uid"())) WITH CHECK ("public"."is_organization_admin"("organization_id", "auth"."uid"()));



ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "owners_can_view_their_organizations" ON "public"."organizations" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "owner_id"));



COMMENT ON POLICY "owners_can_view_their_organizations" ON "public"."organizations" IS 'Allows organization owners to view their organizations';



ALTER TABLE "public"."parcel_reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."parcels" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "parcels_delete_policy" ON "public"."parcels" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."farms" "f"
  WHERE (("f"."id" = "parcels"."farm_id") AND "public"."user_has_role"("auth"."uid"(), "f"."organization_id", ARRAY['system_admin'::"text", 'organization_admin'::"text", 'farm_manager'::"text"]) AND ("public"."has_valid_subscription"("f"."organization_id") = true)))));



CREATE POLICY "parcels_insert_policy" ON "public"."parcels" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."farms" "f"
  WHERE (("f"."id" = "parcels"."farm_id") AND "public"."user_has_role"("auth"."uid"(), "f"."organization_id", ARRAY['system_admin'::"text", 'organization_admin'::"text", 'farm_manager'::"text"]) AND ("public"."can_create_resource"("f"."organization_id", 'parcel'::"text") = true)))));



CREATE POLICY "parcels_select_policy" ON "public"."parcels" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."farms" "f"
     JOIN "public"."organization_users" "ou" ON (("ou"."organization_id" = "f"."organization_id")))
  WHERE (("f"."id" = "parcels"."farm_id") AND ("ou"."user_id" = "auth"."uid"()) AND ("ou"."is_active" = true) AND ("public"."has_valid_subscription"("f"."organization_id") = true)))));



CREATE POLICY "parcels_update_policy" ON "public"."parcels" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."farms" "f"
  WHERE (("f"."id" = "parcels"."farm_id") AND "public"."user_has_role"("auth"."uid"(), "f"."organization_id", ARRAY['system_admin'::"text", 'organization_admin'::"text", 'farm_manager'::"text"]) AND ("public"."has_valid_subscription"("f"."organization_id") = true)))));



ALTER TABLE "public"."payment_advances" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_allocations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_bonuses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_deductions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_records" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."performance_alerts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."permission_groups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."permissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "permissions_select_all" ON "public"."permissions" FOR SELECT USING (true);



ALTER TABLE "public"."piece_work_records" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."plantation_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_subcategories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profitability_snapshots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."purchase_order_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."purchase_orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quote_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quotes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reception_batches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."revenues" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "revenues_modify_org_members" ON "public"."revenues" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_users" "ou"
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."organization_id" = "revenues"."organization_id") AND ("ou"."is_active" = true)))));



CREATE POLICY "revenues_select_org_members" ON "public"."revenues" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_users" "ou"
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."organization_id" = "revenues"."organization_id") AND ("ou"."is_active" = true)))));



ALTER TABLE "public"."role_assignments_audit" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."role_permissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "role_permissions_select_all" ON "public"."role_permissions" FOR SELECT USING (true);



ALTER TABLE "public"."role_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "roles_select_all" ON "public"."roles" FOR SELECT USING (true);



ALTER TABLE "public"."sales_order_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sales_orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sample_collection_schedules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."satellite_aois" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."satellite_files" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."satellite_indices_data" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."satellite_processing_jobs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."satellite_processing_tasks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "service_role_full_access" ON "public"."subscriptions" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."soil_analyses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stock_account_mappings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stock_closing_entries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stock_closing_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stock_entries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stock_entry_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stock_movements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stock_valuation" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."structures" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "subscription_check_farms_insert" ON "public"."farms" FOR INSERT TO "authenticated" WITH CHECK (("public"."has_valid_subscription"("organization_id") AND "public"."can_create_farm"("organization_id")));



CREATE POLICY "subscription_check_parcels_insert" ON "public"."parcels" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."farms"
  WHERE (("farms"."id" = "parcels"."farm_id") AND "public"."has_valid_subscription"("farms"."organization_id") AND "public"."can_create_parcel"("farms"."organization_id")))));



ALTER TABLE "public"."subscription_usage" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."suppliers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "suppliers_delete_policy" ON "public"."suppliers" FOR DELETE USING (("organization_id" IN ( SELECT "ou"."organization_id"
   FROM ("public"."organization_users" "ou"
     JOIN "public"."roles" "r" ON (("r"."id" = "ou"."role_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."is_active" = true) AND ("r"."name" = ANY (ARRAY['system_admin'::"text", 'organization_admin'::"text", 'farm_manager'::"text"]))))));



COMMENT ON POLICY "suppliers_delete_policy" ON "public"."suppliers" IS 'Allow admins and managers to delete suppliers';



CREATE POLICY "suppliers_insert_policy" ON "public"."suppliers" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))));



COMMENT ON POLICY "suppliers_insert_policy" ON "public"."suppliers" IS 'Allow users to create suppliers in their organization';



CREATE POLICY "suppliers_select_policy" ON "public"."suppliers" FOR SELECT USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))));



COMMENT ON POLICY "suppliers_select_policy" ON "public"."suppliers" IS 'Allow users to view suppliers in their organization';



CREATE POLICY "suppliers_update_policy" ON "public"."suppliers" FOR UPDATE USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))));



COMMENT ON POLICY "suppliers_update_policy" ON "public"."suppliers" IS 'Allow users to update suppliers in their organization';



ALTER TABLE "public"."task_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."task_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."task_costs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."task_dependencies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."task_equipment" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."task_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."task_time_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tasks_delete_all" ON "public"."tasks" FOR DELETE USING (("auth"."uid"() IS NOT NULL));



COMMENT ON POLICY "tasks_delete_all" ON "public"."tasks" IS 'Temporary permissive policy - allows all authenticated users to delete tasks';



CREATE POLICY "tasks_insert_all" ON "public"."tasks" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



COMMENT ON POLICY "tasks_insert_all" ON "public"."tasks" IS 'Temporary permissive policy - allows all authenticated users to create tasks';



CREATE POLICY "tasks_select_all" ON "public"."tasks" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



COMMENT ON POLICY "tasks_select_all" ON "public"."tasks" IS 'Temporary permissive policy - allows all authenticated users to view tasks';



CREATE POLICY "tasks_update_all" ON "public"."tasks" FOR UPDATE USING (("auth"."uid"() IS NOT NULL)) WITH CHECK (("auth"."uid"() IS NOT NULL));



COMMENT ON POLICY "tasks_update_all" ON "public"."tasks" IS 'Temporary permissive policy - allows all authenticated users to update tasks';



ALTER TABLE "public"."taxes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."test_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tree_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trees" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_profiles_admin_select" ON "public"."user_profiles" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."organization_users" "ou_viewer"
     JOIN "public"."organization_users" "ou_profile" ON (("ou_viewer"."organization_id" = "ou_profile"."organization_id")))
  WHERE (("ou_viewer"."user_id" = "auth"."uid"()) AND ("ou_profile"."user_id" = "user_profiles"."id") AND ("ou_viewer"."is_active" = true) AND ("ou_viewer"."role_id" IN ( SELECT "roles"."id"
           FROM "public"."roles"
          WHERE ("roles"."level" <= 2)))))));



CREATE POLICY "user_profiles_own_insert" ON "public"."user_profiles" FOR INSERT WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "user_profiles_own_select" ON "public"."user_profiles" FOR SELECT USING (("id" = "auth"."uid"()));



CREATE POLICY "user_profiles_own_update" ON "public"."user_profiles" FOR UPDATE USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_can_insert_own_profile" ON "public"."user_profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "users_can_update_own_profile" ON "public"."user_profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "users_can_view_own_profile" ON "public"."user_profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "users_can_view_their_organizations" ON "public"."organizations" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_users" "ou"
  WHERE (("ou"."organization_id" = "organizations"."id") AND ("ou"."user_id" = "auth"."uid"()) AND ("ou"."is_active" = true)))));



COMMENT ON POLICY "users_can_view_their_organizations" ON "public"."organizations" IS 'Allows users to view organizations they are members of. Uses direct EXISTS check to avoid recursion.';



ALTER TABLE "public"."utilities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."warehouses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."work_records" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."work_units" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."yield_benchmarks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."yield_history" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";




























































































































































GRANT ALL ON FUNCTION "public"."add_subscription_check_to_table"("table_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."add_subscription_check_to_table"("table_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_subscription_check_to_table"("table_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."assign_owner_admin_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."assign_owner_admin_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."assign_owner_admin_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."assign_role_with_audit"("target_user_id" "uuid", "target_org_id" "uuid", "new_role_id" "uuid", "reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."assign_role_with_audit"("target_user_id" "uuid", "target_org_id" "uuid", "new_role_id" "uuid", "reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."assign_role_with_audit"("target_user_id" "uuid", "target_org_id" "uuid", "new_role_id" "uuid", "reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."audit_role_assignment"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_role_assignment"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_role_assignment"() TO "service_role";



GRANT ALL ON FUNCTION "public"."audit_trigger"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_trigger"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_trigger"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_create_yield_from_harvest"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_create_yield_from_harvest"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_create_yield_from_harvest"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_seed_chart_of_accounts"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_seed_chart_of_accounts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_seed_chart_of_accounts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."block_write_without_subscription"() TO "anon";
GRANT ALL ON FUNCTION "public"."block_write_without_subscription"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."block_write_without_subscription"() TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_daily_worker_payment"("p_worker_id" "uuid", "p_period_start" "date", "p_period_end" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_daily_worker_payment"("p_worker_id" "uuid", "p_period_start" "date", "p_period_end" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_daily_worker_payment"("p_worker_id" "uuid", "p_period_start" "date", "p_period_end" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_fixed_salary_payment"("p_worker_id" "uuid", "p_period_start" "date", "p_period_end" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_fixed_salary_payment"("p_worker_id" "uuid", "p_period_start" "date", "p_period_end" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_fixed_salary_payment"("p_worker_id" "uuid", "p_period_start" "date", "p_period_end" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_metayage_share"("p_worker_id" "uuid", "p_gross_revenue" numeric, "p_total_charges" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_metayage_share"("p_worker_id" "uuid", "p_gross_revenue" numeric, "p_total_charges" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_metayage_share"("p_worker_id" "uuid", "p_gross_revenue" numeric, "p_total_charges" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_parcel_area_from_boundary"() TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_parcel_area_from_boundary"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_parcel_area_from_boundary"() TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_performance_rating"("variance_percent" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_performance_rating"("variance_percent" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_performance_rating"("variance_percent" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_piece_work_payment"("p_worker_id" "uuid", "p_period_start" "date", "p_period_end" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_piece_work_payment"("p_worker_id" "uuid", "p_period_start" "date", "p_period_end" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_piece_work_payment"("p_worker_id" "uuid", "p_period_start" "date", "p_period_end" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_plant_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_plant_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_plant_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_profitability"("p_organization_id" "uuid", "p_parcel_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_profitability"("p_organization_id" "uuid", "p_parcel_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_profitability"("p_organization_id" "uuid", "p_parcel_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_task_payment"("p_task_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_task_payment"("p_task_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_task_payment"("p_task_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_add_user"("org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_add_user"("org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_add_user"("org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_create_farm"("org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_create_farm"("org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_create_farm"("org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_create_parcel"("org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_create_parcel"("org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_create_parcel"("org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_create_resource"("p_organization_id" "uuid", "p_resource_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."can_create_resource"("p_organization_id" "uuid", "p_resource_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_create_resource"("p_organization_id" "uuid", "p_resource_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_user_perform_action"("user_id" "uuid", "org_id" "uuid", "resource_name" "text", "action_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."can_user_perform_action"("user_id" "uuid", "org_id" "uuid", "resource_name" "text", "action_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_user_perform_action"("user_id" "uuid", "org_id" "uuid", "resource_name" "text", "action_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_overdue_tasks"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_overdue_tasks"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_overdue_tasks"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_system_admin_for_reference_tables"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_system_admin_for_reference_tables"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_system_admin_for_reference_tables"() TO "service_role";



GRANT ALL ON FUNCTION "public"."complete_task_with_payment"("p_task_id" "uuid", "p_units_completed" numeric, "p_quality_rating" integer, "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."complete_task_with_payment"("p_task_id" "uuid", "p_units_completed" numeric, "p_quality_rating" integer, "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."complete_task_with_payment"("p_task_id" "uuid", "p_units_completed" numeric, "p_quality_rating" integer, "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_default_subscription_for_org"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_default_subscription_for_org"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_default_subscription_for_org"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_material_issue_from_so"("p_sales_order_id" "uuid", "p_warehouse_id" "uuid", "p_issue_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."create_material_issue_from_so"("p_sales_order_id" "uuid", "p_warehouse_id" "uuid", "p_issue_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_material_issue_from_so"("p_sales_order_id" "uuid", "p_warehouse_id" "uuid", "p_issue_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_material_receipt_from_po"("p_purchase_order_id" "uuid", "p_warehouse_id" "uuid", "p_receipt_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."create_material_receipt_from_po"("p_purchase_order_id" "uuid", "p_warehouse_id" "uuid", "p_receipt_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_material_receipt_from_po"("p_purchase_order_id" "uuid", "p_warehouse_id" "uuid", "p_receipt_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_metayage_settlement_from_harvest"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_metayage_settlement_from_harvest"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_metayage_settlement_from_harvest"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_payment_journal_entry"("p_payment_record_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_payment_journal_entry"("p_payment_record_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_payment_journal_entry"("p_payment_record_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_role_from_template"("template_id" "uuid", "org_id" "uuid", "custom_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_role_from_template"("template_id" "uuid", "org_id" "uuid", "custom_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_role_from_template"("template_id" "uuid", "org_id" "uuid", "custom_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_sales_order_from_reception_batch"("p_reception_batch_id" "uuid", "p_customer_id" "uuid", "p_item_id" "uuid", "p_unit_price" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."create_sales_order_from_reception_batch"("p_reception_batch_id" "uuid", "p_customer_id" "uuid", "p_item_id" "uuid", "p_unit_price" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_sales_order_from_reception_batch"("p_reception_batch_id" "uuid", "p_customer_id" "uuid", "p_item_id" "uuid", "p_unit_price" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_stock_entry_from_reception_batch"("p_reception_batch_id" "uuid", "p_destination_warehouse_id" "uuid", "p_item_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_stock_entry_from_reception_batch"("p_reception_batch_id" "uuid", "p_destination_warehouse_id" "uuid", "p_item_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_stock_entry_from_reception_batch"("p_reception_batch_id" "uuid", "p_destination_warehouse_id" "uuid", "p_item_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_stock_journal_entry"("p_stock_entry_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_stock_journal_entry"("p_stock_entry_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_stock_journal_entry"("p_stock_entry_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_task_cost_journal_entry"("p_task_cost_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_task_cost_journal_entry"("p_task_cost_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_task_cost_journal_entry"("p_task_cost_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."debug_parcel_access"("test_user_id" "uuid", "test_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."debug_parcel_access"("test_user_id" "uuid", "test_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."debug_parcel_access"("test_user_id" "uuid", "test_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_all_users"() TO "anon";
GRANT ALL ON FUNCTION "public"."delete_all_users"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_all_users"() TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_user_cascade"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_user_cascade"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_user_cascade"("user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_subscription_on_session"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_subscription_on_session"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_subscription_on_session"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_single_default_template"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_single_default_template"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_single_default_template"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_delivery_note_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_delivery_note_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_delivery_note_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_invoice_number"("p_organization_id" "uuid", "p_invoice_type" "public"."invoice_type") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_invoice_number"("p_organization_id" "uuid", "p_invoice_type" "public"."invoice_type") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_invoice_number"("p_organization_id" "uuid", "p_invoice_type" "public"."invoice_type") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_item_code"("p_organization_id" "uuid", "p_item_group_id" "uuid", "p_prefix" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_item_code"("p_organization_id" "uuid", "p_item_group_id" "uuid", "p_prefix" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_item_code"("p_organization_id" "uuid", "p_item_group_id" "uuid", "p_prefix" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_journal_entry_number"("p_organization_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_journal_entry_number"("p_organization_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_journal_entry_number"("p_organization_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_lab_order_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_lab_order_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_lab_order_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_payment_number"("p_organization_id" "uuid", "p_payment_type" "public"."accounting_payment_type") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_payment_number"("p_organization_id" "uuid", "p_payment_type" "public"."accounting_payment_type") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_payment_number"("p_organization_id" "uuid", "p_payment_type" "public"."accounting_payment_type") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_purchase_order_number"("p_organization_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_purchase_order_number"("p_organization_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_purchase_order_number"("p_organization_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_quote_number"("p_organization_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_quote_number"("p_organization_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_quote_number"("p_organization_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_reception_batch_code"("p_organization_id" "uuid", "p_warehouse_id" "uuid", "p_culture_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_reception_batch_code"("p_organization_id" "uuid", "p_warehouse_id" "uuid", "p_culture_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_reception_batch_code"("p_organization_id" "uuid", "p_warehouse_id" "uuid", "p_culture_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_sales_order_number"("p_organization_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_sales_order_number"("p_organization_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_sales_order_number"("p_organization_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_stock_entry_number"("p_organization_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_stock_entry_number"("p_organization_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_stock_entry_number"("p_organization_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_account_balance"("p_account_id" "uuid", "p_as_of_date" "date", "p_organization_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_account_balance"("p_account_id" "uuid", "p_as_of_date" "date", "p_organization_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_account_balance"("p_account_id" "uuid", "p_as_of_date" "date", "p_organization_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_account_balance_period"("p_account_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_organization_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_account_balance_period"("p_account_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_organization_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_account_balance_period"("p_account_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_organization_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_user_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_user_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_user_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_expiring_items"("p_organization_id" "uuid", "p_days_ahead" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_expiring_items"("p_organization_id" "uuid", "p_days_ahead" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_expiring_items"("p_organization_id" "uuid", "p_days_ahead" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_farm_hierarchy_tree"("org_uuid" "uuid", "root_farm_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_farm_hierarchy_tree"("org_uuid" "uuid", "root_farm_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_farm_hierarchy_tree"("org_uuid" "uuid", "root_farm_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_farm_structures"("farm_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_farm_structures"("farm_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_farm_structures"("farm_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_harvest_statistics"("p_organization_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_harvest_statistics"("p_organization_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_harvest_statistics"("p_organization_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_item_stock_value"("p_item_id" "uuid", "p_warehouse_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_item_stock_value"("p_item_id" "uuid", "p_warehouse_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_item_stock_value"("p_item_id" "uuid", "p_warehouse_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_latest_satellite_data"("parcel_uuid" "uuid", "index_name_param" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_latest_satellite_data"("parcel_uuid" "uuid", "index_name_param" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_latest_satellite_data"("parcel_uuid" "uuid", "index_name_param" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_low_stock_items"("p_organization_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_low_stock_items"("p_organization_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_low_stock_items"("p_organization_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_organization_farms"("org_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_organization_farms"("org_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_organization_farms"("org_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_organization_role_hierarchy"("org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_organization_role_hierarchy"("org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_organization_role_hierarchy"("org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_organization_structures"("org_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_organization_structures"("org_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_organization_structures"("org_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_parcel_performance_summary"("p_organization_id" "uuid", "p_farm_id" "uuid", "p_parcel_id" "uuid", "p_from_date" "date", "p_to_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_parcel_performance_summary"("p_organization_id" "uuid", "p_farm_id" "uuid", "p_parcel_id" "uuid", "p_from_date" "date", "p_to_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_parcel_performance_summary"("p_organization_id" "uuid", "p_farm_id" "uuid", "p_parcel_id" "uuid", "p_from_date" "date", "p_to_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_parcels_for_satellite_processing"("org_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_parcels_for_satellite_processing"("org_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_parcels_for_satellite_processing"("org_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_planting_system_recommendations"("p_crop_category" "text", "p_crop_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_planting_system_recommendations"("p_crop_category" "text", "p_crop_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_planting_system_recommendations"("p_crop_category" "text", "p_crop_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_satellite_data_statistics"("parcel_uuid" "uuid", "index_name_param" "text", "start_date_param" "date", "end_date_param" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_satellite_data_statistics"("parcel_uuid" "uuid", "index_name_param" "text", "start_date_param" "date", "end_date_param" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_satellite_data_statistics"("parcel_uuid" "uuid", "index_name_param" "text", "start_date_param" "date", "end_date_param" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_effective_permissions"("user_id" "uuid", "org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_effective_permissions"("user_id" "uuid", "org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_effective_permissions"("user_id" "uuid", "org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_organizations"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_organizations"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_organizations"("user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_permissions"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_permissions"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_permissions"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_role"("user_id" "uuid", "org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_role"("user_id" "uuid", "org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_role"("user_id" "uuid", "org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_role_level"("user_id" "uuid", "org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_role_level"("user_id" "uuid", "org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_role_level"("user_id" "uuid", "org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_tasks"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_tasks"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_tasks"("user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_worker_advance_deductions"("p_worker_id" "uuid", "p_payment_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_worker_advance_deductions"("p_worker_id" "uuid", "p_payment_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_worker_advance_deductions"("p_worker_id" "uuid", "p_payment_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_worker_availability"("p_worker_id" "uuid", "p_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_worker_availability"("p_worker_id" "uuid", "p_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_worker_availability"("p_worker_id" "uuid", "p_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_invited_user_signup"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_invited_user_signup"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_invited_user_signup"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_feature_access"("org_id" "uuid", "feature_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."has_feature_access"("org_id" "uuid", "feature_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_feature_access"("org_id" "uuid", "feature_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."has_valid_subscription"("org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."has_valid_subscription"("org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_valid_subscription"("org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."initialize_default_subscription"() TO "anon";
GRANT ALL ON FUNCTION "public"."initialize_default_subscription"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."initialize_default_subscription"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_active_org_member"("user_id" "uuid", "org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_active_org_member"("user_id" "uuid", "org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_active_org_member"("user_id" "uuid", "org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_organization_admin"("org_id" "uuid", "user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_organization_admin"("org_id" "uuid", "user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_organization_admin"("org_id" "uuid", "user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_organization_owner"("org_id" "uuid", "user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_organization_owner"("org_id" "uuid", "user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_organization_owner"("org_id" "uuid", "user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_system_admin"("check_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_system_admin"("check_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_system_admin"("check_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_worker"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_worker"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_worker"("user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."post_opening_stock_balance"("p_opening_stock_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."post_opening_stock_balance"("p_opening_stock_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."post_opening_stock_balance"("p_opening_stock_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_unauthorized_subscription_creation"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_unauthorized_subscription_creation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_unauthorized_subscription_creation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."process_opening_stock_balance"() TO "anon";
GRANT ALL ON FUNCTION "public"."process_opening_stock_balance"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_opening_stock_balance"() TO "service_role";



GRANT ALL ON FUNCTION "public"."seed_chart_of_accounts"("org_id" "uuid", "currency_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."seed_chart_of_accounts"("org_id" "uuid", "currency_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."seed_chart_of_accounts"("org_id" "uuid", "currency_code" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."seed_default_item_groups"("p_organization_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."seed_default_item_groups"("p_organization_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."seed_default_item_groups"("p_organization_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."seed_default_work_units"("p_organization_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."seed_default_work_units"("p_organization_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."seed_default_work_units"("p_organization_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."seed_tree_data_for_new_organization"() TO "anon";
GRANT ALL ON FUNCTION "public"."seed_tree_data_for_new_organization"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."seed_tree_data_for_new_organization"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_lab_order_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_lab_order_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_lab_order_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_create_payment_journal"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_create_payment_journal"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_create_payment_journal"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_create_stock_journal"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_create_stock_journal"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_create_stock_journal"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_create_task_cost_journal"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_create_task_cost_journal"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_create_task_cost_journal"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_link_piece_work_to_payment"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_link_piece_work_to_payment"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_link_piece_work_to_payment"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_on_user_created"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_on_user_created"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_on_user_created"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_update_reception_batch_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_update_reception_batch_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_update_reception_batch_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_advance_balance"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_advance_balance"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_advance_balance"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_delivery_totals"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_delivery_totals"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_delivery_totals"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_document_template_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_document_template_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_document_template_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_expired_subscriptions"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_expired_subscriptions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_expired_subscriptions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_harvest_status_on_delivery"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_harvest_status_on_delivery"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_harvest_status_on_delivery"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_harvest_status_on_delivery_complete"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_harvest_status_on_delivery_complete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_harvest_status_on_delivery_complete"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_inventory_item_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_inventory_item_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_inventory_item_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_invoice_outstanding"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_invoice_outstanding"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_invoice_outstanding"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_invoice_totals"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_invoice_totals"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_invoice_totals"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_item_group_path"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_item_group_path"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_item_group_path"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_item_rates"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_item_rates"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_item_rates"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_lab_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_lab_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_lab_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_po_on_receipt_post"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_po_on_receipt_post"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_po_on_receipt_post"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_so_on_issue_post"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_so_on_issue_post"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_so_on_issue_post"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_stock_entry_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_stock_entry_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_stock_entry_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_stock_on_entry_post"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_stock_on_entry_post"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_stock_on_entry_post"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_subscription_limits"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_subscription_limits"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_subscription_limits"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_worker_stats_from_task"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_worker_stats_from_task"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_worker_stats_from_task"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_yield_variance"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_yield_variance"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_yield_variance"() TO "service_role";



GRANT ALL ON FUNCTION "public"."user_can_view_org_membership"("org_id" "uuid", "viewing_user_id" "uuid", "target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_can_view_org_membership"("org_id" "uuid", "viewing_user_id" "uuid", "target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_can_view_org_membership"("org_id" "uuid", "viewing_user_id" "uuid", "target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_has_permission"("user_id" "uuid", "permission_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."user_has_permission"("user_id" "uuid", "permission_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_permission"("user_id" "uuid", "permission_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_has_permission_for_org"("user_id" "uuid", "org_id" "uuid", "permission_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."user_has_permission_for_org"("user_id" "uuid", "org_id" "uuid", "permission_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_permission_for_org"("user_id" "uuid", "org_id" "uuid", "permission_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_has_role"("p_user_id" "uuid", "p_organization_id" "uuid", "p_role_names" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."user_has_role"("p_user_id" "uuid", "p_organization_id" "uuid", "p_role_names" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_role"("p_user_id" "uuid", "p_organization_id" "uuid", "p_role_names" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_journal_balance"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_journal_balance"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_journal_balance"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_role_assignment"("target_user_id" "uuid", "target_org_id" "uuid", "new_role_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_role_assignment"("target_user_id" "uuid", "target_org_id" "uuid", "new_role_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_role_assignment"("target_user_id" "uuid", "target_org_id" "uuid", "new_role_id" "uuid") TO "service_role";


















GRANT ALL ON TABLE "public"."accounting_payments" TO "anon";
GRANT ALL ON TABLE "public"."accounting_payments" TO "authenticated";
GRANT ALL ON TABLE "public"."accounting_payments" TO "service_role";



GRANT ALL ON TABLE "public"."payment_allocations" TO "anon";
GRANT ALL ON TABLE "public"."payment_allocations" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_allocations" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."accounting_payment_summary" TO "anon";
GRANT ALL ON TABLE "public"."accounting_payment_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."accounting_payment_summary" TO "service_role";



GRANT ALL ON TABLE "public"."accounts" TO "anon";
GRANT ALL ON TABLE "public"."accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."accounts" TO "service_role";



GRANT ALL ON TABLE "public"."tasks" TO "anon";
GRANT ALL ON TABLE "public"."tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."tasks" TO "service_role";



GRANT ALL ON TABLE "public"."workers" TO "anon";
GRANT ALL ON TABLE "public"."workers" TO "authenticated";
GRANT ALL ON TABLE "public"."workers" TO "service_role";



GRANT ALL ON TABLE "public"."active_workers_summary" TO "anon";
GRANT ALL ON TABLE "public"."active_workers_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."active_workers_summary" TO "service_role";



GRANT ALL ON TABLE "public"."analyses" TO "anon";
GRANT ALL ON TABLE "public"."analyses" TO "authenticated";
GRANT ALL ON TABLE "public"."analyses" TO "service_role";



GRANT ALL ON TABLE "public"."analysis_recommendations" TO "anon";
GRANT ALL ON TABLE "public"."analysis_recommendations" TO "authenticated";
GRANT ALL ON TABLE "public"."analysis_recommendations" TO "service_role";



GRANT ALL ON TABLE "public"."day_laborers" TO "anon";
GRANT ALL ON TABLE "public"."day_laborers" TO "authenticated";
GRANT ALL ON TABLE "public"."day_laborers" TO "service_role";



GRANT ALL ON TABLE "public"."farms" TO "anon";
GRANT ALL ON TABLE "public"."farms" TO "authenticated";
GRANT ALL ON TABLE "public"."farms" TO "service_role";



GRANT ALL ON TABLE "public"."organization_users" TO "anon";
GRANT ALL ON TABLE "public"."organization_users" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_users" TO "service_role";



GRANT ALL ON TABLE "public"."assignable_users" TO "anon";
GRANT ALL ON TABLE "public"."assignable_users" TO "authenticated";
GRANT ALL ON TABLE "public"."assignable_users" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."bank_accounts" TO "anon";
GRANT ALL ON TABLE "public"."bank_accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."bank_accounts" TO "service_role";



GRANT ALL ON TABLE "public"."cloud_coverage_checks" TO "anon";
GRANT ALL ON TABLE "public"."cloud_coverage_checks" TO "authenticated";
GRANT ALL ON TABLE "public"."cloud_coverage_checks" TO "service_role";



GRANT ALL ON TABLE "public"."cost_categories" TO "anon";
GRANT ALL ON TABLE "public"."cost_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."cost_categories" TO "service_role";



GRANT ALL ON TABLE "public"."cost_centers" TO "anon";
GRANT ALL ON TABLE "public"."cost_centers" TO "authenticated";
GRANT ALL ON TABLE "public"."cost_centers" TO "service_role";



GRANT ALL ON TABLE "public"."costs" TO "anon";
GRANT ALL ON TABLE "public"."costs" TO "authenticated";
GRANT ALL ON TABLE "public"."costs" TO "service_role";



GRANT ALL ON TABLE "public"."crop_categories" TO "anon";
GRANT ALL ON TABLE "public"."crop_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."crop_categories" TO "service_role";



GRANT ALL ON TABLE "public"."crop_types" TO "anon";
GRANT ALL ON TABLE "public"."crop_types" TO "authenticated";
GRANT ALL ON TABLE "public"."crop_types" TO "service_role";



GRANT ALL ON TABLE "public"."crop_varieties" TO "anon";
GRANT ALL ON TABLE "public"."crop_varieties" TO "authenticated";
GRANT ALL ON TABLE "public"."crop_varieties" TO "service_role";



GRANT ALL ON TABLE "public"."crops" TO "anon";
GRANT ALL ON TABLE "public"."crops" TO "authenticated";
GRANT ALL ON TABLE "public"."crops" TO "service_role";



GRANT ALL ON TABLE "public"."currencies" TO "anon";
GRANT ALL ON TABLE "public"."currencies" TO "authenticated";
GRANT ALL ON TABLE "public"."currencies" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON TABLE "public"."current_session_status" TO "anon";
GRANT ALL ON TABLE "public"."current_session_status" TO "authenticated";
GRANT ALL ON TABLE "public"."current_session_status" TO "service_role";



GRANT ALL ON TABLE "public"."customers" TO "anon";
GRANT ALL ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";



GRANT ALL ON TABLE "public"."dashboard_settings" TO "anon";
GRANT ALL ON TABLE "public"."dashboard_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."dashboard_settings" TO "service_role";



GRANT ALL ON TABLE "public"."deliveries" TO "anon";
GRANT ALL ON TABLE "public"."deliveries" TO "authenticated";
GRANT ALL ON TABLE "public"."deliveries" TO "service_role";



GRANT ALL ON TABLE "public"."delivery_items" TO "anon";
GRANT ALL ON TABLE "public"."delivery_items" TO "authenticated";
GRANT ALL ON TABLE "public"."delivery_items" TO "service_role";



GRANT ALL ON TABLE "public"."delivery_tracking" TO "anon";
GRANT ALL ON TABLE "public"."delivery_tracking" TO "authenticated";
GRANT ALL ON TABLE "public"."delivery_tracking" TO "service_role";



GRANT ALL ON TABLE "public"."delivery_summary" TO "anon";
GRANT ALL ON TABLE "public"."delivery_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."delivery_summary" TO "service_role";



GRANT ALL ON TABLE "public"."document_templates" TO "anon";
GRANT ALL ON TABLE "public"."document_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."document_templates" TO "service_role";



GRANT ALL ON TABLE "public"."employees" TO "anon";
GRANT ALL ON TABLE "public"."employees" TO "authenticated";
GRANT ALL ON TABLE "public"."employees" TO "service_role";



GRANT ALL ON TABLE "public"."farm_management_roles" TO "anon";
GRANT ALL ON TABLE "public"."farm_management_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."farm_management_roles" TO "service_role";



GRANT ALL ON TABLE "public"."financial_transactions" TO "anon";
GRANT ALL ON TABLE "public"."financial_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."financial_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."harvest_forecasts" TO "anon";
GRANT ALL ON TABLE "public"."harvest_forecasts" TO "authenticated";
GRANT ALL ON TABLE "public"."harvest_forecasts" TO "service_role";



GRANT ALL ON TABLE "public"."harvest_records" TO "anon";
GRANT ALL ON TABLE "public"."harvest_records" TO "authenticated";
GRANT ALL ON TABLE "public"."harvest_records" TO "service_role";



GRANT ALL ON TABLE "public"."harvests" TO "anon";
GRANT ALL ON TABLE "public"."harvests" TO "authenticated";
GRANT ALL ON TABLE "public"."harvests" TO "service_role";



GRANT ALL ON TABLE "public"."parcels" TO "anon";
GRANT ALL ON TABLE "public"."parcels" TO "authenticated";
GRANT ALL ON TABLE "public"."parcels" TO "service_role";



GRANT ALL ON TABLE "public"."harvest_summary" TO "anon";
GRANT ALL ON TABLE "public"."harvest_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."harvest_summary" TO "service_role";



GRANT ALL ON TABLE "public"."inventory" TO "anon";
GRANT ALL ON TABLE "public"."inventory" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_batches" TO "anon";
GRANT ALL ON TABLE "public"."inventory_batches" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_batches" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_serial_numbers" TO "anon";
GRANT ALL ON TABLE "public"."inventory_serial_numbers" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_serial_numbers" TO "service_role";



GRANT ALL ON TABLE "public"."invoice_items" TO "anon";
GRANT ALL ON TABLE "public"."invoice_items" TO "authenticated";
GRANT ALL ON TABLE "public"."invoice_items" TO "service_role";



GRANT ALL ON TABLE "public"."invoices" TO "anon";
GRANT ALL ON TABLE "public"."invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."invoices" TO "service_role";



GRANT ALL ON TABLE "public"."item_customer_details" TO "anon";
GRANT ALL ON TABLE "public"."item_customer_details" TO "authenticated";
GRANT ALL ON TABLE "public"."item_customer_details" TO "service_role";



GRANT ALL ON TABLE "public"."item_groups" TO "anon";
GRANT ALL ON TABLE "public"."item_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."item_groups" TO "service_role";



GRANT ALL ON TABLE "public"."item_prices" TO "anon";
GRANT ALL ON TABLE "public"."item_prices" TO "authenticated";
GRANT ALL ON TABLE "public"."item_prices" TO "service_role";



GRANT ALL ON TABLE "public"."item_supplier_details" TO "anon";
GRANT ALL ON TABLE "public"."item_supplier_details" TO "authenticated";
GRANT ALL ON TABLE "public"."item_supplier_details" TO "service_role";



GRANT ALL ON TABLE "public"."item_unit_conversions" TO "anon";
GRANT ALL ON TABLE "public"."item_unit_conversions" TO "authenticated";
GRANT ALL ON TABLE "public"."item_unit_conversions" TO "service_role";



GRANT ALL ON TABLE "public"."item_variants" TO "anon";
GRANT ALL ON TABLE "public"."item_variants" TO "authenticated";
GRANT ALL ON TABLE "public"."item_variants" TO "service_role";



GRANT ALL ON TABLE "public"."items" TO "anon";
GRANT ALL ON TABLE "public"."items" TO "authenticated";
GRANT ALL ON TABLE "public"."items" TO "service_role";



GRANT ALL ON TABLE "public"."journal_entries" TO "anon";
GRANT ALL ON TABLE "public"."journal_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."journal_entries" TO "service_role";



GRANT ALL ON TABLE "public"."journal_items" TO "anon";
GRANT ALL ON TABLE "public"."journal_items" TO "authenticated";
GRANT ALL ON TABLE "public"."journal_items" TO "service_role";



GRANT ALL ON TABLE "public"."journal_entry_lines" TO "anon";
GRANT ALL ON TABLE "public"."journal_entry_lines" TO "authenticated";
GRANT ALL ON TABLE "public"."journal_entry_lines" TO "service_role";



GRANT ALL ON TABLE "public"."lab_result_parameters" TO "anon";
GRANT ALL ON TABLE "public"."lab_result_parameters" TO "authenticated";
GRANT ALL ON TABLE "public"."lab_result_parameters" TO "service_role";



GRANT ALL ON TABLE "public"."lab_service_orders" TO "anon";
GRANT ALL ON TABLE "public"."lab_service_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."lab_service_orders" TO "service_role";



GRANT ALL ON TABLE "public"."lab_service_providers" TO "anon";
GRANT ALL ON TABLE "public"."lab_service_providers" TO "authenticated";
GRANT ALL ON TABLE "public"."lab_service_providers" TO "service_role";



GRANT ALL ON TABLE "public"."lab_service_recommendations" TO "anon";
GRANT ALL ON TABLE "public"."lab_service_recommendations" TO "authenticated";
GRANT ALL ON TABLE "public"."lab_service_recommendations" TO "service_role";



GRANT ALL ON TABLE "public"."lab_service_types" TO "anon";
GRANT ALL ON TABLE "public"."lab_service_types" TO "authenticated";
GRANT ALL ON TABLE "public"."lab_service_types" TO "service_role";



GRANT ALL ON TABLE "public"."livestock" TO "anon";
GRANT ALL ON TABLE "public"."livestock" TO "authenticated";
GRANT ALL ON TABLE "public"."livestock" TO "service_role";



GRANT ALL ON TABLE "public"."metayage_settlements" TO "anon";
GRANT ALL ON TABLE "public"."metayage_settlements" TO "authenticated";
GRANT ALL ON TABLE "public"."metayage_settlements" TO "service_role";



GRANT ALL ON TABLE "public"."opening_stock_balances" TO "anon";
GRANT ALL ON TABLE "public"."opening_stock_balances" TO "authenticated";
GRANT ALL ON TABLE "public"."opening_stock_balances" TO "service_role";



GRANT ALL ON TABLE "public"."parcel_reports" TO "anon";
GRANT ALL ON TABLE "public"."parcel_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."parcel_reports" TO "service_role";



GRANT ALL ON TABLE "public"."payment_advances" TO "anon";
GRANT ALL ON TABLE "public"."payment_advances" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_advances" TO "service_role";



GRANT ALL ON TABLE "public"."payment_bonuses" TO "anon";
GRANT ALL ON TABLE "public"."payment_bonuses" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_bonuses" TO "service_role";



GRANT ALL ON TABLE "public"."payment_deductions" TO "anon";
GRANT ALL ON TABLE "public"."payment_deductions" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_deductions" TO "service_role";



GRANT ALL ON TABLE "public"."payment_records" TO "anon";
GRANT ALL ON TABLE "public"."payment_records" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_records" TO "service_role";



GRANT ALL ON TABLE "public"."payment_summary" TO "anon";
GRANT ALL ON TABLE "public"."payment_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_summary" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."performance_alerts" TO "anon";
GRANT ALL ON TABLE "public"."performance_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."performance_alerts" TO "service_role";



GRANT ALL ON TABLE "public"."permission_groups" TO "anon";
GRANT ALL ON TABLE "public"."permission_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."permission_groups" TO "service_role";



GRANT ALL ON TABLE "public"."permissions" TO "anon";
GRANT ALL ON TABLE "public"."permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."permissions" TO "service_role";



GRANT ALL ON TABLE "public"."piece_work_records" TO "anon";
GRANT ALL ON TABLE "public"."piece_work_records" TO "authenticated";
GRANT ALL ON TABLE "public"."piece_work_records" TO "service_role";



GRANT ALL ON TABLE "public"."plantation_types" TO "anon";
GRANT ALL ON TABLE "public"."plantation_types" TO "authenticated";
GRANT ALL ON TABLE "public"."plantation_types" TO "service_role";



GRANT ALL ON TABLE "public"."product_categories" TO "anon";
GRANT ALL ON TABLE "public"."product_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."product_categories" TO "service_role";



GRANT ALL ON TABLE "public"."product_subcategories" TO "anon";
GRANT ALL ON TABLE "public"."product_subcategories" TO "authenticated";
GRANT ALL ON TABLE "public"."product_subcategories" TO "service_role";



GRANT ALL ON TABLE "public"."profitability_snapshots" TO "anon";
GRANT ALL ON TABLE "public"."profitability_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."profitability_snapshots" TO "service_role";



GRANT ALL ON TABLE "public"."purchase_order_items" TO "anon";
GRANT ALL ON TABLE "public"."purchase_order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."purchase_order_items" TO "service_role";



GRANT ALL ON TABLE "public"."purchase_orders" TO "anon";
GRANT ALL ON TABLE "public"."purchase_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."purchase_orders" TO "service_role";



GRANT ALL ON TABLE "public"."quote_items" TO "anon";
GRANT ALL ON TABLE "public"."quote_items" TO "authenticated";
GRANT ALL ON TABLE "public"."quote_items" TO "service_role";



GRANT ALL ON TABLE "public"."quotes" TO "anon";
GRANT ALL ON TABLE "public"."quotes" TO "authenticated";
GRANT ALL ON TABLE "public"."quotes" TO "service_role";



GRANT ALL ON TABLE "public"."reception_batches" TO "anon";
GRANT ALL ON TABLE "public"."reception_batches" TO "authenticated";
GRANT ALL ON TABLE "public"."reception_batches" TO "service_role";



GRANT ALL ON TABLE "public"."revenues" TO "anon";
GRANT ALL ON TABLE "public"."revenues" TO "authenticated";
GRANT ALL ON TABLE "public"."revenues" TO "service_role";



GRANT ALL ON TABLE "public"."role_assignments_audit" TO "anon";
GRANT ALL ON TABLE "public"."role_assignments_audit" TO "authenticated";
GRANT ALL ON TABLE "public"."role_assignments_audit" TO "service_role";



GRANT ALL ON TABLE "public"."role_permissions" TO "anon";
GRANT ALL ON TABLE "public"."role_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."role_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."role_templates" TO "anon";
GRANT ALL ON TABLE "public"."role_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."role_templates" TO "service_role";



GRANT ALL ON TABLE "public"."roles" TO "anon";
GRANT ALL ON TABLE "public"."roles" TO "authenticated";
GRANT ALL ON TABLE "public"."roles" TO "service_role";



GRANT ALL ON TABLE "public"."sales_order_items" TO "anon";
GRANT ALL ON TABLE "public"."sales_order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."sales_order_items" TO "service_role";



GRANT ALL ON TABLE "public"."sales_orders" TO "anon";
GRANT ALL ON TABLE "public"."sales_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."sales_orders" TO "service_role";



GRANT ALL ON TABLE "public"."sample_collection_schedules" TO "anon";
GRANT ALL ON TABLE "public"."sample_collection_schedules" TO "authenticated";
GRANT ALL ON TABLE "public"."sample_collection_schedules" TO "service_role";



GRANT ALL ON TABLE "public"."satellite_aois" TO "anon";
GRANT ALL ON TABLE "public"."satellite_aois" TO "authenticated";
GRANT ALL ON TABLE "public"."satellite_aois" TO "service_role";



GRANT ALL ON TABLE "public"."satellite_files" TO "anon";
GRANT ALL ON TABLE "public"."satellite_files" TO "authenticated";
GRANT ALL ON TABLE "public"."satellite_files" TO "service_role";



GRANT ALL ON TABLE "public"."satellite_indices_data" TO "anon";
GRANT ALL ON TABLE "public"."satellite_indices_data" TO "authenticated";
GRANT ALL ON TABLE "public"."satellite_indices_data" TO "service_role";



GRANT ALL ON TABLE "public"."satellite_processing_jobs" TO "anon";
GRANT ALL ON TABLE "public"."satellite_processing_jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."satellite_processing_jobs" TO "service_role";



GRANT ALL ON TABLE "public"."satellite_processing_tasks" TO "anon";
GRANT ALL ON TABLE "public"."satellite_processing_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."satellite_processing_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."soil_analyses" TO "anon";
GRANT ALL ON TABLE "public"."soil_analyses" TO "authenticated";
GRANT ALL ON TABLE "public"."soil_analyses" TO "service_role";



GRANT ALL ON TABLE "public"."stock_account_mappings" TO "anon";
GRANT ALL ON TABLE "public"."stock_account_mappings" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_account_mappings" TO "service_role";



GRANT ALL ON TABLE "public"."stock_closing_entries" TO "anon";
GRANT ALL ON TABLE "public"."stock_closing_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_closing_entries" TO "service_role";



GRANT ALL ON TABLE "public"."stock_closing_items" TO "anon";
GRANT ALL ON TABLE "public"."stock_closing_items" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_closing_items" TO "service_role";



GRANT ALL ON TABLE "public"."stock_entries" TO "anon";
GRANT ALL ON TABLE "public"."stock_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_entries" TO "service_role";



GRANT ALL ON TABLE "public"."stock_entry_items" TO "anon";
GRANT ALL ON TABLE "public"."stock_entry_items" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_entry_items" TO "service_role";



GRANT ALL ON TABLE "public"."stock_movements" TO "anon";
GRANT ALL ON TABLE "public"."stock_movements" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_movements" TO "service_role";



GRANT ALL ON TABLE "public"."stock_valuation" TO "anon";
GRANT ALL ON TABLE "public"."stock_valuation" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_valuation" TO "service_role";



GRANT ALL ON TABLE "public"."structures" TO "anon";
GRANT ALL ON TABLE "public"."structures" TO "authenticated";
GRANT ALL ON TABLE "public"."structures" TO "service_role";



GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_status" TO "anon";
GRANT ALL ON TABLE "public"."subscription_status" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_status" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_usage" TO "anon";
GRANT ALL ON TABLE "public"."subscription_usage" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_usage" TO "service_role";



GRANT ALL ON TABLE "public"."suppliers" TO "anon";
GRANT ALL ON TABLE "public"."suppliers" TO "authenticated";
GRANT ALL ON TABLE "public"."suppliers" TO "service_role";



GRANT ALL ON TABLE "public"."task_categories" TO "anon";
GRANT ALL ON TABLE "public"."task_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."task_categories" TO "service_role";



GRANT ALL ON TABLE "public"."task_comments" TO "anon";
GRANT ALL ON TABLE "public"."task_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."task_comments" TO "service_role";



GRANT ALL ON TABLE "public"."task_costs" TO "anon";
GRANT ALL ON TABLE "public"."task_costs" TO "authenticated";
GRANT ALL ON TABLE "public"."task_costs" TO "service_role";



GRANT ALL ON TABLE "public"."task_dependencies" TO "anon";
GRANT ALL ON TABLE "public"."task_dependencies" TO "authenticated";
GRANT ALL ON TABLE "public"."task_dependencies" TO "service_role";



GRANT ALL ON TABLE "public"."task_equipment" TO "anon";
GRANT ALL ON TABLE "public"."task_equipment" TO "authenticated";
GRANT ALL ON TABLE "public"."task_equipment" TO "service_role";



GRANT ALL ON TABLE "public"."task_summary" TO "anon";
GRANT ALL ON TABLE "public"."task_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."task_summary" TO "service_role";



GRANT ALL ON TABLE "public"."task_templates" TO "anon";
GRANT ALL ON TABLE "public"."task_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."task_templates" TO "service_role";



GRANT ALL ON TABLE "public"."task_time_logs" TO "anon";
GRANT ALL ON TABLE "public"."task_time_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."task_time_logs" TO "service_role";



GRANT ALL ON TABLE "public"."taxes" TO "anon";
GRANT ALL ON TABLE "public"."taxes" TO "authenticated";
GRANT ALL ON TABLE "public"."taxes" TO "service_role";



GRANT ALL ON TABLE "public"."temp_user_id" TO "anon";
GRANT ALL ON TABLE "public"."temp_user_id" TO "authenticated";
GRANT ALL ON TABLE "public"."temp_user_id" TO "service_role";



GRANT ALL ON TABLE "public"."test_types" TO "anon";
GRANT ALL ON TABLE "public"."test_types" TO "authenticated";
GRANT ALL ON TABLE "public"."test_types" TO "service_role";



GRANT ALL ON TABLE "public"."tree_categories" TO "anon";
GRANT ALL ON TABLE "public"."tree_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."tree_categories" TO "service_role";



GRANT ALL ON TABLE "public"."trees" TO "anon";
GRANT ALL ON TABLE "public"."trees" TO "authenticated";
GRANT ALL ON TABLE "public"."trees" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."utilities" TO "anon";
GRANT ALL ON TABLE "public"."utilities" TO "authenticated";
GRANT ALL ON TABLE "public"."utilities" TO "service_role";



GRANT ALL ON TABLE "public"."vw_account_balances" TO "anon";
GRANT ALL ON TABLE "public"."vw_account_balances" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_account_balances" TO "service_role";



GRANT ALL ON TABLE "public"."vw_invoice_aging" TO "anon";
GRANT ALL ON TABLE "public"."vw_invoice_aging" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_invoice_aging" TO "service_role";



GRANT ALL ON TABLE "public"."vw_ledger" TO "anon";
GRANT ALL ON TABLE "public"."vw_ledger" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_ledger" TO "service_role";



GRANT ALL ON TABLE "public"."warehouses" TO "anon";
GRANT ALL ON TABLE "public"."warehouses" TO "authenticated";
GRANT ALL ON TABLE "public"."warehouses" TO "service_role";



GRANT ALL ON TABLE "public"."work_records" TO "anon";
GRANT ALL ON TABLE "public"."work_records" TO "authenticated";
GRANT ALL ON TABLE "public"."work_records" TO "service_role";



GRANT ALL ON TABLE "public"."work_units" TO "anon";
GRANT ALL ON TABLE "public"."work_units" TO "authenticated";
GRANT ALL ON TABLE "public"."work_units" TO "service_role";



GRANT ALL ON TABLE "public"."worker_payment_history" TO "anon";
GRANT ALL ON TABLE "public"."worker_payment_history" TO "authenticated";
GRANT ALL ON TABLE "public"."worker_payment_history" TO "service_role";



GRANT ALL ON TABLE "public"."worker_payment_summary" TO "anon";
GRANT ALL ON TABLE "public"."worker_payment_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."worker_payment_summary" TO "service_role";



GRANT ALL ON TABLE "public"."yield_benchmarks" TO "anon";
GRANT ALL ON TABLE "public"."yield_benchmarks" TO "authenticated";
GRANT ALL ON TABLE "public"."yield_benchmarks" TO "service_role";



GRANT ALL ON TABLE "public"."yield_history" TO "anon";
GRANT ALL ON TABLE "public"."yield_history" TO "authenticated";
GRANT ALL ON TABLE "public"."yield_history" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































RESET ALL;
