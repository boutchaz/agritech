


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


CREATE OR REPLACE FUNCTION "public"."assign_role_with_audit"("target_user_id" "uuid", "target_org_id" "uuid", "new_role_id" "uuid", "reason" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
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


CREATE OR REPLACE FUNCTION "public"."block_write_without_subscription"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  user_org_id UUID;
  is_valid BOOLEAN;
BEGIN
  -- Get user's organization
  SELECT organization_id INTO user_org_id
  FROM organization_users
  WHERE user_id = auth.uid()
    AND is_active = true
  LIMIT 1;

  -- Check subscription
  IF user_org_id IS NOT NULL THEN
    is_valid := has_valid_subscription(user_org_id);

    IF NOT is_valid THEN
      RAISE EXCEPTION 'Cannot perform this operation: Active subscription required'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."block_write_without_subscription"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."block_write_without_subscription"() IS 'Trigger function that blocks INSERT/UPDATE/DELETE operations on tables if user organization does not have valid subscription.';



CREATE OR REPLACE FUNCTION "public"."calculate_metayage_share"("p_worker_id" "uuid", "p_gross_revenue" numeric, "p_total_charges" numeric DEFAULT 0) RETURNS numeric
    LANGUAGE "plpgsql" SECURITY DEFINER
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


CREATE OR REPLACE FUNCTION "public"."calculate_profitability"("p_organization_id" "uuid", "p_parcel_id" "uuid" DEFAULT NULL::"uuid", "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date") RETURNS TABLE("parcel_id" "uuid", "parcel_name" "text", "total_costs" numeric, "total_revenue" numeric, "net_profit" numeric, "profit_margin" numeric, "cost_breakdown" "jsonb", "revenue_breakdown" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
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


CREATE OR REPLACE FUNCTION "public"."can_add_user"("org_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
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
    AS $$
DECLARE
  v_subscription RECORD;
  v_current_count INTEGER;
  v_limit INTEGER;
BEGIN
  -- Get subscription
  SELECT * INTO v_subscription
  FROM public.subscriptions
  WHERE organization_id = p_organization_id;

  -- No subscription = cannot create
  IF v_subscription IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check if subscription is active
  IF v_subscription.status NOT IN ('active', 'trialing') THEN
    RETURN FALSE;
  END IF;

  -- Check specific resource limits
  CASE p_resource_type
    WHEN 'farm' THEN
      SELECT COUNT(*) INTO v_current_count
      FROM public.farms
      WHERE organization_id = p_organization_id;

      v_limit := v_subscription.max_farms;

    WHEN 'parcel' THEN
      SELECT COUNT(*) INTO v_current_count
      FROM public.parcels p
      JOIN public.farms f ON f.id = p.farm_id
      WHERE f.organization_id = p_organization_id;

      v_limit := v_subscription.max_parcels;

    WHEN 'user' THEN
      SELECT COUNT(*) INTO v_current_count
      FROM public.organization_users
      WHERE organization_id = p_organization_id
        AND is_active = true;

      v_limit := v_subscription.max_users;

    WHEN 'satellite_report' THEN
      SELECT COUNT(*) INTO v_current_count
      FROM public.satellite_reports
      WHERE organization_id = p_organization_id
        AND created_at >= v_subscription.current_period_start;

      v_limit := v_subscription.max_satellite_reports;

    ELSE
      RETURN TRUE; -- Unknown resource type, allow
  END CASE;

  -- Check limit
  RETURN v_current_count < v_limit;
END;
$$;


ALTER FUNCTION "public"."can_create_resource"("p_organization_id" "uuid", "p_resource_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_user_perform_action"("user_id" "uuid", "org_id" "uuid", "resource_name" "text", "action_name" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
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


CREATE OR REPLACE FUNCTION "public"."check_system_admin_for_reference_tables"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
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


CREATE OR REPLACE FUNCTION "public"."create_default_subscription_for_org"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
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



CREATE OR REPLACE FUNCTION "public"."create_role_from_template"("template_id" "uuid", "org_id" "uuid", "custom_name" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
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


CREATE OR REPLACE FUNCTION "public"."debug_parcel_access"("test_user_id" "uuid", "test_org_id" "uuid") RETURNS TABLE("can_see_farms" boolean, "is_org_member" boolean, "farm_count" integer, "parcel_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
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


CREATE OR REPLACE FUNCTION "public"."handle_invited_user_signup"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
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
    SET "search_path" TO 'public'
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

  -- Get the organization_admin role
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
    AS $$
DECLARE
  sub_record RECORD;
  is_valid BOOLEAN;
BEGIN
  -- Get subscription for organization
  SELECT * INTO sub_record
  FROM public.subscriptions
  WHERE organization_id = org_id
  LIMIT 1;

  -- No subscription = invalid
  IF sub_record IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check status
  IF sub_record.status NOT IN ('active', 'trialing') THEN
    RETURN FALSE;
  END IF;

  -- Check expiration (with grace period of 0 days)
  IF sub_record.current_period_end IS NOT NULL THEN
    IF sub_record.current_period_end < NOW() THEN
      RETURN FALSE;
    END IF;
  END IF;

  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."has_valid_subscription"("org_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."has_valid_subscription"("org_id" "uuid") IS 'Checks if an organization has a valid active subscription';



CREATE OR REPLACE FUNCTION "public"."initialize_default_subscription"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
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
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.organization_users ou
        WHERE ou.user_id = $1 
        AND ou.organization_id = $2 
        AND ou.is_active = true
    );
END;
$_$;


ALTER FUNCTION "public"."is_active_org_member"("user_id" "uuid", "org_id" "uuid") OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."prevent_unauthorized_subscription_creation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Allow if:
  -- 1. Called by service_role
  -- 2. Called from our org creation trigger (flag is set)
  IF current_setting('role', true) = 'service_role' OR
     current_setting('app.creating_org_subscription', true) = 'true' THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Subscriptions can only be created via payment processor or admin';
END;
$$;


ALTER FUNCTION "public"."prevent_unauthorized_subscription_creation"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."prevent_unauthorized_subscription_creation"() IS 'Prevents unauthorized subscription creation. Allows service_role and trusted triggers only.';



CREATE OR REPLACE FUNCTION "public"."seed_tree_data_for_new_organization"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
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



CREATE OR REPLACE FUNCTION "public"."update_expired_subscriptions"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
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


CREATE OR REPLACE FUNCTION "public"."user_has_permission"("user_id" "uuid", "permission_name" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
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
    LANGUAGE "plpgsql" SECURITY DEFINER
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
        AND p.name = $3
    );
END;
$_$;


ALTER FUNCTION "public"."user_has_permission_for_org"("user_id" "uuid", "org_id" "uuid", "permission_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_has_role"("p_user_id" "uuid", "p_organization_id" "uuid", "p_role_names" "text"[]) RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.organization_users ou
    JOIN public.roles r ON r.id = ou.role_id
    WHERE ou.user_id = p_user_id
      AND ou.organization_id = p_organization_id
      AND ou.is_active = true
      AND r.name = ANY(p_role_names)
  );
END;
$$;


ALTER FUNCTION "public"."user_has_role"("p_user_id" "uuid", "p_organization_id" "uuid", "p_role_names" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_role_assignment"("target_user_id" "uuid", "target_org_id" "uuid", "new_role_id" "uuid") RETURNS TABLE("is_valid" boolean, "error_message" "text", "warnings" "text"[])
    LANGUAGE "plpgsql" SECURITY DEFINER
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
    "currency" "text" DEFAULT 'EUR'::"text",
    "currency_symbol" "text" DEFAULT '€'::"text",
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



COMMENT ON COLUMN "public"."organizations"."currency" IS 'ISO 4217 currency code (e.g., EUR, USD, MAD, DH)';



COMMENT ON COLUMN "public"."organizations"."currency_symbol" IS 'Currency symbol for display (e.g., €, $, DH)';



COMMENT ON COLUMN "public"."organizations"."timezone" IS 'IANA timezone identifier (e.g., Europe/Paris, Africa/Casablanca)';



COMMENT ON COLUMN "public"."organizations"."language" IS 'ISO 639-1 language code (e.g., en, fr, ar)';



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
    CONSTRAINT "valid_metayage_percentage" CHECK ((("metayage_percentage" IS NULL) OR (("metayage_percentage" > (0)::numeric) AND ("metayage_percentage" <= (50)::numeric)))),
    CONSTRAINT "valid_worker_config" CHECK (((("worker_type" = 'fixed_salary'::"public"."worker_type") AND ("monthly_salary" IS NOT NULL)) OR (("worker_type" = 'daily_worker'::"public"."worker_type") AND ("daily_rate" IS NOT NULL)) OR (("worker_type" = 'metayage'::"public"."worker_type") AND ("metayage_percentage" IS NOT NULL) AND ("metayage_type" IS NOT NULL))))
);


ALTER TABLE "public"."workers" OWNER TO "postgres";


COMMENT ON TABLE "public"."workers" IS 'Unified worker management supporting fixed employees, daily workers, and métayage (Khammass/Rebâa)';



CREATE OR REPLACE VIEW "public"."active_workers_summary" AS
 SELECT "w"."id",
    "w"."organization_id",
    "w"."farm_id",
    "w"."first_name",
    "w"."last_name",
    "w"."cin",
    "w"."phone",
    "w"."email",
    "w"."address",
    "w"."date_of_birth",
    "w"."worker_type",
    "w"."position",
    "w"."hire_date",
    "w"."end_date",
    "w"."is_active",
    "w"."is_cnss_declared",
    "w"."cnss_number",
    "w"."monthly_salary",
    "w"."daily_rate",
    "w"."metayage_type",
    "w"."metayage_percentage",
    "w"."calculation_basis",
    "w"."metayage_contract_details",
    "w"."specialties",
    "w"."certifications",
    "w"."payment_frequency",
    "w"."bank_account",
    "w"."payment_method",
    "w"."total_days_worked",
    "w"."total_tasks_completed",
    "w"."notes",
    "w"."documents",
    "w"."created_at",
    "w"."updated_at",
    "w"."created_by",
    "o"."name" AS "organization_name",
    "f"."name" AS "farm_name",
        CASE
            WHEN ("w"."worker_type" = 'fixed_salary'::"public"."worker_type") THEN COALESCE(("w"."monthly_salary")::"text", 'N/A'::"text")
            WHEN ("w"."worker_type" = 'daily_worker'::"public"."worker_type") THEN COALESCE((("w"."daily_rate")::"text" || ' DH/jour'::"text"), 'N/A'::"text")
            WHEN ("w"."worker_type" = 'metayage'::"public"."worker_type") THEN COALESCE((((("w"."metayage_percentage")::"text" || '% ('::"text") ||
            CASE "w"."metayage_type"
                WHEN 'khammass'::"public"."metayage_type" THEN 'Khammass'::"text"
                WHEN 'rebaa'::"public"."metayage_type" THEN 'Rebâa'::"text"
                WHEN 'tholth'::"public"."metayage_type" THEN 'Tholth'::"text"
                ELSE 'Custom'::"text"
            END) || ')'::"text"), 'N/A'::"text")
            ELSE NULL::"text"
        END AS "compensation_display"
   FROM (("public"."workers" "w"
     LEFT JOIN "public"."organizations" "o" ON (("o"."id" = "w"."organization_id")))
     LEFT JOIN "public"."farms" "f" ON (("f"."id" = "w"."farm_id")))
  WHERE ("w"."is_active" = true);


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


CREATE OR REPLACE VIEW "public"."current_session_status" AS
 SELECT "auth"."uid"() AS "user_id",
    "ou"."organization_id",
    "o"."name" AS "organization_name",
    "s"."plan_type",
    "s"."status" AS "subscription_status",
    "public"."has_valid_subscription"("ou"."organization_id") AS "has_access",
        CASE
            WHEN "public"."has_valid_subscription"("ou"."organization_id") THEN '✅ ACCESS GRANTED'::"text"
            ELSE '❌ ACCESS BLOCKED - Subscription Required'::"text"
        END AS "access_status"
   FROM (("public"."organization_users" "ou"
     JOIN "public"."organizations" "o" ON (("ou"."organization_id" = "o"."id")))
     LEFT JOIN "public"."subscriptions" "s" ON (("ou"."organization_id" = "s"."organization_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."is_active" = true))
 LIMIT 1;


ALTER VIEW "public"."current_session_status" OWNER TO "postgres";


COMMENT ON VIEW "public"."current_session_status" IS 'Shows current user session subscription status. Use to debug why user is or is not blocked.';



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
    "warehouse_id" "uuid"
);


ALTER TABLE "public"."inventory" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_items" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "farm_id" "uuid",
    "name" "text" NOT NULL,
    "category" "text",
    "quantity" numeric(10,2) DEFAULT 0 NOT NULL,
    "unit" "text" NOT NULL,
    "minimum_stock" numeric(10,2),
    "cost_per_unit" numeric(10,2),
    "supplier" "text",
    "location" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "inventory_items_category_check" CHECK (("category" = ANY (ARRAY['seeds'::"text", 'fertilizers'::"text", 'pesticides'::"text", 'equipment'::"text", 'tools'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."inventory_items" OWNER TO "postgres";


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
    CONSTRAINT "parcels_irrigation_type_check" CHECK (("irrigation_type" = ANY (ARRAY['drip'::"text", 'sprinkler'::"text", 'flood'::"text", 'none'::"text"]))),
    CONSTRAINT "parcels_planting_type_check" CHECK (("planting_type" = ANY (ARRAY['traditional'::"text", 'intensive'::"text", 'super_intensive'::"text", 'organic'::"text"])))
);


ALTER TABLE "public"."parcels" OWNER TO "postgres";


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


CREATE OR REPLACE VIEW "public"."subscription_status" AS
 SELECT "s"."id" AS "subscription_id",
    "o"."id" AS "organization_id",
    "o"."name" AS "organization_name",
    "s"."plan_type",
    "s"."status",
    "s"."current_period_end",
    "s"."cancel_at_period_end",
    "public"."has_valid_subscription"("o"."id") AS "is_valid",
        CASE
            WHEN ("s"."current_period_end" IS NULL) THEN NULL::"text"
            WHEN ("s"."current_period_end" < "now"()) THEN 'expired'::"text"
            WHEN ("s"."current_period_end" < ("now"() + '7 days'::interval)) THEN 'expiring_soon'::"text"
            ELSE 'active'::"text"
        END AS "expiration_status",
    ( SELECT "count"(*) AS "count"
           FROM "public"."farms"
          WHERE ("farms"."organization_id" = "o"."id")) AS "farms_count",
    "s"."max_farms",
    ( SELECT "count"(*) AS "count"
           FROM ("public"."parcels" "p"
             JOIN "public"."farms" "f" ON (("p"."farm_id" = "f"."id")))
          WHERE ("f"."organization_id" = "o"."id")) AS "parcels_count",
    "s"."max_parcels",
    ( SELECT "count"(*) AS "count"
           FROM "public"."organization_users"
          WHERE (("organization_users"."organization_id" = "o"."id") AND ("organization_users"."is_active" = true))) AS "users_count",
    "s"."max_users"
   FROM ("public"."subscriptions" "s"
     JOIN "public"."organizations" "o" ON (("s"."organization_id" = "o"."id")));


ALTER VIEW "public"."subscription_status" OWNER TO "postgres";


COMMENT ON VIEW "public"."subscription_status" IS 'Comprehensive view of subscription status with usage metrics';



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
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "color" "text" DEFAULT '#3B82F6'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."task_categories" OWNER TO "postgres";


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


CREATE TABLE IF NOT EXISTS "public"."tasks" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "farm_id" "uuid" NOT NULL,
    "parcel_id" "uuid",
    "crop_id" "uuid",
    "category_id" "uuid" NOT NULL,
    "template_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "priority" "text" DEFAULT 'medium'::"text",
    "status" "text" DEFAULT 'pending'::"text",
    "assigned_to" "text",
    "due_date" "date",
    "completed_date" "date",
    "estimated_duration" integer,
    "actual_duration" integer,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tasks" OWNER TO "postgres";


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
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


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
    CONSTRAINT "utilities_recurring_frequency_check" CHECK (("recurring_frequency" = ANY (ARRAY['daily'::"text", 'weekly'::"text", 'monthly'::"text", 'yearly'::"text"])))
);


ALTER TABLE "public"."utilities" OWNER TO "postgres";


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
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."warehouses" OWNER TO "postgres";


COMMENT ON TABLE "public"."warehouses" IS 'Warehouses and storage locations';



COMMENT ON COLUMN "public"."warehouses"."capacity" IS 'Storage capacity in the specified unit';



COMMENT ON COLUMN "public"."warehouses"."security_level" IS 'Security level: basic, standard, high, maximum';



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
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."work_records" OWNER TO "postgres";


COMMENT ON TABLE "public"."work_records" IS 'Daily work tracking for all worker types';



ALTER TABLE ONLY "public"."analyses"
    ADD CONSTRAINT "analyses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analysis_recommendations"
    ADD CONSTRAINT "analysis_recommendations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cloud_coverage_checks"
    ADD CONSTRAINT "cloud_coverage_checks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cost_categories"
    ADD CONSTRAINT "cost_categories_organization_id_name_key" UNIQUE ("organization_id", "name");



ALTER TABLE ONLY "public"."cost_categories"
    ADD CONSTRAINT "cost_categories_pkey" PRIMARY KEY ("id");



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



ALTER TABLE ONLY "public"."dashboard_settings"
    ADD CONSTRAINT "dashboard_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dashboard_settings"
    ADD CONSTRAINT "dashboard_settings_user_id_organization_id_key" UNIQUE ("user_id", "organization_id");



ALTER TABLE ONLY "public"."day_laborers"
    ADD CONSTRAINT "day_laborers_pkey" PRIMARY KEY ("id");



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



ALTER TABLE ONLY "public"."inventory_items"
    ADD CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory"
    ADD CONSTRAINT "inventory_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."livestock"
    ADD CONSTRAINT "livestock_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."metayage_settlements"
    ADD CONSTRAINT "metayage_settlements_pkey" PRIMARY KEY ("id");



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



ALTER TABLE ONLY "public"."permission_groups"
    ADD CONSTRAINT "permission_groups_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."permission_groups"
    ADD CONSTRAINT "permission_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_pkey" PRIMARY KEY ("id");



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



ALTER TABLE ONLY "public"."structures"
    ADD CONSTRAINT "structures_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_usage"
    ADD CONSTRAINT "subscription_usage_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_organization_id_key" UNIQUE ("organization_id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_polar_subscription_id_key" UNIQUE ("polar_subscription_id");



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_categories"
    ADD CONSTRAINT "task_categories_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."task_categories"
    ADD CONSTRAINT "task_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_templates"
    ADD CONSTRAINT "task_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");



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



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."utilities"
    ADD CONSTRAINT "utilities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."warehouses"
    ADD CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."work_records"
    ADD CONSTRAINT "work_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workers"
    ADD CONSTRAINT "workers_pkey" PRIMARY KEY ("id");



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



CREATE INDEX "idx_cloud_coverage_checks_date" ON "public"."cloud_coverage_checks" USING "btree" ("check_date");



CREATE INDEX "idx_cloud_coverage_checks_org" ON "public"."cloud_coverage_checks" USING "btree" ("organization_id");



CREATE INDEX "idx_cloud_coverage_checks_parcel" ON "public"."cloud_coverage_checks" USING "btree" ("parcel_id");



CREATE INDEX "idx_cost_categories_organization" ON "public"."cost_categories" USING "btree" ("organization_id");



CREATE INDEX "idx_costs_date" ON "public"."costs" USING "btree" ("date");



CREATE INDEX "idx_costs_farm" ON "public"."costs" USING "btree" ("farm_id");



CREATE INDEX "idx_costs_organization" ON "public"."costs" USING "btree" ("organization_id");



CREATE INDEX "idx_costs_parcel" ON "public"."costs" USING "btree" ("parcel_id");



CREATE INDEX "idx_costs_reference" ON "public"."costs" USING "btree" ("reference_id", "reference_type");



CREATE INDEX "idx_crops_farm_id" ON "public"."crops" USING "btree" ("farm_id");



CREATE INDEX "idx_crops_parcel_id" ON "public"."crops" USING "btree" ("parcel_id");



CREATE INDEX "idx_dashboard_settings_organization_id" ON "public"."dashboard_settings" USING "btree" ("organization_id");



CREATE INDEX "idx_dashboard_settings_user_id" ON "public"."dashboard_settings" USING "btree" ("user_id");



CREATE INDEX "idx_dashboard_settings_user_org" ON "public"."dashboard_settings" USING "btree" ("user_id", "organization_id");



CREATE INDEX "idx_day_laborers_farm_id" ON "public"."day_laborers" USING "btree" ("farm_id");



CREATE INDEX "idx_employees_farm_id" ON "public"."employees" USING "btree" ("farm_id");



CREATE INDEX "idx_farm_management_roles_farm_id" ON "public"."farm_management_roles" USING "btree" ("farm_id");



CREATE INDEX "idx_farm_management_roles_is_active" ON "public"."farm_management_roles" USING "btree" ("is_active");



CREATE INDEX "idx_farm_management_roles_user_id" ON "public"."farm_management_roles" USING "btree" ("user_id");



CREATE INDEX "idx_farms_organization_id" ON "public"."farms" USING "btree" ("organization_id");



CREATE INDEX "idx_financial_transactions_date" ON "public"."financial_transactions" USING "btree" ("transaction_date");



CREATE INDEX "idx_financial_transactions_farm_id" ON "public"."financial_transactions" USING "btree" ("farm_id");



CREATE INDEX "idx_inventory_farm_id" ON "public"."inventory" USING "btree" ("farm_id");



CREATE INDEX "idx_inventory_supplier_id" ON "public"."inventory" USING "btree" ("supplier_id");



CREATE INDEX "idx_inventory_warehouse_id" ON "public"."inventory" USING "btree" ("warehouse_id");



CREATE INDEX "idx_livestock_farm_id" ON "public"."livestock" USING "btree" ("farm_id");



CREATE INDEX "idx_metayage_settlements_period" ON "public"."metayage_settlements" USING "btree" ("period_start", "period_end");



CREATE INDEX "idx_metayage_settlements_worker" ON "public"."metayage_settlements" USING "btree" ("worker_id");



CREATE INDEX "idx_organization_users_role_id" ON "public"."organization_users" USING "btree" ("role_id");



CREATE INDEX "idx_organizations_currency" ON "public"."organizations" USING "btree" ("currency");



CREATE INDEX "idx_organizations_onboarding" ON "public"."organizations" USING "btree" ("onboarding_completed");



CREATE INDEX "idx_organizations_owner_id" ON "public"."organizations" USING "btree" ("owner_id");



CREATE INDEX "idx_parcel_reports_generated_at" ON "public"."parcel_reports" USING "btree" ("generated_at" DESC);



CREATE INDEX "idx_parcel_reports_parcel_id" ON "public"."parcel_reports" USING "btree" ("parcel_id");



CREATE INDEX "idx_parcel_reports_status" ON "public"."parcel_reports" USING "btree" ("status");



CREATE INDEX "idx_parcels_farm_id" ON "public"."parcels" USING "btree" ("farm_id");



CREATE INDEX "idx_permission_groups_name" ON "public"."permission_groups" USING "btree" ("name");



CREATE INDEX "idx_permissions_action" ON "public"."permissions" USING "btree" ("action");



CREATE INDEX "idx_permissions_resource" ON "public"."permissions" USING "btree" ("resource");



CREATE INDEX "idx_plantation_types_org_id" ON "public"."plantation_types" USING "btree" ("organization_id");



CREATE INDEX "idx_profitability_snapshots_organization" ON "public"."profitability_snapshots" USING "btree" ("organization_id");



CREATE INDEX "idx_profitability_snapshots_parcel" ON "public"."profitability_snapshots" USING "btree" ("parcel_id");



CREATE INDEX "idx_profitability_snapshots_period" ON "public"."profitability_snapshots" USING "btree" ("period_start", "period_end");



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



CREATE INDEX "idx_soil_analyses_analysis_date" ON "public"."soil_analyses" USING "btree" ("analysis_date");



CREATE INDEX "idx_soil_analyses_parcel_id" ON "public"."soil_analyses" USING "btree" ("parcel_id");



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



CREATE INDEX "idx_tasks_due_date" ON "public"."tasks" USING "btree" ("due_date");



CREATE INDEX "idx_tasks_farm_id" ON "public"."tasks" USING "btree" ("farm_id");



CREATE INDEX "idx_tasks_status" ON "public"."tasks" USING "btree" ("status");



CREATE INDEX "idx_tree_categories_org_id" ON "public"."tree_categories" USING "btree" ("organization_id");



CREATE INDEX "idx_trees_category_id" ON "public"."trees" USING "btree" ("category_id");



CREATE INDEX "idx_usage_organization" ON "public"."subscription_usage" USING "btree" ("organization_id");



CREATE INDEX "idx_usage_subscription" ON "public"."subscription_usage" USING "btree" ("subscription_id");



CREATE INDEX "idx_utilities_billing_date" ON "public"."utilities" USING "btree" ("billing_date");



CREATE INDEX "idx_utilities_farm_id" ON "public"."utilities" USING "btree" ("farm_id");



CREATE INDEX "idx_utilities_payment_status" ON "public"."utilities" USING "btree" ("payment_status");



CREATE INDEX "idx_utilities_type" ON "public"."utilities" USING "btree" ("type");



CREATE INDEX "idx_warehouses_farm_id" ON "public"."warehouses" USING "btree" ("farm_id");



CREATE INDEX "idx_warehouses_organization_id" ON "public"."warehouses" USING "btree" ("organization_id");



CREATE INDEX "idx_work_records_date" ON "public"."work_records" USING "btree" ("work_date");



CREATE INDEX "idx_work_records_farm_id" ON "public"."work_records" USING "btree" ("farm_id");



CREATE INDEX "idx_work_records_worker" ON "public"."work_records" USING "btree" ("worker_id");



CREATE INDEX "idx_workers_active" ON "public"."workers" USING "btree" ("is_active");



CREATE INDEX "idx_workers_farm" ON "public"."workers" USING "btree" ("farm_id");



CREATE INDEX "idx_workers_organization" ON "public"."workers" USING "btree" ("organization_id");



CREATE INDEX "idx_workers_type" ON "public"."workers" USING "btree" ("worker_type");



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



CREATE OR REPLACE TRIGGER "enforce_subscription_creation" BEFORE INSERT ON "public"."subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_unauthorized_subscription_creation"();



CREATE OR REPLACE TRIGGER "enforce_system_admin_permissions_delete" BEFORE DELETE ON "public"."permissions" FOR EACH ROW EXECUTE FUNCTION "public"."check_system_admin_for_reference_tables"();



CREATE OR REPLACE TRIGGER "enforce_system_admin_permissions_insert" BEFORE INSERT ON "public"."permissions" FOR EACH ROW EXECUTE FUNCTION "public"."check_system_admin_for_reference_tables"();



CREATE OR REPLACE TRIGGER "enforce_system_admin_permissions_update" BEFORE UPDATE ON "public"."permissions" FOR EACH ROW EXECUTE FUNCTION "public"."check_system_admin_for_reference_tables"();



CREATE OR REPLACE TRIGGER "enforce_system_admin_roles_delete" BEFORE DELETE ON "public"."roles" FOR EACH ROW EXECUTE FUNCTION "public"."check_system_admin_for_reference_tables"();



CREATE OR REPLACE TRIGGER "enforce_system_admin_roles_insert" BEFORE INSERT ON "public"."roles" FOR EACH ROW EXECUTE FUNCTION "public"."check_system_admin_for_reference_tables"();



CREATE OR REPLACE TRIGGER "enforce_system_admin_roles_update" BEFORE UPDATE ON "public"."roles" FOR EACH ROW EXECUTE FUNCTION "public"."check_system_admin_for_reference_tables"();



CREATE OR REPLACE TRIGGER "handle_analyses_updated_at" BEFORE UPDATE ON "public"."analyses" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_analysis_recommendations_updated_at" BEFORE UPDATE ON "public"."analysis_recommendations" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."inventory_items" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



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



CREATE OR REPLACE TRIGGER "trigger_seed_tree_data_for_new_organization" AFTER INSERT ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."seed_tree_data_for_new_organization"();



CREATE OR REPLACE TRIGGER "update_farms_updated_at" BEFORE UPDATE ON "public"."farms" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_organization_users_updated_at" BEFORE UPDATE ON "public"."organization_users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_organizations_updated_at" BEFORE UPDATE ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_plantation_types_updated_at" BEFORE UPDATE ON "public"."plantation_types" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_satellite_files_updated_at" BEFORE UPDATE ON "public"."satellite_files" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tree_categories_updated_at" BEFORE UPDATE ON "public"."tree_categories" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_trees_updated_at" BEFORE UPDATE ON "public"."trees" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_profiles_updated_at" BEFORE UPDATE ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_workers_updated_at" BEFORE UPDATE ON "public"."workers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."analyses"
    ADD CONSTRAINT "analyses_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "public"."parcels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."analysis_recommendations"
    ADD CONSTRAINT "analysis_recommendations_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



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



ALTER TABLE ONLY "public"."dashboard_settings"
    ADD CONSTRAINT "dashboard_settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dashboard_settings"
    ADD CONSTRAINT "dashboard_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."farm_management_roles"
    ADD CONSTRAINT "farm_management_roles_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."farm_management_roles"
    ADD CONSTRAINT "farm_management_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id");



ALTER TABLE ONLY "public"."farm_management_roles"
    ADD CONSTRAINT "farm_management_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."farms"
    ADD CONSTRAINT "farms_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory"
    ADD CONSTRAINT "inventory_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id");



ALTER TABLE ONLY "public"."inventory_items"
    ADD CONSTRAINT "inventory_items_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_items"
    ADD CONSTRAINT "inventory_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory"
    ADD CONSTRAINT "inventory_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "public"."product_subcategories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inventory"
    ADD CONSTRAINT "inventory_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inventory"
    ADD CONSTRAINT "inventory_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."metayage_settlements"
    ADD CONSTRAINT "metayage_settlements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."metayage_settlements"
    ADD CONSTRAINT "metayage_settlements_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."metayage_settlements"
    ADD CONSTRAINT "metayage_settlements_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "public"."parcels"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."metayage_settlements"
    ADD CONSTRAINT "metayage_settlements_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE CASCADE;



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



ALTER TABLE ONLY "public"."task_templates"
    ADD CONSTRAINT "task_templates_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."task_categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."task_categories"("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_crop_id_fkey" FOREIGN KEY ("crop_id") REFERENCES "public"."crops"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."task_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tree_categories"
    ADD CONSTRAINT "tree_categories_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trees"
    ADD CONSTRAINT "trees_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."tree_categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."utilities"
    ADD CONSTRAINT "utilities_parcel_id_fkey" FOREIGN KEY ("parcel_id") REFERENCES "public"."parcels"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."warehouses"
    ADD CONSTRAINT "warehouses_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."warehouses"
    ADD CONSTRAINT "warehouses_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workers"
    ADD CONSTRAINT "workers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."workers"
    ADD CONSTRAINT "workers_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."workers"
    ADD CONSTRAINT "workers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



CREATE POLICY "Admins and managers can delete plantation types" ON "public"."plantation_types" FOR DELETE USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true) AND ("organization_users"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text"]))))));



CREATE POLICY "Admins and managers can delete tree categories" ON "public"."tree_categories" FOR DELETE USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true) AND ("organization_users"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text"]))))));



CREATE POLICY "Admins and managers can delete trees" ON "public"."trees" FOR DELETE USING (("category_id" IN ( SELECT "tree_categories"."id"
   FROM "public"."tree_categories"
  WHERE ("tree_categories"."organization_id" IN ( SELECT "organization_users"."organization_id"
           FROM "public"."organization_users"
          WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true) AND ("organization_users"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text"]))))))));



CREATE POLICY "Admins and managers can insert plantation types" ON "public"."plantation_types" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true) AND ("organization_users"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text"]))))));



CREATE POLICY "Admins and managers can insert tree categories" ON "public"."tree_categories" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true) AND ("organization_users"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text"]))))));



CREATE POLICY "Admins and managers can insert trees" ON "public"."trees" FOR INSERT WITH CHECK (("category_id" IN ( SELECT "tree_categories"."id"
   FROM "public"."tree_categories"
  WHERE ("tree_categories"."organization_id" IN ( SELECT "organization_users"."organization_id"
           FROM "public"."organization_users"
          WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true) AND ("organization_users"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text"]))))))));



CREATE POLICY "Admins and managers can manage work records" ON "public"."work_records" USING (("worker_id" IN ( SELECT "w"."id"
   FROM (("public"."workers" "w"
     JOIN "public"."organization_users" "ou" ON (("ou"."organization_id" = "w"."organization_id")))
     JOIN "public"."roles" "r" ON (("r"."id" = "ou"."role_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."is_active" = true) AND ("r"."name" = ANY (ARRAY['system_admin'::"text", 'organization_admin'::"text", 'farm_manager'::"text"]))))));



CREATE POLICY "Admins and managers can manage workers" ON "public"."workers" USING ((EXISTS ( SELECT 1
   FROM ("public"."organization_users" "ou"
     JOIN "public"."roles" "r" ON (("r"."id" = "ou"."role_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."organization_id" = "workers"."organization_id") AND ("ou"."is_active" = true) AND ("r"."name" = ANY (ARRAY['system_admin'::"text", 'organization_admin'::"text", 'farm_manager'::"text"]))))));



CREATE POLICY "Admins and managers can update plantation types" ON "public"."plantation_types" FOR UPDATE USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true) AND ("organization_users"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text"]))))));



CREATE POLICY "Admins and managers can update tree categories" ON "public"."tree_categories" FOR UPDATE USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true) AND ("organization_users"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text"]))))));



CREATE POLICY "Admins and managers can update trees" ON "public"."trees" FOR UPDATE USING (("category_id" IN ( SELECT "tree_categories"."id"
   FROM "public"."tree_categories"
  WHERE ("tree_categories"."organization_id" IN ( SELECT "organization_users"."organization_id"
           FROM "public"."organization_users"
          WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true) AND ("organization_users"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text"]))))))));



CREATE POLICY "Admins can manage profitability snapshots" ON "public"."profitability_snapshots" USING ((EXISTS ( SELECT 1
   FROM ("public"."organization_users" "ou"
     JOIN "public"."roles" "r" ON (("r"."id" = "ou"."role_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."organization_id" = "profitability_snapshots"."organization_id") AND ("r"."level" <= 2)))));



CREATE POLICY "Admins can manage settlements" ON "public"."metayage_settlements" USING (("worker_id" IN ( SELECT "w"."id"
   FROM (("public"."workers" "w"
     JOIN "public"."organization_users" "ou" ON (("ou"."organization_id" = "w"."organization_id")))
     JOIN "public"."roles" "r" ON (("r"."id" = "ou"."role_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."is_active" = true) AND ("r"."name" = ANY (ARRAY['system_admin'::"text", 'organization_admin'::"text"]))))));



CREATE POLICY "Admins can view audit logs" ON "public"."audit_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."organization_users" "ou"
     JOIN "public"."roles" "r" ON (("r"."id" = "ou"."role_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("r"."name" = ANY (ARRAY['system_admin'::"text", 'organization_admin'::"text"]))))));



CREATE POLICY "Farm admins can delete analyses" ON "public"."analyses" FOR DELETE USING (("parcel_id" IN ( SELECT "p"."id"
   FROM (("public"."parcels" "p"
     JOIN "public"."farms" "f" ON (("p"."farm_id" = "f"."id")))
     JOIN "public"."organization_users" "ou" ON (("f"."organization_id" = "ou"."organization_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."is_active" = true) AND ("ou"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text"]))))));



CREATE POLICY "Farm members can insert analyses" ON "public"."analyses" FOR INSERT WITH CHECK (("parcel_id" IN ( SELECT "p"."id"
   FROM (("public"."parcels" "p"
     JOIN "public"."farms" "f" ON (("p"."farm_id" = "f"."id")))
     JOIN "public"."organization_users" "ou" ON (("f"."organization_id" = "ou"."organization_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."is_active" = true) AND ("ou"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text", 'member'::"text"]))))));



CREATE POLICY "Farm members can manage recommendations" ON "public"."analysis_recommendations" USING (("analysis_id" IN ( SELECT "a"."id"
   FROM ((("public"."analyses" "a"
     JOIN "public"."parcels" "p" ON (("a"."parcel_id" = "p"."id")))
     JOIN "public"."farms" "f" ON (("p"."farm_id" = "f"."id")))
     JOIN "public"."organization_users" "ou" ON (("f"."organization_id" = "ou"."organization_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."is_active" = true) AND ("ou"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text", 'member'::"text"]))))));



CREATE POLICY "Farm members can update analyses" ON "public"."analyses" FOR UPDATE USING (("parcel_id" IN ( SELECT "p"."id"
   FROM (("public"."parcels" "p"
     JOIN "public"."farms" "f" ON (("p"."farm_id" = "f"."id")))
     JOIN "public"."organization_users" "ou" ON (("f"."organization_id" = "ou"."organization_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."is_active" = true) AND ("ou"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text", 'member'::"text"]))))));



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



CREATE POLICY "Organization members can manage inventory" ON "public"."inventory_items" USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
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



CREATE POLICY "Users can access satellite files for their organizations" ON "public"."satellite_files" USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE ("organization_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can create reports for their organization parcels" ON "public"."parcel_reports" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (("public"."parcels" "p"
     JOIN "public"."farms" "f" ON (("f"."id" = "p"."farm_id")))
     JOIN "public"."organization_users" "ou" ON (("ou"."organization_id" = "f"."organization_id")))
  WHERE (("p"."id" = "parcel_reports"."parcel_id") AND ("ou"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can create trial subscriptions for their organization" ON "public"."subscriptions" FOR INSERT TO "authenticated" WITH CHECK ((("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))) AND ("status" = 'trialing'::"text") AND (NOT (EXISTS ( SELECT 1
   FROM "public"."subscriptions" "subscriptions_1"
  WHERE ("subscriptions_1"."organization_id" = "subscriptions_1"."organization_id"))))));



COMMENT ON POLICY "Users can create trial subscriptions for their organization" ON "public"."subscriptions" IS 'Allows authenticated users to create trial subscriptions for organizations they belong to. Prevents duplicate subscriptions.';



CREATE POLICY "Users can delete structures from their organization's farms" ON "public"."structures" FOR DELETE USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))));



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



CREATE POLICY "Users can update structures from their organization's farms" ON "public"."structures" FOR UPDATE USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))));



CREATE POLICY "Users can update suppliers in their organization" ON "public"."suppliers" FOR UPDATE USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))));



CREATE POLICY "Users can update their organization subscription" ON "public"."subscriptions" FOR UPDATE TO "authenticated" USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true))))) WITH CHECK (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))));



COMMENT ON POLICY "Users can update their organization subscription" ON "public"."subscriptions" IS 'Allows users to update subscriptions for organizations they belong to (e.g., upgrading from trial to paid)';



CREATE POLICY "Users can update their own dashboard settings" ON "public"."dashboard_settings" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own reports" ON "public"."parcel_reports" FOR UPDATE USING ((("generated_by" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM ((("public"."parcels" "p"
     JOIN "public"."farms" "f" ON (("f"."id" = "p"."farm_id")))
     JOIN "public"."organization_users" "ou" ON (("ou"."organization_id" = "f"."organization_id")))
     JOIN "public"."roles" "r" ON (("r"."id" = "ou"."role_id")))
  WHERE (("p"."id" = "parcel_reports"."parcel_id") AND ("ou"."user_id" = "auth"."uid"()) AND ("r"."level" <= 2))))));



CREATE POLICY "Users can update utilities from their organization's farms" ON "public"."utilities" FOR UPDATE USING (("farm_id" IN ( SELECT "f"."id"
   FROM (("public"."farms" "f"
     JOIN "public"."organizations" "o" ON (("f"."organization_id" = "o"."id")))
     JOIN "public"."organization_users" "uo" ON (("o"."id" = "uo"."organization_id")))
  WHERE ("uo"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update warehouses in their organization" ON "public"."warehouses" FOR UPDATE USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))));



CREATE POLICY "Users can view plantation types in their organization" ON "public"."plantation_types" FOR SELECT USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))));



CREATE POLICY "Users can view profitability snapshots" ON "public"."profitability_snapshots" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."organization_users" "ou"
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."organization_id" = "profitability_snapshots"."organization_id")))));



CREATE POLICY "Users can view reports for their organization parcels" ON "public"."parcel_reports" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (("public"."parcels" "p"
     JOIN "public"."farms" "f" ON (("f"."id" = "p"."farm_id")))
     JOIN "public"."organization_users" "ou" ON (("ou"."organization_id" = "f"."organization_id")))
  WHERE (("p"."id" = "parcel_reports"."parcel_id") AND ("ou"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view settlements in their organization" ON "public"."metayage_settlements" FOR SELECT USING (("worker_id" IN ( SELECT "workers"."id"
   FROM "public"."workers"
  WHERE ("workers"."organization_id" IN ( SELECT "organization_users"."organization_id"
           FROM "public"."organization_users"
          WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))))));



CREATE POLICY "Users can view structures from their organization's farms" ON "public"."structures" FOR SELECT USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))));



CREATE POLICY "Users can view suppliers in their organization" ON "public"."suppliers" FOR SELECT USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))));



CREATE POLICY "Users can view their organization subscription" ON "public"."subscriptions" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))));



