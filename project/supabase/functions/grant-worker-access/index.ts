import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface GrantWorkerAccessRequest {
  worker_id: string;
  email: string;
  first_name: string;
  last_name: string;
  organization_id: string;
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
    const body: GrantWorkerAccessRequest = await req.json();
    const { worker_id, email, first_name, last_name, organization_id } = body;

    if (!worker_id || !email || !organization_id) {
      throw new Error('Missing required fields: worker_id, email, organization_id');
    }

    console.log('👷 Granting platform access to worker:', { worker_id, email });

    // 1. Check if worker exists
    const { data: worker, error: workerError } = await supabase
      .from('workers')
      .select('id, user_id, organization_id')
      .eq('id', worker_id)
      .eq('organization_id', organization_id)
      .single();

    if (workerError || !worker) {
      throw new Error('Worker not found');
    }

    if (worker.user_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Worker already has platform access'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 2. Check if user with this email already exists
    const { data: { users: existingUsers } } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.find(u => u.email?.toLowerCase() === email.toLowerCase());

    let userId: string;

    if (existingUser) {
      console.log('📧 User already exists, linking to worker');
      userId = existingUser.id;
    } else {
      // 3. Create new user account
      console.log('📧 Creating new user account');
      const { data: newUser, error: createUserError } = await supabase.auth.admin.inviteUserByEmail(
        email,
        {
          data: {
            first_name,
            last_name,
            invited_to_organization: organization_id,
            invited_with_role: null, // Will be set below
            invited_by: user.id,
            is_worker: true
          },
          redirectTo: `${Deno.env.get('APP_URL') || 'http://localhost:5173'}/onboarding`
        }
      );

      if (createUserError || !newUser.user) {
        throw new Error(`Failed to create user: ${createUserError?.message}`);
      }

      userId = newUser.user.id;
      console.log('✅ User created:', userId);
    }

    // 4. Get farm_worker role
    const { data: roles, error: rolesError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'farm_worker')
      .limit(1);

    if (rolesError || !roles || roles.length === 0) {
      throw new Error('farm_worker role not found');
    }

    const roleId = roles[0].id;

    // 5. Add user to organization with farm_worker role
    const { error: orgUserError } = await supabase
      .from('organization_users')
      .insert({
        user_id: userId,
        organization_id,
        role_id: roleId,
        is_active: true,
        invited_by: user.id,
      });

    if (orgUserError && orgUserError.code !== '23505') { // Ignore if already exists
      console.error('❌ Error adding user to organization:', orgUserError);
      throw new Error(`Adding user to organization failed: ${orgUserError.message}`);
    }

    console.log('✅ User added to organization');

    // 6. Link worker to user
    const { error: updateWorkerError } = await supabase
      .from('workers')
      .update({ user_id: userId })
      .eq('id', worker_id);

    if (updateWorkerError) {
      console.error('❌ Error linking worker to user:', updateWorkerError);
      throw new Error(`Linking worker to user failed: ${updateWorkerError.message}`);
    }

    console.log('✅ Worker linked to user');

    return new Response(
      JSON.stringify({
        success: true,
        message: existingUser
          ? 'Worker linked to existing user account successfully'
          : 'Platform access granted successfully. User will receive an invitation email.',
        user_id: userId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error granting worker access:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to grant platform access'
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
