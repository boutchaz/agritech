-- Add onboarding_completed column to organizations table
-- This column tracks whether an organization has completed the initial onboarding flow

-- Add the column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organizations' 
        AND column_name = 'onboarding_completed'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.organizations
        ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE;
        
        -- Set existing organizations to true if they have farms, assuming they completed onboarding
        UPDATE public.organizations o
        SET onboarding_completed = TRUE
        WHERE EXISTS (SELECT 1 FROM public.farms f WHERE f.organization_id = o.id);
        
        -- Add comment for clarity
        COMMENT ON COLUMN public.organizations.onboarding_completed IS 'Indicates if the organization has completed the initial onboarding flow.';
    END IF;
END $$;
