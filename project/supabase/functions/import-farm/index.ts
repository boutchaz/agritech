import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImportFarmRequest {
  organization_id: string;
  export_data: {
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
  skip_duplicates?: boolean; // If true, skips farms/parcels with same name
}

interface ImportFarmResponse {
  success: boolean;
  imported?: {
    farms: number;
    parcels: number;
    satellite_aois: number;
    id_mappings: {
      farms: Record<string, string>; // original_id -> new_id
      parcels: Record<string, string>;
      satellite_aois: Record<string, string>;
    };
  };
  errors?: string[];
  warnings?: string[];
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

    const { organization_id, export_data, skip_duplicates = false }: ImportFarmRequest = await req.json();

    if (!organization_id || !export_data) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: organization_id and export_data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate export data structure
    if (!export_data.farms || !Array.isArray(export_data.farms)) {
      return new Response(
        JSON.stringify({ error: 'Invalid export_data: farms array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify user has access to this organization
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

    console.log('📥 Starting farm import:', {
      organization_id,
      total_farms: export_data.farms.length,
      total_parcels: export_data.parcels?.length || 0,
      total_aois: export_data.satellite_aois?.length || 0,
    });

    const errors: string[] = [];
    const warnings: string[] = [];
    const idMappings = {
      farms: {} as Record<string, string>,
      parcels: {} as Record<string, string>,
      satellite_aois: {} as Record<string, string>,
    };

    let importedFarms = 0;
    let importedParcels = 0;
    let importedAois = 0;

    // Step 1: Import farms (main farms first, then sub-farms)
    const mainFarms = export_data.farms.filter((f: any) => !f.parent_farm_id);
    const subFarms = export_data.farms.filter((f: any) => f.parent_farm_id);

    // Import main farms first
    for (const farm of mainFarms) {
      try {
        // Check for duplicates if skip_duplicates is enabled
        if (skip_duplicates) {
          const { data: existing } = await supabaseAdmin
            .from('farms')
            .select('id')
            .eq('organization_id', organization_id)
            .eq('name', farm.name)
            .maybeSingle();

          if (existing) {
            warnings.push(`Skipped duplicate farm: ${farm.name}`);
            idMappings.farms[farm.original_id || farm.id] = existing.id;
            continue;
          }
        }

        const { data: newFarm, error: farmError } = await supabaseAdmin
          .from('farms')
          .insert({
            organization_id,
            name: farm.name,
            location: farm.location,
            size: farm.size,
            area_unit: farm.area_unit || 'hectares',
            description: farm.description,
            latitude: farm.latitude,
            longitude: farm.longitude,
            farm_type: farm.farm_type || 'main',
            hierarchy_level: farm.hierarchy_level || 1,
            manager_id: null, // Don't import manager_id, they may not exist
            is_active: farm.is_active !== false,
            established_date: farm.established_date,
          })
          .select('id')
          .single();

        if (farmError) {
          errors.push(`Failed to import farm ${farm.name}: ${farmError.message}`);
          continue;
        }

        idMappings.farms[farm.original_id || farm.id] = newFarm.id;
        importedFarms++;
      } catch (error) {
        errors.push(`Error importing farm ${farm.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Import sub-farms (with parent mapping)
    for (const farm of subFarms) {
      try {
        const newParentFarmId = idMappings.farms[farm.parent_farm_id];
        if (!newParentFarmId) {
          errors.push(`Failed to import sub-farm ${farm.name}: parent farm not found`);
          continue;
        }

        if (skip_duplicates) {
          const { data: existing } = await supabaseAdmin
            .from('farms')
            .select('id')
            .eq('organization_id', organization_id)
            .eq('parent_farm_id', newParentFarmId)
            .eq('name', farm.name)
            .maybeSingle();

          if (existing) {
            warnings.push(`Skipped duplicate sub-farm: ${farm.name}`);
            idMappings.farms[farm.original_id || farm.id] = existing.id;
            continue;
          }
        }

        const { data: newFarm, error: farmError } = await supabaseAdmin
          .from('farms')
          .insert({
            organization_id,
            name: farm.name,
            location: farm.location,
            size: farm.size,
            area_unit: farm.area_unit || 'hectares',
            description: farm.description,
            latitude: farm.latitude,
            longitude: farm.longitude,
            parent_farm_id: newParentFarmId,
            farm_type: farm.farm_type || 'sub',
            hierarchy_level: farm.hierarchy_level || 2,
            manager_id: null,
            is_active: farm.is_active !== false,
            established_date: farm.established_date,
          })
          .select('id')
          .single();

        if (farmError) {
          errors.push(`Failed to import sub-farm ${farm.name}: ${farmError.message}`);
          continue;
        }

        idMappings.farms[farm.original_id || farm.id] = newFarm.id;
        importedFarms++;
      } catch (error) {
        errors.push(`Error importing sub-farm ${farm.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Step 2: Import parcels
    for (const parcel of export_data.parcels || []) {
      try {
        const newFarmId = idMappings.farms[parcel.original_farm_id || parcel.farm_id];
        if (!newFarmId) {
          errors.push(`Failed to import parcel ${parcel.name}: farm not found`);
          continue;
        }

        if (skip_duplicates) {
          const { data: existing } = await supabaseAdmin
            .from('parcels')
            .select('id')
            .eq('farm_id', newFarmId)
            .eq('name', parcel.name)
            .maybeSingle();

          if (existing) {
            warnings.push(`Skipped duplicate parcel: ${parcel.name}`);
            idMappings.parcels[parcel.original_id || parcel.id] = existing.id;
            continue;
          }
        }

        const { data: newParcel, error: parcelError } = await supabaseAdmin
          .from('parcels')
          .insert({
            farm_id: newFarmId,
            name: parcel.name,
            description: parcel.description,
            area: parcel.area,
            area_unit: parcel.area_unit || 'hectares',
            soil_type: parcel.soil_type,
            boundary: parcel.boundary,
            elevation: parcel.elevation,
            slope_percentage: parcel.slope_percentage,
            irrigation_type: parcel.irrigation_type,
            notes: parcel.notes,
            calculated_area: parcel.calculated_area,
            planting_density: parcel.planting_density,
            perimeter: parcel.perimeter,
            variety: parcel.variety,
            planting_date: parcel.planting_date,
            planting_type: parcel.planting_type,
          })
          .select('id')
          .single();

        if (parcelError) {
          errors.push(`Failed to import parcel ${parcel.name}: ${parcelError.message}`);
          continue;
        }

        idMappings.parcels[parcel.original_id || parcel.id] = newParcel.id;
        importedParcels++;
      } catch (error) {
        errors.push(`Error importing parcel ${parcel.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Step 3: Import satellite AOIs
    for (const aoi of export_data.satellite_aois || []) {
      try {
        const newFarmId = aoi.original_farm_id ? idMappings.farms[aoi.original_farm_id] : null;
        const newParcelId = aoi.original_parcel_id ? idMappings.parcels[aoi.original_parcel_id] : null;

        if (!newFarmId && !newParcelId) {
          warnings.push(`Skipped AOI ${aoi.name}: no valid farm or parcel reference`);
          continue;
        }

        if (skip_duplicates) {
          const { data: existing } = await supabaseAdmin
            .from('satellite_aois')
            .select('id')
            .eq('organization_id', organization_id)
            .eq('name', aoi.name)
            .maybeSingle();

          if (existing) {
            warnings.push(`Skipped duplicate AOI: ${aoi.name}`);
            idMappings.satellite_aois[aoi.original_id || aoi.id] = existing.id;
            continue;
          }
        }

        const { data: newAoi, error: aoiError } = await supabaseAdmin
          .from('satellite_aois')
          .insert({
            organization_id,
            farm_id: newFarmId,
            parcel_id: newParcelId,
            name: aoi.name,
            description: aoi.description,
            geometry_json: aoi.geometry_json,
            area_hectares: aoi.area_hectares,
            is_active: aoi.is_active !== false,
          })
          .select('id')
          .single();

        if (aoiError) {
          errors.push(`Failed to import AOI ${aoi.name}: ${aoiError.message}`);
          continue;
        }

        idMappings.satellite_aois[aoi.original_id || aoi.id] = newAoi.id;
        importedAois++;
      } catch (error) {
        errors.push(`Error importing AOI ${aoi.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log('✅ Import completed:', {
      farms: importedFarms,
      parcels: importedParcels,
      aois: importedAois,
      errors: errors.length,
      warnings: warnings.length,
    });

    return new Response(
      JSON.stringify({
        success: errors.length === 0,
        imported: {
          farms: importedFarms,
          parcels: importedParcels,
          satellite_aois: importedAois,
          id_mappings: idMappings,
        },
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined,
      }),
      { status: errors.length === 0 ? 200 : 207, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

