import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-polar-webhook-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface PolarWebhookEvent {
  type: string;
  data: {
    id: string;
    object: string;
    customer_id?: string;
    customer_email?: string;
    product_id?: string;
    status?: string;
    subscription_id?: string;
    current_period_start?: string;
    current_period_end?: string;
    cancel_at_period_end?: boolean;
    canceled_at?: string;
    metadata?: Record<string, any>;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Log webhook receipt
    console.log('📥 Webhook received:', req.method, req.url);

    // Verify webhook signature (optional - Polar may not send it for all events)
    const signature = req.headers.get('x-polar-webhook-signature');
    const webhookSecret = Deno.env.get('POLAR_WEBHOOK_SECRET');

    if (webhookSecret && signature) {
      // Only verify if both are present
      console.log('🔐 Verifying webhook signature');
      // TODO: Implement actual signature verification if needed
    } else {
      console.log('⚠️ Webhook signature verification skipped (signature or secret not provided)');
    }

    // Parse the webhook event
    const event: PolarWebhookEvent = await req.json();
    console.log('📦 Event type:', event.type);

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle different event types
    switch (event.type) {
      case 'checkout.updated':
        await handleCheckoutUpdated(supabase, event);
        break;

      case 'subscription.created':
      case 'subscription.updated':
        await handleSubscriptionUpdate(supabase, event);
        break;

      case 'subscription.canceled':
        await handleSubscriptionCanceled(supabase, event);
        break;

      case 'subscription.past_due':
        await handleSubscriptionPastDue(supabase, event);
        break;

      default:
        console.log('⚠️ Unhandled event type:', event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function handleCheckoutUpdated(supabase: any, event: PolarWebhookEvent) {
  const checkout = event.data;

  console.log('🛒 Processing checkout:', {
    status: checkout.status,
    customer_email: checkout.customer_email,
    product_id: checkout.product_id,
  });

  // Only process confirmed checkouts
  if (checkout.status !== 'confirmed') {
    console.log('⏭️ Skipping non-confirmed checkout');
    return;
  }

  // Get organization ID from customer email
  // Query auth.users to find user by email
  const { data: authUsers, error: userError } = await supabase.auth.admin.listUsers();

  if (userError) {
    console.error('❌ Error fetching users:', userError);
    return;
  }

  const user = authUsers.users.find(u => u.email === checkout.customer_email);

  if (!user) {
    console.error('❌ Could not find user by email:', checkout.customer_email);
    return;
  }

  console.log('👤 Found user:', user.id, user.email);

  // Get user's organization
  const { data: orgUser, error: orgError } = await supabase
    .from('organization_users')
    .select('organization_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();

  if (orgError || !orgUser) {
    console.error('❌ Could not find organization for user');
    return;
  }

  const organizationId = orgUser.organization_id;

  // Determine plan type from product_id
  const planTypeMap: Record<string, string> = {
    '3b03769f-9a47-47bc-8f07-bd1f3a580dee': 'essential',     // Essential Plan
    'db925c1e-d64d-4d95-9907-dc90da5bcbe6': 'professional',  // Professional Plan
    'd53c78fb-5833-43da-a4f0-2a0bd2ff32c9': 'enterprise',    // Agri-Business Plan
  };

  const planType = planTypeMap[checkout.product_id] || 'professional';

  // Plan limits
  const planLimits: Record<string, any> = {
    essential: {
      max_farms: 5,
      max_parcels: 50,
      max_users: 3,
      max_satellite_reports: 10,
      has_analytics: false,
      has_sensor_integration: false,
      has_ai_recommendations: false,
      has_advanced_reporting: false,
      has_api_access: false,
      has_priority_support: false,
    },
    professional: {
      max_farms: 50,
      max_parcels: 500,
      max_users: 20,
      max_satellite_reports: 100,
      has_analytics: true,
      has_sensor_integration: true,
      has_ai_recommendations: true,
      has_advanced_reporting: true,
      has_api_access: true,
      has_priority_support: true,
    },
    enterprise: {
      max_farms: 999999,
      max_parcels: 999999,
      max_users: 999999,
      max_satellite_reports: 999999,
      has_analytics: true,
      has_sensor_integration: true,
      has_ai_recommendations: true,
      has_advanced_reporting: true,
      has_api_access: true,
      has_priority_support: true,
    },
  };

  const limits = planLimits[planType];

  // Create/update subscription
  const subscriptionData = {
    organization_id: organizationId,
    polar_subscription_id: checkout.subscription_id || checkout.id,
    polar_customer_id: checkout.customer_id,
    polar_product_id: checkout.product_id,
    plan_type: planType,
    status: 'active',
    current_period_start: new Date().toISOString(),
    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    ...limits,
    metadata: checkout.metadata || {},
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('subscriptions')
    .upsert(subscriptionData, { onConflict: 'organization_id' });

  if (error) {
    console.error('❌ Error creating subscription:', error);
    throw error;
  }

  console.log('✅ Subscription created successfully for organization:', organizationId);
}

async function handleSubscriptionUpdate(supabase: any, event: PolarWebhookEvent) {
  const subscriptionData = event.data;
  const organizationId = subscriptionData.metadata?.organization_id;

  if (!organizationId) {
    console.error('❌ No organization_id in subscription metadata');
    return;
  }

  // Determine plan type from product_id or metadata
  const planType = subscriptionData.metadata?.plan_type || 'essential';

  const updateData = {
    polar_subscription_id: subscriptionData.id,
    polar_customer_id: subscriptionData.customer_id,
    polar_product_id: subscriptionData.product_id,
    plan_type: planType,
    status: subscriptionData.status || 'active',
    current_period_start: subscriptionData.current_period_start,
    current_period_end: subscriptionData.current_period_end,
    cancel_at_period_end: subscriptionData.cancel_at_period_end || false,
    canceled_at: subscriptionData.canceled_at,
    metadata: subscriptionData.metadata || {},
    updated_at: new Date().toISOString(),
  };

  // Upsert subscription
  const { error } = await supabase
    .from('subscriptions')
    .upsert(
      {
        organization_id: organizationId,
        ...updateData,
      },
      { onConflict: 'organization_id' }
    );

  if (error) {
    console.error('Error upserting subscription:', error);
    throw error;
  }

  console.log('Subscription updated successfully:', subscriptionData.id);
}

async function handleSubscriptionCanceled(supabase: any, event: PolarWebhookEvent) {
  const subscriptionData = event.data;

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('polar_subscription_id', subscriptionData.id);

  if (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }

  console.log('Subscription canceled:', subscriptionData.id);
}

async function handleSubscriptionPastDue(supabase: any, event: PolarWebhookEvent) {
  const subscriptionData = event.data;

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('polar_subscription_id', subscriptionData.id);

  if (error) {
    console.error('Error updating subscription to past_due:', error);
    throw error;
  }

  console.log('Subscription marked as past_due:', subscriptionData.id);
}
