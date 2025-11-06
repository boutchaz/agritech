-- Fix user organization membership
-- This script adds the user to their organization if missing

-- Get the user ID and organization ID from the system
-- You'll need to replace these with actual values from the console

-- Example: Link user to organization
-- Replace 'YOUR_USER_ID' and 'YOUR_ORG_ID' with actual values

DO $$
DECLARE
    v_user_id uuid;
    v_org_id uuid;
BEGIN
    -- Find the most recent user (assuming it's the test user)
    SELECT id INTO v_user_id
    FROM auth.users
    ORDER BY created_at DESC
    LIMIT 1;

    -- Find the most recent organization
    SELECT id INTO v_org_id
    FROM organizations
    ORDER BY created_at DESC
    LIMIT 1;

    RAISE NOTICE 'User ID: %, Org ID: %', v_user_id, v_org_id;

    -- Check if user_profile exists
    IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE id = v_user_id) THEN
        -- Create user profile
        INSERT INTO user_profiles (id, email, full_name, timezone, language, password_set)
        SELECT
            id,
            email,
            COALESCE(raw_user_meta_data->>'full_name', email),
            'Africa/Casablanca',
            'fr',
            true
        FROM auth.users
        WHERE id = v_user_id;

        RAISE NOTICE 'Created user profile';
    END IF;

    -- Link user to organization if not already linked
    INSERT INTO organization_users (user_id, organization_id, role, is_active)
    VALUES (v_user_id, v_org_id, 'organization_admin', true)
    ON CONFLICT (user_id, organization_id)
    DO UPDATE SET
        is_active = true,
        role = 'organization_admin',
        updated_at = NOW();

    RAISE NOTICE 'Linked user to organization';

END $$;

-- Verify the fix
SELECT
    u.email,
    o.name as organization_name,
    ou.role,
    ou.is_active
FROM organization_users ou
JOIN auth.users u ON u.id = ou.user_id
JOIN organizations o ON o.id = ou.organization_id
ORDER BY ou.created_at DESC
LIMIT 5;
