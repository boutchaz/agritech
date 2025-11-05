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

    // Parse request - handle both webhook payload and direct user data
    let newUser: any;
    let payload: WebhookPayload | null = null;

    try {
      payload = await req.json();
      // Check if it's a webhook payload
      if (payload.type && payload.table && payload.record) {
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

        newUser = payload.record;
      } else {
        // Direct call with user data
        newUser = payload;
      }
    } catch (e) {
      return new Response(
        JSON.stringify({ error: 'Invalid request payload' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    const userId = newUser.id;
    const email = newUser.email;
    const emailConfirmed = newUser.email_confirmed_at !== null;

    console.log('👤 Setting up new user:', { userId, email, emailConfirmed });

    // Skip if email not confirmed and confirmation is required
    // In production, you might want to wait for email confirmation
    // For now, we'll proceed but log a warning
    if (!emailConfirmed && !newUser.raw_user_meta_data?.allow_unconfirmed_setup) {
      console.log('⚠️ User email not confirmed, but proceeding with setup');
    }

    // 1. Create user profile
    const firstName = newUser.raw_user_meta_data?.first_name || email?.split('@')[0] || 'User';
    const lastName = newUser.raw_user_meta_data?.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim() || email?.split('@')[0] || 'User';

    // Create user profile - user_profiles table has: full_name, email, phone, language, timezone, avatar_url, onboarding_completed, password_set
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: userId,
        email: email,
        full_name: fullName,
        phone: newUser.raw_user_meta_data?.phone || null,
        timezone: newUser.raw_user_meta_data?.timezone || 'Africa/Casablanca',
        language: newUser.raw_user_meta_data?.language || 'fr',
        onboarding_completed: false,
        password_set: true, // User just signed up, so password is set
      })
      .select();

    if (profileError && profileError.code !== '23505') {
      console.error('❌ Error creating user profile:', profileError);
      // Try upsert instead of insert in case of race condition
      const { error: upsertError } = await supabaseAdmin
        .from('user_profiles')
        .upsert({
          id: userId,
          email: email,
          full_name: fullName,
          phone: newUser.raw_user_meta_data?.phone || null,
          timezone: newUser.raw_user_meta_data?.timezone || 'Africa/Casablanca',
          language: newUser.raw_user_meta_data?.language || 'fr',
          password_set: true,
        }, {
          onConflict: 'id'
        });

      if (upsertError) {
        console.error('❌ Error upserting user profile:', upsertError);
        throw new Error(`Profile creation failed: ${upsertError.message}`);
      }
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
    // organization_users table has: id, organization_id, user_id, role, is_active, created_at, updated_at
    const { data: existingOrgUsers, error: checkError } = await supabaseAdmin
      .from('organization_users')
      .select('id, organization_id, role')
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
      // organization_users table only has: organization_id, user_id, role, is_active
      const { error: orgUserError } = await supabaseAdmin
        .from('organization_users')
        .insert({
          user_id: userId,
          organization_id: invitedToOrganization,
          role: invitedWithRole, // This should be the role name like 'organization_admin', 'farm_manager', etc.
          is_active: true,
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

    let newOrg;
    let orgError;

    // Try to create organization
    // organizations table has: name, slug, description, address, city, state, postal_code, country,
    // phone, email, website, tax_id, currency_code, timezone, logo_url, is_active
    // Note: no 'owner_id' column - ownership is tracked via organization_users with organization_admin role
    const { data: orgData, error: orgErr } = await supabaseAdmin
      .from('organizations')
      .insert({
        name: orgName,
        slug: orgSlug,
        currency_code: 'MAD',
        timezone: 'Africa/Casablanca',
        is_active: true,
      })
      .select()
      .single();

    orgError = orgErr;
    newOrg = orgData;

    if (orgError) {
      // Check if it's a duplicate key error (org already exists with same slug)
      if (orgError.code === '23505') {
        console.log('⚠️ Organization slug already exists, attempting to fetch it or create with different slug');
        // Try to find organization where user is admin
        const { data: userOrgs, error: fetchError } = await supabaseAdmin
          .from('organization_users')
          .select('organization_id, organizations(id, name, slug)')
          .eq('user_id', userId)
          .eq('role', 'admin')
          .limit(1);

        if (!fetchError && userOrgs && userOrgs.length > 0 && userOrgs[0].organizations) {
          newOrg = userOrgs[0].organizations;
          console.log('✅ Using existing organization:', newOrg.id);
        } else {
          // Try with a different slug (add timestamp)
          const newSlug = `${orgSlug}-${Date.now()}`;
          const { data: retryOrgData, error: retryError } = await supabaseAdmin
            .from('organizations')
            .insert({
              name: orgName,
              slug: newSlug,
              currency_code: 'MAD',
              timezone: 'Africa/Casablanca',
              is_active: true,
            })
            .select()
            .single();

          if (retryError) {
            console.error('❌ Error creating organization with new slug:', retryError);
            throw new Error(`Organization creation failed: ${orgError.message} (code: ${orgError.code})`);
          }

          newOrg = retryOrgData;
          console.log('✅ Organization created with new slug:', newOrg.id);
        }
      } else {
        console.error('❌ Error creating organization:', orgError);
        throw new Error(`Organization creation failed: ${orgError.message} (code: ${orgError.code})`);
      }
    } else {
      console.log('✅ Organization created:', newOrg.id);
    }

    // 4. Add user to organization with admin role
    // organization_users table only has: organization_id, user_id, role, is_active
    // The role field should match a role name in the roles table (e.g., 'organization_admin')
    const { error: orgUserError } = await supabaseAdmin
      .from('organization_users')
      .insert({
        user_id: userId,
        organization_id: newOrg.id,
        role: 'organization_admin', // Role name from roles table
        is_active: true,
      });

    if (orgUserError) {
      // Check if it's a duplicate key error (user already in org)
      if (orgUserError.code === '23505') {
        console.log('⚠️ User already in organization, skipping');
        // Update existing record to ensure it's active
        const { error: updateError } = await supabaseAdmin
          .from('organization_users')
          .update({
            role: 'organization_admin',
            is_active: true,
          })
          .eq('user_id', userId)
          .eq('organization_id', newOrg.id);

        if (updateError) {
          console.error('❌ Error updating organization user:', updateError);
          throw new Error(`Adding user to organization failed: ${orgUserError.message}`);
        }
      } else {
        console.error('❌ Error adding user to organization:', orgUserError);
        throw new Error(`Adding user to organization failed: ${orgUserError.message} (code: ${orgUserError.code})`);
      }
    } else {
      console.log('✅ User added to organization');
    }

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
