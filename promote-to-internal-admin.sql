-- =====================================================
-- PROMOTE USER TO INTERNAL ADMIN
-- =====================================================
-- 1. Replace 'admin@example.com' with the email you used to login.
-- 2. Run this in your Supabase SQL Editor.

INSERT INTO internal_admins (user_id, is_active)
SELECT id, true
FROM auth.users 
WHERE email = 'admin@example.com' -- <--- CHANGE THIS EMAIL
ON CONFLICT (user_id) DO UPDATE SET is_active = true;
