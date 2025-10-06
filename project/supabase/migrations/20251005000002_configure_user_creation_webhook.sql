-- Configuration for user creation webhook
-- Sets the Supabase URL and service role key for the trigger function

-- Note: These ALTER DATABASE statements require superuser privileges
-- They will be silently skipped if you don't have the necessary permissions

-- Set the Supabase URL (for local development)
DO $$
BEGIN
  ALTER DATABASE postgres SET app.settings.supabase_url TO 'http://kong:8000';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Insufficient privileges to set app.settings.supabase_url. This setting may need to be configured manually.';
END $$;

DO $$
BEGIN
  ALTER DATABASE postgres SET app.settings.service_role_key TO 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Insufficient privileges to set app.settings.service_role_key. This setting may need to be configured manually.';
END $$;

-- Note: In production, you should set these via:
-- ALTER DATABASE your_db_name SET app.settings.supabase_url TO 'https://your-project-ref.supabase.co';
-- ALTER DATABASE your_db_name SET app.settings.service_role_key TO 'your-service-role-key';
