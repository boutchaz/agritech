-- Migration to set up Edge Function trigger for user creation
-- This replaces the direct SQL handle_new_user() function with an Edge Function call

-- Enable pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create or replace the function that calls the Edge Function
CREATE OR REPLACE FUNCTION public.trigger_on_user_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  supabase_url text;
  service_role_key text;
BEGIN
  -- Get Supabase URL from environment or config
  -- For local: http://127.0.0.1:54321
  -- For remote: Get from current_setting or use environment variable
  BEGIN
    supabase_url := current_setting('app.settings.supabase_url', true);
  EXCEPTION WHEN OTHERS THEN
    -- Default to local URL if not set
    supabase_url := 'http://127.0.0.1:54321';
  END;

  BEGIN
    service_role_key := current_setting('app.settings.service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    -- If not set, the Edge Function will use the service role from environment
    service_role_key := '';
  END;

  -- Make async HTTP request to Edge Function
  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/on-user-created',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
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

-- Drop existing trigger if it exists (may have different names)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_webhook ON auth.users;

-- Create trigger on auth.users to call Edge Function
-- Note: This requires superuser privileges
DO $$
BEGIN
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_on_user_created();
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Insufficient privileges to create trigger on auth.users.';
    RAISE NOTICE 'Please create the trigger manually via Supabase Dashboard:';
    RAISE NOTICE 'CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.trigger_on_user_created();';
  WHEN duplicate_object THEN
    RAISE NOTICE 'Trigger on_auth_user_created already exists. Skipping creation.';
END $$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.trigger_on_user_created() TO authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_on_user_created() TO service_role;

-- Comment
COMMENT ON FUNCTION public.trigger_on_user_created() IS 'Triggers Edge Function to setup new user profile and organization via on-user-created Edge Function';

