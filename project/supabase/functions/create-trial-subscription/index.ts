import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateTrialSubscriptionRequest {
  organization_id: string;
  plan_type: 'starter' | 'professional' | 'enterprise';
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's auth token
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing Supabase environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create authenticated client to get user info
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Get the current user
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      console.error('❌ Error getting user:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { organization_id, plan_type }: CreateTrialSubscriptionRequest = await req.json();

    if (!organization_id || !plan_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: organization_id, plan_type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create service role client to bypass RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify user belongs to the organization
    const { data: orgUser, error: orgUserError } = await supabaseAdmin
      .from('organization_users')
      .select('organization_id, role, is_active')
      .eq('user_id', user.id)
      .eq('organization_id', organization_id)
      .eq('is_active', true)
      .single();

    if (orgUserError || !orgUser) {
      console.error('❌ User does not belong to organization:', orgUserError);
      return new Response(
        JSON.stringify({ error: 'User does not belong to this organization' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if organization already has a subscription
    const { data: existingSubscription, error: existingError } = await supabaseAdmin
      .from('subscriptions')
      .select('id, status')
      .eq('organization_id', organization_id)
      .maybeSingle();

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('❌ Error checking existing subscription:', existingError);
      return new Response(
        JSON.stringify({ error: 'Failed to check existing subscription' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingSubscription) {
      return new Response(
        JSON.stringify({ error: 'Organization already has a subscription' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Define plan limits
    const planLimits = {
      starter: { farms: 5, parcels: 20, users: 3, satelliteReports: 10 },
      professional: { farms: 20, parcels: 100, users: 10, satelliteReports: 50 },
      enterprise: { farms: 100, parcels: 500, users: 50, satelliteReports: 200 },
    };

    const limits = planLimits[plan_type] || planLimits.professional;

    // Calculate trial end date (14 days from now)
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 14);

    // Create trial subscription using service role (bypasses RLS)
    // Use RPC or direct SQL to bypass any potential RLS issues
    console.log('🔄 Creating subscription with service role for org:', organization_id);
    
    const { data: subscription, error: insertError } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        organization_id: organization_id,
        plan_type: plan_type,
        status: 'trialing',
        current_period_start: new Date().toISOString(),
        current_period_end: trialEndDate.toISOString(),
        max_farms: limits.farms,
        max_parcels: limits.parcels,
        max_users: limits.users,
        max_satellite_reports: limits.satelliteReports,
      })
      .select()
      .single();
    
    console.log('📝 Insert result:', { subscription: subscription?.id, error: insertError });

    if (insertError) {
      console.error('❌ Error creating subscription:', insertError);
      return new Response(
        JSON.stringify({ error: `Failed to create subscription: ${insertError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Trial subscription created:', subscription.id);

    return new Response(
      JSON.stringify({ success: true, subscription }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

