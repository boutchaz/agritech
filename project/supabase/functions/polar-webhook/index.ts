import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-polar-webhook-signature',
};

interface PolarWebhookEvent {
  type: string;
  data: {
    id: string;
    object: string;
    customer_id?: string;
    product_id?: string;
    status?: string;
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
    // Verify webhook signature
    const signature = req.headers.get('x-polar-webhook-signature');
    const webhookSecret = Deno.env.get('POLAR_WEBHOOK_SECRET');

    if (!signature || !webhookSecret) {
      return new Response(JSON.stringify({ error: 'Missing signature or secret' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse the webhook event
    const event: PolarWebhookEvent = await req.json();

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle different event types
    switch (event.type) {
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
        console.log('Unhandled event type:', event.type);
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

async function handleSubscriptionUpdate(supabase: any, event: PolarWebhookEvent) {
  const subscriptionData = event.data;
  const organizationId = subscriptionData.metadata?.organization_id;

  if (!organizationId) {
    console.error('No organization_id in subscription metadata');
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
