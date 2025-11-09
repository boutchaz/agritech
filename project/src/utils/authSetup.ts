import { authSupabase } from '../lib/auth-supabase';

interface SetupNewUserParams {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  organizationName?: string;
}

/**
 * Sets up a new user account with:
 * 1. User profile
 * 2. Default organization
 * 3. Organization membership with admin role
 */
export async function setupNewUser({
  userId,
  email,
  firstName,
  lastName,
  organizationName,
}: SetupNewUserParams): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🚀 Starting setupNewUser:', { userId, email, organizationName });

    // 1. Create or update the user profile with baseline data
    const defaultFirstName = (firstName || email.split('@')[0]).trim();
    const defaultLastName = (lastName || '').trim();
    const fullName = [defaultFirstName, defaultLastName].filter(Boolean).join(' ');

    console.log('📝 Upserting user profile:', { userId, defaultFirstName, defaultLastName });
    const { error: profileError } = await authSupabase
      .from('user_profiles')
      .upsert({
        id: userId,
        email,
        first_name: defaultFirstName,
        last_name: defaultLastName,
        full_name: fullName || defaultFirstName,
        language: 'fr',
        timezone: 'Africa/Casablanca',
        password_set: false,
        onboarding_completed: false,
        updated_at: new Date().toISOString(),
      });

    if (profileError && profileError.code !== '23505') { // Ignore duplicate key error
      console.error('❌ Error creating user profile:', profileError);
      throw new Error('Failed to create user profile');
    }
    console.log('✅ User profile created');

    // 2. Check if user already has an organization
    const { data: existingOrgUsers, error: checkError } = await authSupabase
      .from('organization_users')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (checkError) {
      console.error('Error checking existing organizations:', checkError);
    }

    // If user already has an organization, skip creation
    if (existingOrgUsers && existingOrgUsers.length > 0) {
      console.log('User already has an organization, skipping setup');
      return { success: true };
    }

    // 3. Create default organization
    const defaultOrgName = organizationName || `${defaultFirstName}'s Organization`;
    const orgSlug = `${defaultOrgName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${userId.substring(0, 8)}`;

    console.log('🏢 Creating organization:', { defaultOrgName, orgSlug });
    const { data: newOrg, error: orgError } = await authSupabase
      .from('organizations')
      .insert({
        name: defaultOrgName,
        slug: orgSlug,
        email,
        currency_code: 'MAD',
        timezone: 'Africa/Casablanca',
        is_active: true,
        onboarding_completed: false,
      })
      .select()
      .single();

    if (orgError) {
      console.error('❌ Error creating organization:', orgError);
      throw new Error(`Failed to create organization: ${orgError.message}`);
    }
    console.log('✅ Organization created:', newOrg.id);

    // 4. Link user to organization as organization_admin
    // Get the organization_admin role_id from the roles table
    const { data: orgAdminRole, error: roleError } = await authSupabase
      .from('roles')
      .select('id')
      .eq('name', 'organization_admin')
      .single();

    if (roleError || !orgAdminRole) {
      console.error('❌ Error fetching organization_admin role:', roleError);
      throw new Error('Failed to fetch organization_admin role');
    }

    const { error: orgUserError } = await authSupabase
      .from('organization_users')
      .insert({
        user_id: userId,
        organization_id: newOrg.id,
        role_id: orgAdminRole.id,
        is_active: true,
      });

    if (orgUserError && orgUserError.code !== '23505') {
      console.error('❌ Error adding user to organization:', orgUserError);
      throw new Error('Failed to add user to organization');
    }
    console.log('✅ Organization user created');

    console.log('✅ User setup completed successfully (subscription auto-created by trigger)');
    return { success: true };
  } catch (error) {
    console.error('setupNewUser error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during user setup',
    };
  }
}

/**
 * Checks if a user needs onboarding (missing profile, organization, or incomplete onboarding)
 */
export async function checkUserNeedsOnboarding(userId: string): Promise<boolean> {
  try {
    // Check if user has a profile with full_name
    const { data: profile } = await authSupabase
      .from('user_profiles')
      .select('id, full_name')
      .eq('id', userId)
      .single();

    // User needs onboarding if profile doesn't exist or full_name is missing
    if (!profile || !profile.full_name) return true;

    // Check if user has an organization membership
    const { data: orgUsers } = await authSupabase
      .from('organization_users')
      .select('organization_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(1);

    // User needs onboarding if they don't have an organization
    if (!orgUsers || orgUsers.length === 0) return true;

    // User has profile and organization - no onboarding needed
    return false;
  } catch (error) {
    console.error('Error checking user onboarding status:', error);
    return true; // Assume needs onboarding if check fails
  }
}