CREATE POLICY "Users can view their organization usage" ON "public"."subscription_usage" FOR SELECT TO "authenticated" USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))));



CREATE POLICY "Users can view their own dashboard settings" ON "public"."dashboard_settings" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view tree categories in their organization" ON "public"."tree_categories" FOR SELECT USING (("organization_id" IN ( SELECT "organization_users"."organization_id"
   FROM "public"."organization_users"
  WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))));



CREATE POLICY "Users can view trees in their organization" ON "public"."trees" FOR SELECT USING (("category_id" IN ( SELECT "tree_categories"."id"
   FROM "public"."tree_categories"
  WHERE ("tree_categories"."organization_id" IN ( SELECT "organization_users"."organization_id"
           FROM "public"."organization_users"
          WHERE (("organization_users"."user_id" = "auth"."uid"()) AND ("organization_users"."is_active" = true)))))));



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



CREATE POLICY "authenticated_can_view_task_categories" ON "public"."task_categories" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "authenticated_can_view_task_templates" ON "public"."task_templates" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "authenticated_can_view_test_types" ON "public"."test_types" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "authenticated_users_can_view_all_subscriptions" ON "public"."subscriptions" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."cloud_coverage_checks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cost_categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cost_categories_modify_org_admins" ON "public"."cost_categories" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."organization_users" "ou"
     JOIN "public"."roles" "r" ON (("r"."id" = "ou"."role_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."organization_id" = "cost_categories"."organization_id") AND ("ou"."is_active" = true) AND ("r"."level" <= 2)))));



CREATE POLICY "cost_categories_select_org_members" ON "public"."cost_categories" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_users" "ou"
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."organization_id" = "cost_categories"."organization_id") AND ("ou"."is_active" = true)))));



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



