import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExportFarmRequest {
  farm_id?: string;
  organization_id?: string;
  include_sub_farms?: boolean; // If true, exports all sub-farms recursively
}

interface ExportFarmResponse {
  success: boolean;
  data?: {
    exported_at: string;
    version: string;
    farms: any[];
    parcels: any[];
    satellite_aois: any[];
    metadata: {
      total_farms: number;
      total_parcels: number;
      total_aois: number;
    };
  };
  error?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      console.error('❌ Missing Supabase environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      console.error('❌ Error getting user:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { farm_id, organization_id, include_sub_farms = true }: ExportFarmRequest = await req.json();

    if (!farm_id && !organization_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: either farm_id or organization_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log('📤 Starting farm export:', { farm_id, organization_id, include_sub_farms });

    // Determine which farms to export
    let farmsToExport: any[] = [];

    if (farm_id) {
      // Export specific farm (and optionally sub-farms)
      const { data: farm, error: farmError } = await supabaseAdmin
        .from('farms')
        .select('*')
        .eq('id', farm_id)
        .single();

      if (farmError || !farm) {
        console.error('❌ Error fetching farm:', farmError);
        return new Response(
          JSON.stringify({ error: `Farm not found: ${farmError?.message || 'Unknown error'}` }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify user has access to this farm's organization
      const { data: orgUser } = await supabaseAdmin
        .from('organization_users')
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('organization_id', farm.organization_id)
        .eq('is_active', true)
        .maybeSingle();

      if (!orgUser) {
        return new Response(
          JSON.stringify({ error: 'You do not have access to this farm' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      farmsToExport = [farm];

      // If include_sub_farms, fetch all sub-farms recursively
      if (include_sub_farms) {
        const fetchSubFarms = async (parentFarmId: string, allFarms: any[]): Promise<any[]> => {
          const { data: subFarms, error: subError } = await supabaseAdmin
            .from('farms')
            .select('*')
            .eq('parent_farm_id', parentFarmId)
            .eq('is_active', true);

          if (subError) {
            console.error('❌ Error fetching sub-farms:', subError);
            return allFarms;
          }

          if (subFarms && subFarms.length > 0) {
            allFarms.push(...subFarms);
            // Recursively fetch sub-farms of sub-farms
            for (const subFarm of subFarms) {
              await fetchSubFarms(subFarm.id, allFarms);
            }
          }

          return allFarms;
        };

        const subFarms = await fetchSubFarms(farm_id, []);
        farmsToExport.push(...subFarms);
      }
    } else if (organization_id) {
      // Export all farms for organization
      const { data: orgUser } = await supabaseAdmin
        .from('organization_users')
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('organization_id', organization_id)
        .eq('is_active', true)
        .maybeSingle();

      if (!orgUser) {
        return new Response(
          JSON.stringify({ error: 'You do not have access to this organization' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: orgFarms, error: orgFarmsError } = await supabaseAdmin
        .from('farms')
        .select('*')
        .eq('organization_id', organization_id)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (orgFarmsError) {
        console.error('❌ Error fetching organization farms:', orgFarmsError);
        return new Response(
          JSON.stringify({ error: `Error fetching farms: ${orgFarmsError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      farmsToExport = orgFarms || [];
    }

    if (farmsToExport.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No farms found to export' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const farmIds = farmsToExport.map(f => f.id);

    // Fetch all parcels for these farms
    const { data: parcels, error: parcelsError } = await supabaseAdmin
      .from('parcels')
      .select('*')
      .in('farm_id', farmIds)
      .order('created_at', { ascending: true });

    if (parcelsError) {
      console.error('❌ Error fetching parcels:', parcelsError);
      return new Response(
        JSON.stringify({ error: `Error fetching parcels: ${parcelsError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const parcelIds = parcels?.map(p => p.id) || [];

    // Fetch all satellite AOIs for these farms and parcels
    const { data: satelliteAois, error: aoisError } = await supabaseAdmin
      .from('satellite_aois')
      .select('*')
      .or(`farm_id.in.(${farmIds.join(',')}),parcel_id.in.(${parcelIds.length > 0 ? parcelIds.join(',') : 'null'})`)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (aoisError) {
      console.error('❌ Error fetching satellite AOIs:', aoisError);
      // Don't fail if AOIs can't be fetched, just log it
    }

    // Prepare export data (remove internal IDs that shouldn't be exported, keep original IDs for reference mapping)
    const exportData: ExportFarmResponse['data'] = {
      exported_at: new Date().toISOString(),
      version: '1.0.0',
      farms: farmsToExport.map(farm => ({
        ...farm,
        // Keep organization_id for reference, but it will be remapped on import
        original_id: farm.id, // Keep original ID for mapping during import
      })),
      parcels: (parcels || []).map(parcel => ({
        ...parcel,
        original_id: parcel.id,
        original_farm_id: parcel.farm_id, // Keep original farm_id for mapping
      })),
      satellite_aois: (satelliteAois || []).map(aoi => ({
        ...aoi,
        original_id: aoi.id,
        original_farm_id: aoi.farm_id,
        original_parcel_id: aoi.parcel_id,
      })),
      metadata: {
        total_farms: farmsToExport.length,
        total_parcels: parcels?.length || 0,
        total_aois: satelliteAois?.length || 0,
      },
    };

    console.log('✅ Export completed:', exportData.metadata);

    return new Response(
      JSON.stringify({
        success: true,
        data: exportData,
      }),
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

