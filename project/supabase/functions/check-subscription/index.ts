import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SubscriptionCheckRequest {
  organizationId: string;
  feature?: string;
}

interface SubscriptionCheckResponse {
  isValid: boolean;
  subscription: any;
  hasFeature?: boolean;
  reason?: string;
  usage?: {
    farms: { current: number; max: number; canCreate: boolean };
    parcels: { current: number; max: number; canCreate: boolean };
    users: { current: number; max: number; canAdd: boolean };
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the user
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { organizationId, feature }: SubscriptionCheckRequest = await req.json();

    if (!organizationId) {
      return new Response(JSON.stringify({ error: 'organizationId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user has access to this organization
    const { data: orgUser } = await supabaseClient
      .from('organization_users')
      .select('*')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single();

    if (!orgUser) {
      return new Response(JSON.stringify({ error: 'Access denied to organization' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check subscription validity using database function
    const { data: isValid, error: validError } = await supabaseClient.rpc(
      'has_valid_subscription',
      { org_id: organizationId }
    );

    if (validError) {
      throw validError;
    }

    // Get subscription details
    const { data: subscription } = await supabaseClient
      .from('subscriptions')
      .select('*')
      .eq('organization_id', organizationId)
      .single();

    const response: SubscriptionCheckResponse = {
      isValid: isValid === true,
      subscription,
      reason: !isValid
        ? !subscription
          ? 'no_subscription'
          : subscription.status === 'canceled'
          ? 'canceled'
          : subscription.status === 'past_due'
          ? 'past_due'
          : 'expired'
        : undefined,
    };

    // Check specific feature if requested
    if (feature && isValid) {
      const { data: hasFeature } = await supabaseClient.rpc('has_feature_access', {
        org_id: organizationId,
        feature_name: feature,
      });
      response.hasFeature = hasFeature === true;
    }

    // Get usage stats if valid subscription
    if (isValid && subscription) {
      // Check if can create more resources
      const { data: canCreateFarm } = await supabaseClient.rpc('can_create_farm', {
        org_id: organizationId,
      });

      const { data: canCreateParcel } = await supabaseClient.rpc('can_create_parcel', {
        org_id: organizationId,
      });

      const { data: canAddUser } = await supabaseClient.rpc('can_add_user', {
        org_id: organizationId,
      });

      // Get current counts
      const { count: farmsCount } = await supabaseClient
        .from('farms')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

      const { count: parcelsCount } = await supabaseClient
        .from('parcels')
        .select('parcels.id, farms!inner(organization_id)', { count: 'exact', head: true })
        .eq('farms.organization_id', organizationId);

      const { count: usersCount } = await supabaseClient
        .from('organization_users')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      response.usage = {
        farms: {
          current: farmsCount || 0,
          max: subscription.max_farms,
          canCreate: canCreateFarm === true,
        },
        parcels: {
          current: parcelsCount || 0,
          max: subscription.max_parcels,
          canCreate: canCreateParcel === true,
        },
        users: {
          current: usersCount || 0,
          max: subscription.max_users,
          canAdd: canAddUser === true,
        },
      };
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
