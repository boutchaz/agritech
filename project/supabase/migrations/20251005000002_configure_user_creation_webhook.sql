-- Configuration for user creation webhook
-- Sets the Supabase URL and service role key for the trigger function

-- Set the Supabase URL (for local development)
-- In production, these should be set via ALTER DATABASE or environment-specific settings
ALTER DATABASE postgres SET app.settings.supabase_url TO 'http://kong:8000';
ALTER DATABASE postgres SET app.settings.service_role_key TO 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

-- Note: In production, you should set these via:
-- ALTER DATABASE your_db_name SET app.settings.supabase_url TO 'https://your-project-ref.supabase.co';
-- ALTER DATABASE your_db_name SET app.settings.service_role_key TO 'your-service-role-key';
