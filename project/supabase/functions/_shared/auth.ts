import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2.39.7";

export interface AuthContext {
  user: {
    id: string;
    email?: string;
  };
  supabase: SupabaseClient;
  organizationId?: string;
}

/**
 * Authenticates the request and returns the authenticated user context
 * Throws an error if authentication fails
 */
export async function authenticateRequest(req: Request): Promise<AuthContext> {
  // Extract the authorization header
  const authHeader = req.headers.get('authorization');

  if (!authHeader) {
    throw new Error('Missing authorization header');
  }

  // Create a Supabase client with the user's JWT token
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: {
        headers: { authorization: authHeader },
      },
    }
  );

  // Verify the JWT and get the user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Invalid or expired token');
  }

  return {
    user: {
      id: user.id,
      email: user.email,
    },
    supabase,
  };
}

/**
 * Validates that the user has access to the specified parcel
 * Returns the parcel with farm and organization information
 */
export async function validateParcelAccess(
  supabase: SupabaseClient,
  userId: string,
  parcelId: string
): Promise<any> {
  // Query parcel with RLS policies applied
  const { data: parcel, error } = await supabase
    .from('parcels')
    .select(`
      *,
      farms!inner(
        id,
        name,
        organization_id,
        organization_users!inner(
          user_id,
          role,
          is_active
        )
      )
    `)
    .eq('id', parcelId)
    .eq('farms.organization_users.user_id', userId)
    .eq('farms.organization_users.is_active', true)
    .single();

  if (error || !parcel) {
    throw new Error('Parcel not found or access denied');
  }

  return parcel;
}

/**
 * Validates that the user has access to the specified farm
 * Returns the farm with organization information
 */
export async function validateFarmAccess(
  supabase: SupabaseClient,
  userId: string,
  farmId: string
): Promise<any> {
  // Query farm with RLS policies applied
  const { data: farm, error } = await supabase
    .from('farms')
    .select(`
      *,
      organization_users!inner(
        user_id,
        role,
        is_active
      )
    `)
    .eq('id', farmId)
    .eq('organization_users.user_id', userId)
    .eq('organization_users.is_active', true)
    .single();

  if (error || !farm) {
    throw new Error('Farm not found or access denied');
  }

  return farm;
}

/**
 * Validates that the user has access to the specified organization
 * Returns the organization
 */
export async function validateOrganizationAccess(
  supabase: SupabaseClient,
  userId: string,
  organizationId: string
): Promise<any> {
  // Query organization with RLS policies applied
  const { data: orgUser, error } = await supabase
    .from('organization_users')
    .select(`
      *,
      organizations!inner(*)
    `)
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  if (error || !orgUser) {
    throw new Error('Organization not found or access denied');
  }

  return orgUser.organizations;
}

/**
 * Checks if the user has a specific role in the organization
 */
export async function validateUserRole(
  supabase: SupabaseClient,
  userId: string,
  organizationId: string,
  allowedRoles: string[]
): Promise<boolean> {
  const { data, error } = await supabase
    .from('organization_users')
    .select('role')
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return false;
  }

  return allowedRoles.includes(data.role);
}