ALTER TABLE "public"."crop_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."crop_varieties" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."crops" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dashboard_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."day_laborers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."employees" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."farm_management_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."farms" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "farms_delete_policy" ON "public"."farms" FOR DELETE TO "authenticated" USING (("public"."user_has_role"("auth"."uid"(), "organization_id", ARRAY['system_admin'::"text", 'organization_admin'::"text"]) AND ("public"."has_valid_subscription"("organization_id") = true)));



CREATE POLICY "farms_insert_policy" ON "public"."farms" FOR INSERT TO "authenticated" WITH CHECK (("public"."user_has_role"("auth"."uid"(), "organization_id", ARRAY['system_admin'::"text", 'organization_admin'::"text"]) AND ("public"."can_create_resource"("organization_id", 'farm'::"text") = true)));



CREATE POLICY "farms_select_policy" ON "public"."farms" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_users" "ou"
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."organization_id" = "farms"."organization_id") AND ("ou"."is_active" = true) AND ("public"."has_valid_subscription"("farms"."organization_id") = true)))));



CREATE POLICY "farms_update_policy" ON "public"."farms" FOR UPDATE TO "authenticated" USING (("public"."user_has_role"("auth"."uid"(), "organization_id", ARRAY['system_admin'::"text", 'organization_admin'::"text", 'farm_manager'::"text"]) AND ("public"."has_valid_subscription"("organization_id") = true)));



