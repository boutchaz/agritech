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

    // If organization has an active paid subscription, reject
    if (existingSubscription && existingSubscription.status === 'active') {
      return new Response(
        JSON.stringify({ error: 'Organization already has an active subscription' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate trial end date (14 days from now)
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 14);

    // Map plan_type to plan_id for Polar.sh integration
    const planIdMap = {
      starter: 'starter-trial',
      professional: 'professional-trial',
      enterprise: 'enterprise-trial',
    };

    const plan_id = planIdMap[plan_type] || planIdMap.professional;

    // Create or update trial subscription using service role (bypasses RLS)
    // subscriptions table has: id, organization_id, status, plan_id, current_period_start,
    // current_period_end, cancel_at_period_end, created_at, updated_at
    console.log('🔄 Creating/updating subscription with service role for org:', organization_id);

    let subscription;
    let upsertError;

    if (existingSubscription) {
      // Update existing subscription
      console.log('♻️ Updating existing subscription:', existingSubscription.id);
      const { data: updatedSub, error: updateError } = await supabaseAdmin
        .from('subscriptions')
        .update({
          plan_id: plan_id,
          status: 'trialing',
          current_period_start: new Date().toISOString(),
          current_period_end: trialEndDate.toISOString(),
          cancel_at_period_end: false,
        })
        .eq('id', existingSubscription.id)
        .select()
        .single();

      subscription = updatedSub;
      upsertError = updateError;
    } else {
      // Insert new subscription
      console.log('➕ Creating new subscription');
      const { data: newSub, error: insertError } = await supabaseAdmin
        .from('subscriptions')
        .insert({
          organization_id: organization_id,
          plan_id: plan_id,
          status: 'trialing',
          current_period_start: new Date().toISOString(),
          current_period_end: trialEndDate.toISOString(),
          cancel_at_period_end: false,
        })
        .select()
        .single();

      subscription = newSub;
      upsertError = insertError;
    }

    console.log('📝 Upsert result:', { subscription: subscription?.id, error: upsertError });

    if (upsertError) {
      console.error('❌ Error creating/updating subscription:', upsertError);
      return new Response(
        JSON.stringify({ error: `Failed to create subscription: ${upsertError.message}` }),
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

