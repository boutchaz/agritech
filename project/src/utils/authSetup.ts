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

    // 1. Create user profile
    const defaultFirstName = firstName || email.split('@')[0];
    console.log('📝 Creating user profile:', { userId, defaultFirstName });
    const { error: profileError } = await authSupabase
      .from('user_profiles')
      .insert({
        id: userId,
        first_name: defaultFirstName,
        last_name: lastName || '',
        timezone: 'Africa/Casablanca',
        language: 'fr',
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
        owner_id: userId,
        currency: 'MAD',
        timezone: 'Africa/Casablanca',
        language: 'fr',
      })
      .select()
      .single();

    if (orgError) {
      console.error('❌ Error creating organization:', orgError);
      throw new Error(`Failed to create organization: ${orgError.message}`);
    }
    console.log('✅ Organization created:', newOrg.id);

    // 4. Get organization_admin role
    const { data: roles, error: rolesError } = await authSupabase
      .from('roles')
      .select('id')
      .eq('name', 'organization_admin')
      .limit(1);

    if (rolesError || !roles || roles.length === 0) {
      console.error('Error fetching roles:', rolesError);
      throw new Error('organization_admin role not found in database');
    }

    const roleId = roles[0].id;

    // 5. Add user to organization with admin role
    console.log('📝 Adding user to organization:', {
      user_id: userId,
      organization_id: newOrg.id,
      role_id: roleId,
    });

    const { data: orgUserData, error: orgUserError } = await authSupabase
      .from('organization_users')
      .insert({
        user_id: userId,
        organization_id: newOrg.id,
        role_id: roleId,
        is_active: true,
        invited_by: userId,
      })
      .select();

    if (orgUserError) {
      console.error('❌ Error adding user to organization:', orgUserError);
      throw new Error('Failed to add user to organization');
    }

    console.log('✅ Organization user created:', orgUserData);
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
    // Check if user has a profile
    const { data: profile } = await authSupabase
      .from('user_profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (!profile) return true;

    // Check if user has an organization membership
    const { data: orgUsers } = await authSupabase
      .from('organization_users')
      .select('organization_id, organizations!inner(onboarding_completed)')
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(1);

    if (!orgUsers || orgUsers.length === 0) return true;

    // Check if organization has completed onboarding
    const org = orgUsers[0].organizations as { onboarding_completed: boolean };
    return !org.onboarding_completed;
  } catch (error) {
    console.error('Error checking user onboarding status:', error);
    return true; // Assume needs onboarding if check fails
  }
}
