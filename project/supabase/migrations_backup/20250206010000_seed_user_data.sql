-- =====================================================
-- DATA SEEDING & FIXES
-- =====================================================
-- This migration ensures user profiles and organizations exist for existing auth users

-- Create user profiles for all auth users that don't have one
DO $$
DECLARE
    v_user RECORD;
BEGIN
    FOR v_user IN SELECT id, email, raw_user_meta_data FROM auth.users LOOP
        INSERT INTO user_profiles (
            id,
            email,
            full_name,
            language,
            timezone,
            onboarding_completed,
            password_set
        )
        VALUES (
            v_user.id,
            v_user.email,
            COALESCE(
                NULLIF(TRIM(COALESCE(v_user.raw_user_meta_data->>'full_name', '')), ''),
                COALESCE(v_user.raw_user_meta_data->>'first_name', '') || ' ' || COALESCE(v_user.raw_user_meta_data->>'last_name', ''),
                split_part(v_user.email, '@', 1)
            ),
            'fr',
            'Africa/Casablanca',
            true,
            true
        )
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            onboarding_completed = true,
            password_set = true,
            updated_at = NOW();
    END LOOP;

    RAISE NOTICE '✅ User profiles synced for all auth users';
END $$;

-- Ensure organization exists for organization ID 9a735597-c0a7-495c-b9f7-70842e34e3df
DO $$
DECLARE
    v_org_id uuid := '9a735597-c0a7-495c-b9f7-70842e34e3df';
    v_org_exists boolean;
BEGIN
    SELECT EXISTS(SELECT 1 FROM organizations WHERE id = v_org_id) INTO v_org_exists;

    IF NOT v_org_exists THEN
        INSERT INTO organizations (
            id,
            name,
            slug,
            email,
            currency_code,
            timezone,
            is_active
        )
        VALUES (
            v_org_id,
            'AgriTech Organization',
            'agritech-org',
            (SELECT email FROM auth.users ORDER BY created_at DESC LIMIT 1),
            'MAD',
            'Africa/Casablanca',
            true
        );
        RAISE NOTICE '✅ Created organization: AgriTech Organization';
    ELSE
        UPDATE organizations
        SET is_active = true, updated_at = NOW()
        WHERE id = v_org_id;
        RAISE NOTICE 'ℹ️  Organization already exists, updated';
    END IF;
END $$;

-- Link all auth users to the default organization as admins if they don't have an organization
DO $$
DECLARE
    v_user RECORD;
    v_org_id uuid := '9a735597-c0a7-495c-b9f7-70842e34e3df';
    v_linked_count integer := 0;
BEGIN
    FOR v_user IN
        SELECT u.id
        FROM auth.users u
        WHERE NOT EXISTS (
            SELECT 1 FROM organization_users ou
            WHERE ou.user_id = u.id AND ou.is_active = true
        )
    LOOP
        INSERT INTO organization_users (
            user_id,
            organization_id,
            role,
            is_active
        )
        VALUES (
            v_user.id,
            v_org_id,
            'organization_admin',
            true
        )
        ON CONFLICT (user_id, organization_id)
        DO UPDATE SET
            is_active = true,
            role = 'organization_admin',
            updated_at = NOW();

        v_linked_count := v_linked_count + 1;
    END LOOP;

    IF v_linked_count > 0 THEN
        RAISE NOTICE '✅ Linked % user(s) to organization', v_linked_count;
    ELSE
        RAISE NOTICE 'ℹ️  All users already linked to organizations';
    END IF;
END $$;

-- Create a trial subscription for the organization if it doesn't have one
DO $$
DECLARE
    v_org_id uuid := '9a735597-c0a7-495c-b9f7-70842e34e3df';
    v_sub_exists boolean;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM subscriptions
        WHERE organization_id = v_org_id
        AND status IN ('trialing', 'active')
    ) INTO v_sub_exists;

    IF NOT v_sub_exists THEN
        INSERT INTO subscriptions (
            organization_id,
            status,
            plan_id,
            current_period_start,
            current_period_end,
            cancel_at_period_end
        )
        VALUES (
            v_org_id,
            'trialing',
            'basic',
            NOW(),
            NOW() + INTERVAL '30 days',
            false
        )
        ON CONFLICT DO NOTHING;

        RAISE NOTICE '✅ Created trial subscription for organization';
    ELSE
        RAISE NOTICE 'ℹ️  Organization already has an active subscription';
    END IF;
END $$;

-- Final verification and summary
DO $$
DECLARE
    v_user_count integer;
    v_profile_count integer;
    v_org_count integer;
    v_org_user_count integer;
    v_sub_count integer;
BEGIN
    SELECT COUNT(*) INTO v_user_count FROM auth.users;
    SELECT COUNT(*) INTO v_profile_count FROM user_profiles;
    SELECT COUNT(*) INTO v_org_count FROM organizations;
    SELECT COUNT(*) INTO v_org_user_count FROM organization_users WHERE is_active = true;
    SELECT COUNT(*) INTO v_sub_count FROM subscriptions WHERE status IN ('trialing', 'active');

    RAISE NOTICE '================================================';
    RAISE NOTICE 'DATABASE INITIALIZATION SUMMARY';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Auth users: %', v_user_count;
    RAISE NOTICE 'User profiles: %', v_profile_count;
    RAISE NOTICE 'Organizations: %', v_org_count;
    RAISE NOTICE 'Active organization memberships: %', v_org_user_count;
    RAISE NOTICE 'Active subscriptions: %', v_sub_count;
    RAISE NOTICE '================================================';
    RAISE NOTICE '✅ Schema initialization complete!';
    RAISE NOTICE '================================================';
END $$;