ALTER TABLE "public"."financial_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inventory" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inventory_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."livestock" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."metayage_settlements" ENABLE ROW LEVEL SECURITY;


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



CREATE POLICY "org_admins_can_manage_memberships" ON "public"."organization_users" USING ("public"."user_has_permission_for_org"("auth"."uid"(), "organization_id", 'users.manage'::"text"));



CREATE POLICY "org_admins_can_manage_org_templates" ON "public"."role_templates" USING ("public"."user_has_permission_for_org"("auth"."uid"(), "organization_id", 'templates.manage'::"text"));



CREATE POLICY "org_admins_can_manage_product_categories" ON "public"."product_categories" USING ((EXISTS ( SELECT 1
   FROM ("public"."organization_users" "ou"
     JOIN "public"."roles" "r" ON (("r"."id" = "ou"."role_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."is_active" = true) AND ("r"."level" <= 2)))));



CREATE POLICY "org_admins_can_manage_product_subcategories" ON "public"."product_subcategories" USING ((EXISTS ( SELECT 1
   FROM ("public"."organization_users" "ou"
     JOIN "public"."roles" "r" ON (("r"."id" = "ou"."role_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."is_active" = true) AND ("r"."level" <= 2)))));



CREATE POLICY "org_admins_can_manage_task_categories" ON "public"."task_categories" USING ((EXISTS ( SELECT 1
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



CREATE POLICY "org_admins_can_update" ON "public"."organizations" FOR UPDATE USING ("public"."user_has_permission_for_org"("auth"."uid"(), "id", 'organizations.update'::"text"));



CREATE POLICY "org_admins_can_view_profiles" ON "public"."user_profiles" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."organization_users" "ou"
     JOIN "public"."roles" "r" ON (("r"."id" = "ou"."role_id")))
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."is_active" = true) AND ("r"."level" <= 2)))));



CREATE POLICY "org_admins_can_view_role_audit" ON "public"."role_assignments_audit" FOR SELECT USING ("public"."user_has_permission_for_org"("auth"."uid"(), "organization_id", 'audit.view'::"text"));



CREATE POLICY "org_members_can_create_farms" ON "public"."farms" FOR INSERT WITH CHECK ("public"."user_has_permission_for_org"("auth"."uid"(), "organization_id", 'farms.create'::"text"));



CREATE POLICY "org_members_can_create_parcels" ON "public"."parcels" FOR INSERT WITH CHECK ("public"."user_has_permission_for_org"("auth"."uid"(), "farm_id", 'parcels.create'::"text"));



CREATE POLICY "org_members_can_delete_parcels" ON "public"."parcels" FOR DELETE USING ("public"."user_has_permission_for_org"("auth"."uid"(), "farm_id", 'parcels.delete'::"text"));



CREATE POLICY "org_members_can_manage_crops" ON "public"."crops" USING ("public"."user_has_permission_for_org"("auth"."uid"(), "farm_id", 'crops.manage'::"text"));



CREATE POLICY "org_members_can_manage_inventory" ON "public"."inventory" USING ("public"."user_has_permission_for_org"("auth"."uid"(), "farm_id", 'inventory.manage'::"text"));



CREATE POLICY "org_members_can_manage_livestock" ON "public"."livestock" USING ("public"."user_has_permission_for_org"("auth"."uid"(), "farm_id", 'livestock.manage'::"text"));



CREATE POLICY "org_members_can_manage_soil_analyses" ON "public"."soil_analyses" USING ("public"."user_has_permission_for_org"("auth"."uid"(), "parcel_id", 'soil_analyses.manage'::"text"));



CREATE POLICY "org_members_can_manage_tasks" ON "public"."tasks" USING ("public"."user_has_permission_for_org"("auth"."uid"(), "farm_id", 'tasks.manage'::"text"));



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



CREATE POLICY "org_members_can_view_tasks" ON "public"."tasks" FOR SELECT USING ("public"."is_active_org_member"("auth"."uid"(), "farm_id"));



CREATE POLICY "org_members_can_view_transactions" ON "public"."financial_transactions" FOR SELECT USING ("public"."is_active_org_member"("auth"."uid"(), "farm_id"));



CREATE POLICY "org_members_can_view_work_records" ON "public"."work_records" FOR SELECT USING ("public"."is_active_org_member"("auth"."uid"(), "farm_id"));



ALTER TABLE "public"."organization_users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organization_users_update_policy" ON "public"."organization_users" FOR UPDATE TO "authenticated" USING ("public"."user_has_role"("auth"."uid"(), "organization_id", ARRAY['system_admin'::"text", 'organization_admin'::"text"]));



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



ALTER TABLE "public"."permission_groups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."plantation_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_subcategories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profitability_snapshots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."revenues" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "revenues_modify_org_members" ON "public"."revenues" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_users" "ou"
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."organization_id" = "revenues"."organization_id") AND ("ou"."is_active" = true)))));



CREATE POLICY "revenues_select_org_members" ON "public"."revenues" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_users" "ou"
  WHERE (("ou"."user_id" = "auth"."uid"()) AND ("ou"."organization_id" = "revenues"."organization_id") AND ("ou"."is_active" = true)))));



ALTER TABLE "public"."role_assignments_audit" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."role_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."satellite_aois" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."satellite_files" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."satellite_indices_data" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."satellite_processing_jobs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."satellite_processing_tasks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "service_role_full_access" ON "public"."subscriptions" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."soil_analyses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."structures" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "subscription_check_farms_insert" ON "public"."farms" FOR INSERT TO "authenticated" WITH CHECK (("public"."has_valid_subscription"("organization_id") AND "public"."can_create_farm"("organization_id")));



CREATE POLICY "subscription_check_parcels_insert" ON "public"."parcels" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."farms"
  WHERE (("farms"."id" = "parcels"."farm_id") AND "public"."has_valid_subscription"("farms"."organization_id") AND "public"."can_create_parcel"("farms"."organization_id")))));



