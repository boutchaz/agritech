-- Create a webhook trigger that calls the edge function when a new user is created
-- This uses Supabase's built-in HTTP request functionality via pg_net extension

-- Enable pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a function to call the edge function
CREATE OR REPLACE FUNCTION public.trigger_on_user_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created_webhook ON auth.users;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created_webhook
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_on_user_created();

-- Store configuration settings (will be set during deployment)
-- These are placeholders - actual values set via dashboard or CLI
ALTER DATABASE postgres SET app.settings.supabase_url TO 'http://127.0.0.1:54321';
ALTER DATABASE postgres SET app.settings.service_role_key TO 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

-- Comment
COMMENT ON FUNCTION public.trigger_on_user_created() IS 'Triggers edge function to setup new user profile and organization';
COMMENT ON TRIGGER on_auth_user_created_webhook ON auth.users IS 'Calls on-user-created edge function when new user signs up';
