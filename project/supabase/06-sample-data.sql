-- Step 6: Create Sample Data (Optional)
-- Run this last, after all other steps are successful

-- Sample data
DO $$
DECLARE
    demo_org_id UUID;
BEGIN
    -- Check if demo organization already exists
    SELECT id INTO demo_org_id FROM organizations WHERE slug = 'demo-farm' LIMIT 1;

    IF demo_org_id IS NULL THEN
        INSERT INTO organizations (name, slug, description)
        VALUES ('Demo Farm', 'demo-farm', 'A demonstration farm for testing')
        RETURNING id INTO demo_org_id;

        -- Add a demo farm
        INSERT INTO farms (organization_id, name, location, size, manager_name)
        VALUES (
            demo_org_id,
            'Demo Orchard',
            'Demo Location, Country',
            25.5,
            'Demo Manager'
        );
    END IF;
END $$;