CREATE POLICY "subscription_check_users_insert" ON "public"."organization_users" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "user_id") OR ("public"."has_valid_subscription"("organization_id") AND "public"."can_add_user"("organization_id"))));



ALTER TABLE "public"."subscription_usage" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."suppliers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."task_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."task_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;


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



CREATE POLICY "users_can_insert_own_profile" ON "public"."user_profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "users_can_update_own_profile" ON "public"."user_profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "users_can_view_org_memberships" ON "public"."organization_users" FOR SELECT USING ("public"."is_active_org_member"("auth"."uid"(), "organization_id"));



CREATE POLICY "users_can_view_own_memberships" ON "public"."organization_users" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "users_can_view_own_org_membership" ON "public"."organization_users" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



COMMENT ON POLICY "users_can_view_own_org_membership" ON "public"."organization_users" IS 'Allows users to view their own organization memberships. No recursion.';



CREATE POLICY "users_can_view_own_profile" ON "public"."user_profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "users_can_view_their_organizations" ON "public"."organizations" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_users" "ou"
  WHERE (("ou"."organization_id" = "organizations"."id") AND ("ou"."user_id" = "auth"."uid"()) AND ("ou"."is_active" = true)))));



COMMENT ON POLICY "users_can_view_their_organizations" ON "public"."organizations" IS 'Allows users to view organizations they are members of. Uses direct EXISTS check to avoid recursion.';



