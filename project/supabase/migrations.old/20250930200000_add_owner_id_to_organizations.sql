-- Add owner_id column to organizations table
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add index for owner_id
CREATE INDEX IF NOT EXISTS idx_organizations_owner_id ON public.organizations(owner_id);

-- Update existing organizations to set owner_id from organization_users where role is 'owner' or 'admin'
UPDATE public.organizations o
SET owner_id = (
    SELECT ou.user_id
    FROM public.organization_users ou
    WHERE ou.organization_id = o.id
    AND ou.role IN ('owner', 'admin')
    ORDER BY ou.created_at ASC
    LIMIT 1
)
WHERE owner_id IS NULL;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
