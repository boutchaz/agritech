import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: any;
  schema: string;
  old_record: any | null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create admin Supabase client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Parse webhook payload
    const payload: WebhookPayload = await req.json();

    console.log('🔔 Webhook triggered:', {
      type: payload.type,
      table: payload.table,
      userId: payload.record?.id
    });

    // Only process INSERT events on auth.users table
    if (payload.type !== 'INSERT' || payload.table !== 'users') {
      return new Response(
        JSON.stringify({ message: 'Event ignored - not a user insert' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const newUser = payload.record;
    const userId = newUser.id;
    const email = newUser.email;

    console.log('👤 Setting up new user:', { userId, email });

    // 1. Create user profile
    const firstName = newUser.raw_user_meta_data?.first_name || email.split('@')[0];
    const lastName = newUser.raw_user_meta_data?.last_name || '';
    const needsPasswordSetup = newUser.raw_user_meta_data?.needs_password_setup === true;

    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: userId,
        first_name: firstName,
        last_name: lastName,
        timezone: newUser.raw_user_meta_data?.timezone || 'Africa/Casablanca',
        language: newUser.raw_user_meta_data?.language || 'fr',
        password_set: !needsPasswordSetup, // FALSE if invited user, TRUE otherwise
      });

    if (profileError && profileError.code !== '23505') {
      console.error('❌ Error creating user profile:', profileError);
      throw new Error(`Profile creation failed: ${profileError.message}`);
    }

    console.log('✅ User profile created');

    // 2. Check if user was invited to an organization
    console.log('🔍 Checking invitation metadata:', {
      raw_user_meta_data: newUser.raw_user_meta_data,
      user_metadata: newUser.user_metadata
    });

    const invitedToOrganization = newUser.raw_user_meta_data?.invited_to_organization;
    const invitedWithRole = newUser.raw_user_meta_data?.invited_with_role;
    const invitedBy = newUser.raw_user_meta_data?.invited_by;

    console.log('🔍 Invitation details:', {
      invitedToOrganization,
      invitedWithRole,
      invitedBy
    });

    // Check if user already has organization_users record (created during invitation)
    const { data: existingOrgUsers, error: checkError } = await supabaseAdmin
      .from('organization_users')
      .select('id, organization_id, role_id')
      .eq('user_id', userId)
      .limit(1);

    if (checkError) {
      console.error('⚠️ Error checking existing organizations:', checkError);
    }

    if (existingOrgUsers && existingOrgUsers.length > 0) {
      console.log('✅ User already has organization_users record:', existingOrgUsers[0]);
      return new Response(
        JSON.stringify({
          message: 'User setup completed (existing org user)',
          userId,
          profile: true,
          organization: true,
          organizationId: existingOrgUsers[0].organization_id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    if (invitedToOrganization && invitedWithRole) {
      console.log('👥 User was invited to organization:', invitedToOrganization);

      // Add user to the organization they were invited to
      const { error: orgUserError } = await supabaseAdmin
        .from('organization_users')
        .insert({
          user_id: userId,
          organization_id: invitedToOrganization,
          role_id: invitedWithRole,
          is_active: true,
          invited_by: invitedBy || userId,
        });

      if (orgUserError) {
        console.error('❌ Error adding invited user to organization:', orgUserError);
        throw new Error(`Adding invited user to organization failed: ${orgUserError.message}`);
      }

      console.log('✅ Invited user added to organization');

      return new Response(
        JSON.stringify({
          message: 'User setup completed (invited user)',
          userId,
          profile: true,
          organization: true,
          organizationId: invitedToOrganization
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // 3. Create default organization (only if no invitation and no existing org)
    const orgName = newUser.raw_user_meta_data?.organization_name || `${firstName}'s Organization`;
    const orgSlug = `${orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${userId.substring(0, 8)}`;

    const { data: newOrg, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({
        name: orgName,
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
      throw new Error(`Organization creation failed: ${orgError.message}`);
    }

    console.log('✅ Organization created:', newOrg.id);

    // 4. Get organization_admin role
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from('roles')
      .select('id')
      .eq('name', 'organization_admin')
      .limit(1);

    if (rolesError || !roles || roles.length === 0) {
      console.error('❌ Error fetching roles:', rolesError);
      throw new Error('organization_admin role not found');
    }

    const roleId = roles[0].id;

    // 5. Add user to organization with admin role
    const { error: orgUserError } = await supabaseAdmin
      .from('organization_users')
      .insert({
        user_id: userId,
        organization_id: newOrg.id,
        role_id: roleId,
        is_active: true,
        invited_by: userId,
      });

    if (orgUserError) {
      console.error('❌ Error adding user to organization:', orgUserError);
      throw new Error(`Adding user to organization failed: ${orgUserError.message}`);
    }

    console.log('✅ User added to organization');

    // 7. Optional: Create default farm for the organization
    // Uncomment if you want to create a starter farm
    /*
    const { error: farmError } = await supabaseAdmin
      .from('farms')
      .insert({
        name: 'Main Farm',
        organization_id: newOrg.id,
        location: 'Morocco',
        size: 0,
        manager_name: `${firstName} ${lastName}`,
      });

    if (farmError) {
      console.error('⚠️ Error creating default farm:', farmError);
    } else {
      console.log('✅ Default farm created');
    }
    */

    console.log('🎉 User setup completed successfully');

    return new Response(
      JSON.stringify({
        message: 'User setup completed successfully',
        userId,
        profile: true,
        organization: true,
        organizationId: newOrg.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('💥 Error in on-user-created function:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        stack: error.stack
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
