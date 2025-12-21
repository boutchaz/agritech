import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrgMetrics {
  organization_id: string;
  date: string;
  active_users_7d: number;
  active_users_30d: number;
  farms_count: number;
  parcels_count: number;
  invoices_created: number;
  quotes_created: number;
  tasks_completed: number;
  harvests_recorded: number;
  storage_bytes: number;
  api_calls: number;
}

interface SaasMetrics {
  date: string;
  total_organizations: number;
  active_organizations_7d: number;
  active_organizations_30d: number;
  new_organizations: number;
  churned_organizations: number;
  total_users: number;
  dau: number;
  wau: number;
  mau: number;
  total_mrr: number;
  total_arr: number;
  arpu: number;
  churn_rate: number;
  activation_rate: number;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get authorization from header or use service role key
    const authHeader = req.headers.get('Authorization');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Create admin client
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const today = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    console.log(`Computing daily metrics for ${today}`);

    // Get all active organizations
    const { data: organizations, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, created_at')
      .eq('is_active', true);

    if (orgError) throw orgError;

    console.log(`Processing ${organizations?.length || 0} organizations`);

    // Compute metrics for each organization
    for (const org of organizations || []) {
      try {
        // Count active users in last 7 days
        const { count: activeUsers7d } = await supabase
          .from('events')
          .select('user_id', { count: 'exact', head: true })
          .eq('organization_id', org.id)
          .gte('occurred_at', sevenDaysAgo.toISOString());

        // Count active users in last 30 days
        const { count: activeUsers30d } = await supabase
          .from('events')
          .select('user_id', { count: 'exact', head: true })
          .eq('organization_id', org.id)
          .gte('occurred_at', thirtyDaysAgo.toISOString());

        // Count farms
        const { count: farmsCount } = await supabase
          .from('farms')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', org.id);

        // Count parcels
        const { count: parcelsCount } = await supabase
          .from('parcels')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', org.id);

        // Count invoices created today
        const { count: invoicesCreated } = await supabase
          .from('invoices')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', org.id)
          .gte('created_at', today)
          .lt('created_at', today + 'T23:59:59');

        // Count quotes created today
        const { count: quotesCreated } = await supabase
          .from('quotes')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', org.id)
          .gte('created_at', today)
          .lt('created_at', today + 'T23:59:59');

        // Count tasks completed today
        const { count: tasksCompleted } = await supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', org.id)
          .eq('status', 'done')
          .gte('updated_at', today)
          .lt('updated_at', today + 'T23:59:59');

        // Count harvests recorded today
        const { count: harvestsRecorded } = await supabase
          .from('harvests')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', org.id)
          .gte('created_at', today)
          .lt('created_at', today + 'T23:59:59');

        // Count API calls today (from events)
        const { count: apiCalls } = await supabase
          .from('events')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', org.id)
          .gte('occurred_at', today)
          .lt('occurred_at', today + 'T23:59:59');

        const metrics: OrgMetrics = {
          organization_id: org.id,
          date: today,
          active_users_7d: activeUsers7d || 0,
          active_users_30d: activeUsers30d || 0,
          farms_count: farmsCount || 0,
          parcels_count: parcelsCount || 0,
          invoices_created: invoicesCreated || 0,
          quotes_created: quotesCreated || 0,
          tasks_completed: tasksCompleted || 0,
          harvests_recorded: harvestsRecorded || 0,
          storage_bytes: 0, // TODO: Calculate storage usage
          api_calls: apiCalls || 0,
        };

        // Upsert daily metrics
        const { error: upsertError } = await supabase
          .from('organization_usage_daily')
          .upsert(metrics, { onConflict: 'organization_id,date' });

        if (upsertError) {
          console.error(`Error upserting metrics for org ${org.id}:`, upsertError);
        }

        // Update subscription_usage with current counts
        const { error: updateError } = await supabase
          .from('subscription_usage')
          .upsert({
            organization_id: org.id,
            farms_count: farmsCount || 0,
            parcels_count: parcelsCount || 0,
            last_activity_at: new Date().toISOString(),
            last_calculated_at: new Date().toISOString(),
          }, { onConflict: 'organization_id' });

        if (updateError) {
          console.error(`Error updating subscription_usage for org ${org.id}:`, updateError);
        }
      } catch (orgError) {
        console.error(`Error processing org ${org.id}:`, orgError);
      }
    }

    // Compute SaaS-wide metrics
    const { count: totalOrgs } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true });

    const { count: activeOrgs7d } = await supabase
      .from('events')
      .select('organization_id', { count: 'exact', head: true })
      .gte('occurred_at', sevenDaysAgo.toISOString());

    const { count: activeOrgs30d } = await supabase
      .from('events')
      .select('organization_id', { count: 'exact', head: true })
      .gte('occurred_at', thirtyDaysAgo.toISOString());

    const { count: newOrgs } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today)
      .lt('created_at', today + 'T23:59:59');

    const { count: totalUsers } = await supabase
      .from('organization_users')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Get MRR/ARR totals
    const { data: revenueData } = await supabase
      .from('subscription_usage')
      .select('mrr, arr');

    const totalMrr = revenueData?.reduce((sum, row) => sum + (row.mrr || 0), 0) || 0;
    const totalArr = revenueData?.reduce((sum, row) => sum + (row.arr || 0), 0) || 0;
    const arpu = totalOrgs ? totalMrr / totalOrgs : 0;

    const saasMetrics: SaasMetrics = {
      date: today,
      total_organizations: totalOrgs || 0,
      active_organizations_7d: activeOrgs7d || 0,
      active_organizations_30d: activeOrgs30d || 0,
      new_organizations: newOrgs || 0,
      churned_organizations: 0, // TODO: Calculate from subscription changes
      total_users: totalUsers || 0,
      dau: 0, // TODO: Calculate unique users today
      wau: 0,
      mau: 0,
      total_mrr: totalMrr,
      total_arr: totalArr,
      arpu: arpu,
      churn_rate: 0,
      activation_rate: 0,
    };

    // Upsert SaaS metrics
    const { error: saasError } = await supabase
      .from('saas_metrics_daily')
      .upsert(saasMetrics, { onConflict: 'date' });

    if (saasError) {
      console.error('Error upserting SaaS metrics:', saasError);
    }

    // Refresh materialized view
    try {
      await supabase.rpc('refresh_admin_org_summary');
      console.log('Refreshed admin_org_summary materialized view');
    } catch (refreshError) {
      console.warn('Could not refresh materialized view:', refreshError);
    }

    console.log('Daily metrics computation complete');

    return new Response(
      JSON.stringify({
        success: true,
        date: today,
        organizationsProcessed: organizations?.length || 0,
        saasMetrics,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Error computing daily metrics:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});
