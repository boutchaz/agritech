import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface InviteUserRequest {
  email: string;
  role_id: string;
  organization_id: string;
  first_name?: string;
  last_name?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user making the request
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Parse request body
    const body: InviteUserRequest = await req.json();
    const { email, role_id, organization_id, first_name, last_name } = body;

    if (!email || !role_id || !organization_id) {
      throw new Error('Missing required fields: email, role_id, organization_id');
    }

    // Verify the requesting user has permission to invite users to this organization
    const { data: requestingUserOrg } = await supabase
      .from('organization_users')
      .select('role_id, roles!inner(name, level)')
      .eq('user_id', user.id)
      .eq('organization_id', organization_id)
      .eq('is_active', true)
      .single();

    if (!requestingUserOrg) {
      throw new Error('You do not have permission to invite users to this organization');
    }

    // Only organization_admin and system_admin can invite users
    const allowedRoles = ['organization_admin', 'system_admin'];
    if (!allowedRoles.includes(requestingUserOrg.roles.name)) {
      throw new Error('Insufficient permissions to invite users');
    }

    // Check if the role being assigned is valid and not higher than the inviter's role
    const { data: targetRole } = await supabase
      .from('roles')
      .select('level')
      .eq('id', role_id)
      .single();

    if (!targetRole) {
      throw new Error('Invalid role_id');
    }

    // System admins can assign any role, others can only assign roles at their level or lower
    if (requestingUserOrg.roles.name !== 'system_admin' && targetRole.level < requestingUserOrg.roles.level) {
      throw new Error('You cannot assign a role higher than your own');
    }

    // Check if user already exists
    const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();
    const existingUser = authUsers?.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (existingUser) {
      // User exists - check if already in organization
      const { data: existingOrgUser } = await supabase
        .from('organization_users')
        .select('id, is_active')
        .eq('user_id', existingUser.id)
        .eq('organization_id', organization_id)
        .maybeSingle();

      if (existingOrgUser) {
        if (existingOrgUser.is_active) {
          throw new Error('User is already an active member of this organization');
        } else {
          // Reactivate the user
          const { error: updateError } = await supabase
            .from('organization_users')
            .update({
              role_id,
              is_active: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingOrgUser.id);

          if (updateError) throw updateError;

          return new Response(
            JSON.stringify({
              success: true,
              message: 'User reactivated and added to organization',
              user_id: existingUser.id
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Add existing user to organization
      const { error: insertError } = await supabase
        .from('organization_users')
        .insert({
          user_id: existingUser.id,
          organization_id,
          role_id,
          is_active: true
        });

      if (insertError) throw insertError;

      // Update profile if name provided
      if (first_name || last_name) {
        await supabase
          .from('user_profiles')
          .upsert({
            id: existingUser.id,
            first_name,
            last_name,
            updated_at: new Date().toISOString()
          });
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'User added to organization successfully',
          user_id: existingUser.id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // User doesn't exist - send invitation email
      const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
        email,
        {
          data: {
            first_name: first_name || '',
            last_name: last_name || '',
            invited_to_organization: organization_id,
            invited_with_role: role_id,
            invited_by: user.id,
            needs_password_setup: true
          },
          redirectTo: `${Deno.env.get('APP_URL') || 'http://localhost:5173'}/set-password`
        }
      );

      if (inviteError) throw inviteError;

      // Create organization_users record immediately with the invited user's ID
      // This ensures the user is in the organization when they accept the invitation
      if (inviteData.user?.id) {
        const { error: orgUserError } = await supabase
          .from('organization_users')
          .insert({
            user_id: inviteData.user.id,
            organization_id: organization_id,
            role_id: role_id,
            is_active: true,
            invited_by: user.id
          });

        if (orgUserError) {
          console.error('Error creating organization_users record for invited user:', orgUserError);
          // Don't throw - the invitation email was sent, we just log the error
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Invitation email sent successfully',
          invited_user_id: inviteData.user?.id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error inviting user:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to invite user'
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
