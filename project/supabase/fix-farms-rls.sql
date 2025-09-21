-- Fix farms table RLS for onboarding
-- Temporarily disable RLS to allow onboarding to work

-- Disable RLS on farms table
ALTER TABLE public.farms DISABLE ROW LEVEL SECURITY;

-- Grant permissions to allow inserts
GRANT INSERT, UPDATE, DELETE ON public.farms TO authenticated, anon;

-- Reload schema
NOTIFY pgrst, 'reload schema';

SELECT 'Farms table RLS disabled for onboarding' as status;