ALTER TABLE "public"."utilities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."warehouses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."work_records" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workers" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";




























































































































































GRANT ALL ON FUNCTION "public"."add_subscription_check_to_table"("table_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."add_subscription_check_to_table"("table_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_subscription_check_to_table"("table_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."assign_role_with_audit"("target_user_id" "uuid", "target_org_id" "uuid", "new_role_id" "uuid", "reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."assign_role_with_audit"("target_user_id" "uuid", "target_org_id" "uuid", "new_role_id" "uuid", "reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."assign_role_with_audit"("target_user_id" "uuid", "target_org_id" "uuid", "new_role_id" "uuid", "reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."audit_role_assignment"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_role_assignment"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_role_assignment"() TO "service_role";



GRANT ALL ON FUNCTION "public"."audit_trigger"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_trigger"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_trigger"() TO "service_role";



GRANT ALL ON FUNCTION "public"."block_write_without_subscription"() TO "anon";
GRANT ALL ON FUNCTION "public"."block_write_without_subscription"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."block_write_without_subscription"() TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_metayage_share"("p_worker_id" "uuid", "p_gross_revenue" numeric, "p_total_charges" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_metayage_share"("p_worker_id" "uuid", "p_gross_revenue" numeric, "p_total_charges" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_metayage_share"("p_worker_id" "uuid", "p_gross_revenue" numeric, "p_total_charges" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_parcel_area_from_boundary"() TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_parcel_area_from_boundary"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_parcel_area_from_boundary"() TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_profitability"("p_organization_id" "uuid", "p_parcel_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_profitability"("p_organization_id" "uuid", "p_parcel_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_profitability"("p_organization_id" "uuid", "p_parcel_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "service_role";



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



GRANT ALL ON FUNCTION "public"."check_system_admin_for_reference_tables"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_system_admin_for_reference_tables"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_system_admin_for_reference_tables"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_default_subscription_for_org"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_default_subscription_for_org"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_default_subscription_for_org"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_role_from_template"("template_id" "uuid", "org_id" "uuid", "custom_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_role_from_template"("template_id" "uuid", "org_id" "uuid", "custom_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_role_from_template"("template_id" "uuid", "org_id" "uuid", "custom_name" "text") TO "service_role";



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



GRANT ALL ON FUNCTION "public"."get_current_user_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_user_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_user_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_farm_hierarchy_tree"("org_uuid" "uuid", "root_farm_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_farm_hierarchy_tree"("org_uuid" "uuid", "root_farm_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_farm_hierarchy_tree"("org_uuid" "uuid", "root_farm_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_farm_structures"("farm_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_farm_structures"("farm_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_farm_structures"("farm_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_latest_satellite_data"("parcel_uuid" "uuid", "index_name_param" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_latest_satellite_data"("parcel_uuid" "uuid", "index_name_param" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_latest_satellite_data"("parcel_uuid" "uuid", "index_name_param" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_organization_farms"("org_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_organization_farms"("org_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_organization_farms"("org_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_organization_role_hierarchy"("org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_organization_role_hierarchy"("org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_organization_role_hierarchy"("org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_organization_structures"("org_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_organization_structures"("org_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_organization_structures"("org_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_parcels_for_satellite_processing"("org_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_parcels_for_satellite_processing"("org_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_parcels_for_satellite_processing"("org_uuid" "uuid") TO "service_role";



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



GRANT ALL ON FUNCTION "public"."is_system_admin"("check_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_system_admin"("check_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_system_admin"("check_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_unauthorized_subscription_creation"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_unauthorized_subscription_creation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_unauthorized_subscription_creation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."seed_tree_data_for_new_organization"() TO "anon";
GRANT ALL ON FUNCTION "public"."seed_tree_data_for_new_organization"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."seed_tree_data_for_new_organization"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_on_user_created"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_on_user_created"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_on_user_created"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_expired_subscriptions"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_expired_subscriptions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_expired_subscriptions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_subscription_limits"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_subscription_limits"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_subscription_limits"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."user_has_permission"("user_id" "uuid", "permission_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."user_has_permission"("user_id" "uuid", "permission_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_permission"("user_id" "uuid", "permission_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_has_permission_for_org"("user_id" "uuid", "org_id" "uuid", "permission_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."user_has_permission_for_org"("user_id" "uuid", "org_id" "uuid", "permission_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_permission_for_org"("user_id" "uuid", "org_id" "uuid", "permission_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_has_role"("p_user_id" "uuid", "p_organization_id" "uuid", "p_role_names" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."user_has_role"("p_user_id" "uuid", "p_organization_id" "uuid", "p_role_names" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_role"("p_user_id" "uuid", "p_organization_id" "uuid", "p_role_names" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_role_assignment"("target_user_id" "uuid", "target_org_id" "uuid", "new_role_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_role_assignment"("target_user_id" "uuid", "target_org_id" "uuid", "new_role_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_role_assignment"("target_user_id" "uuid", "target_org_id" "uuid", "new_role_id" "uuid") TO "service_role";


















GRANT ALL ON TABLE "public"."farms" TO "anon";
GRANT ALL ON TABLE "public"."farms" TO "authenticated";
GRANT ALL ON TABLE "public"."farms" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



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



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."cloud_coverage_checks" TO "anon";
GRANT ALL ON TABLE "public"."cloud_coverage_checks" TO "authenticated";
GRANT ALL ON TABLE "public"."cloud_coverage_checks" TO "service_role";



GRANT ALL ON TABLE "public"."cost_categories" TO "anon";
GRANT ALL ON TABLE "public"."cost_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."cost_categories" TO "service_role";



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



GRANT ALL ON TABLE "public"."organization_users" TO "anon";
GRANT ALL ON TABLE "public"."organization_users" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_users" TO "service_role";



GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."current_session_status" TO "anon";
GRANT ALL ON TABLE "public"."current_session_status" TO "authenticated";
GRANT ALL ON TABLE "public"."current_session_status" TO "service_role";



GRANT ALL ON TABLE "public"."dashboard_settings" TO "anon";
GRANT ALL ON TABLE "public"."dashboard_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."dashboard_settings" TO "service_role";



GRANT ALL ON TABLE "public"."day_laborers" TO "anon";
GRANT ALL ON TABLE "public"."day_laborers" TO "authenticated";
GRANT ALL ON TABLE "public"."day_laborers" TO "service_role";



GRANT ALL ON TABLE "public"."employees" TO "anon";
GRANT ALL ON TABLE "public"."employees" TO "authenticated";
GRANT ALL ON TABLE "public"."employees" TO "service_role";



GRANT ALL ON TABLE "public"."farm_management_roles" TO "anon";
GRANT ALL ON TABLE "public"."farm_management_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."farm_management_roles" TO "service_role";



GRANT ALL ON TABLE "public"."financial_transactions" TO "anon";
GRANT ALL ON TABLE "public"."financial_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."financial_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."inventory" TO "anon";
GRANT ALL ON TABLE "public"."inventory" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_items" TO "anon";
GRANT ALL ON TABLE "public"."inventory_items" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_items" TO "service_role";



GRANT ALL ON TABLE "public"."livestock" TO "anon";
GRANT ALL ON TABLE "public"."livestock" TO "authenticated";
GRANT ALL ON TABLE "public"."livestock" TO "service_role";



GRANT ALL ON TABLE "public"."metayage_settlements" TO "anon";
GRANT ALL ON TABLE "public"."metayage_settlements" TO "authenticated";
GRANT ALL ON TABLE "public"."metayage_settlements" TO "service_role";



GRANT ALL ON TABLE "public"."parcel_reports" TO "anon";
GRANT ALL ON TABLE "public"."parcel_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."parcel_reports" TO "service_role";



GRANT ALL ON TABLE "public"."parcels" TO "anon";
GRANT ALL ON TABLE "public"."parcels" TO "authenticated";
GRANT ALL ON TABLE "public"."parcels" TO "service_role";



GRANT ALL ON TABLE "public"."permission_groups" TO "anon";
GRANT ALL ON TABLE "public"."permission_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."permission_groups" TO "service_role";



GRANT ALL ON TABLE "public"."permissions" TO "anon";
GRANT ALL ON TABLE "public"."permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."permissions" TO "service_role";



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



GRANT ALL ON TABLE "public"."structures" TO "anon";
GRANT ALL ON TABLE "public"."structures" TO "authenticated";
GRANT ALL ON TABLE "public"."structures" TO "service_role";



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



GRANT ALL ON TABLE "public"."task_templates" TO "anon";
GRANT ALL ON TABLE "public"."task_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."task_templates" TO "service_role";



GRANT ALL ON TABLE "public"."tasks" TO "anon";
GRANT ALL ON TABLE "public"."tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."tasks" TO "service_role";



GRANT ALL ON TABLE "public"."test_types" TO "anon";
GRANT ALL ON TABLE "public"."test_types" TO "authenticated";
GRANT ALL ON TABLE "public"."test_types" TO "service_role";



GRANT ALL ON TABLE "public"."tree_categories" TO "anon";
GRANT ALL ON TABLE "public"."tree_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."tree_categories" TO "service_role";



GRANT ALL ON TABLE "public"."trees" TO "anon";
GRANT ALL ON TABLE "public"."trees" TO "authenticated";
GRANT ALL ON TABLE "public"."trees" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."utilities" TO "anon";
GRANT ALL ON TABLE "public"."utilities" TO "authenticated";
GRANT ALL ON TABLE "public"."utilities" TO "service_role";



GRANT ALL ON TABLE "public"."warehouses" TO "anon";
GRANT ALL ON TABLE "public"."warehouses" TO "authenticated";
GRANT ALL ON TABLE "public"."warehouses" TO "service_role";



GRANT ALL ON TABLE "public"."work_records" TO "anon";
GRANT ALL ON TABLE "public"."work_records" TO "authenticated";
GRANT ALL ON TABLE "public"."work_records" TO "service_role";









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
