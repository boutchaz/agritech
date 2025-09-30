import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CropPlanningRequest {
  farm_id: string;
  parcel_ids: string[];
  planning_year: number;
  crop_preferences?: string[];
  constraints?: {
    max_area_per_crop?: number;
    rotation_requirements?: any;
    seasonal_preferences?: any;
  };
}

interface CropPlan {
  parcel_id: string;
  crop_name: string;
  variety: string;
  planting_date: string;
  harvest_date: string;
  expected_yield: number;
  rotation_score: number;
  soil_suitability: number;
  market_value: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { farm_id, parcel_ids, planning_year, crop_preferences, constraints }: CropPlanningRequest = await req.json();

    // Get farm and parcel data
    const { data: parcels } = await supabase
      .from('parcels')
      .select(`
        id, name, area, soil_type, 
        farms!inner(id, name, organization_id)
      `)
      .in('id', parcel_ids)
      .eq('farms.id', farm_id);

    if (!parcels || parcels.length === 0) {
      throw new Error('No parcels found for the specified farm');
    }

    // Get historical crop data for rotation analysis
    const { data: historicalCrops } = await supabase
      .from('crops')
      .select('parcel_id, variety_id, planting_date, harvest_date, actual_yield')
      .in('parcel_id', parcel_ids)
      .gte('planting_date', `${planning_year - 3}-01-01`)
      .lte('planting_date', `${planning_year - 1}-12-31`);

    // Get available crop varieties
    const { data: cropVarieties } = await supabase
      .from('crop_varieties')
      .select(`
        id, name, days_to_maturity, optimal_temperature_min, optimal_temperature_max,
        crop_types!inner(id, name, category)
      `);

    // Get soil analysis data
    const { data: soilAnalyses } = await supabase
      .from('soil_analyses')
      .select('parcel_id, ph_level, organic_matter_percentage, nitrogen_ppm, phosphorus_ppm, potassium_ppm')
      .in('parcel_id', parcel_ids)
      .order('analysis_date', { ascending: false });

    // Generate crop plans using optimization algorithm
    const cropPlans = await generateOptimalCropPlans({
      parcels,
      historicalCrops: historicalCrops || [],
      cropVarieties: cropVarieties || [],
      soilAnalyses: soilAnalyses || [],
      planningYear: planning_year,
      cropPreferences: crop_preferences || [],
      constraints: constraints || {}
    });

    // Store the crop plan
    const { data: savedPlan, error: saveError } = await supabase
      .from('crop_plans')
      .insert({
        farm_id,
        planning_year,
        plan_data: cropPlans,
        status: 'draft',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (saveError) throw saveError;

    return new Response(
      JSON.stringify({
        success: true,
        crop_plan: savedPlan,
        plans: cropPlans,
        summary: {
          total_parcels: parcels.length,
          planned_crops: cropPlans.length,
          estimated_total_yield: cropPlans.reduce((sum, plan) => sum + plan.expected_yield, 0),
          rotation_compliance: calculateRotationCompliance(cropPlans, historicalCrops || [])
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

async function generateOptimalCropPlans(params: {
  parcels: any[];
  historicalCrops: any[];
  cropVarieties: any[];
  soilAnalyses: any[];
  planningYear: number;
  cropPreferences: string[];
  constraints: any;
}): Promise<CropPlan[]> {
  const { parcels, historicalCrops, cropVarieties, soilAnalyses, planningYear, cropPreferences, constraints } = params;
  
  const plans: CropPlan[] = [];
  
  for (const parcel of parcels) {
    // Get soil data for this parcel
    const soilData = soilAnalyses.find(s => s.parcel_id === parcel.id);
    
    // Get historical crops for rotation analysis
    const parcelHistory = historicalCrops.filter(c => c.parcel_id === parcel.id);
    
    // Find best crop for this parcel
    const bestCrop = findBestCropForParcel({
      parcel,
      soilData,
      parcelHistory,
      cropVarieties,
      cropPreferences,
      constraints
    });
    
    if (bestCrop) {
      plans.push({
        parcel_id: parcel.id,
        crop_name: bestCrop.cropType.name,
        variety: bestCrop.name,
        planting_date: calculatePlantingDate(bestCrop, planningYear),
        harvest_date: calculateHarvestDate(bestCrop, planningYear),
        expected_yield: calculateExpectedYield(bestCrop, parcel, soilData),
        rotation_score: calculateRotationScore(bestCrop, parcelHistory),
        soil_suitability: calculateSoilSuitability(bestCrop, soilData),
        market_value: calculateMarketValue(bestCrop, parcel.area)
      });
    }
  }
  
  return plans;
}

function findBestCropForParcel(params: {
  parcel: any;
  soilData: any;
  parcelHistory: any[];
  cropVarieties: any[];
  cropPreferences: string[];
  constraints: any;
}) {
  const { parcel, soilData, parcelHistory, cropVarieties, cropPreferences, constraints } = params;
  
  // Filter varieties based on preferences
  let availableVarieties = cropVarieties;
  if (cropPreferences.length > 0) {
    availableVarieties = cropVarieties.filter(v => 
      cropPreferences.includes(v.crop_types.name)
    );
  }
  
  // Score each variety
  const scoredVarieties = availableVarieties.map(variety => {
    const rotationScore = calculateRotationScore(variety, parcelHistory);
    const soilScore = calculateSoilSuitability(variety, soilData);
    const marketScore = calculateMarketValue(variety, parcel.area);
    
    const totalScore = (rotationScore * 0.4) + (soilScore * 0.4) + (marketScore * 0.2);
    
    return {
      ...variety,
      totalScore,
      rotationScore,
      soilScore,
      marketScore
    };
  });
  
  // Return the best variety
  return scoredVarieties.sort((a, b) => b.totalScore - a.totalScore)[0];
}

function calculateRotationScore(variety: any, parcelHistory: any[]): number {
  if (parcelHistory.length === 0) return 1.0;
  
  // Check if this crop family was planted recently
  const recentCrops = parcelHistory.slice(-2); // Last 2 years
  const sameFamily = recentCrops.some(crop => 
    crop.crop_types?.category === variety.crop_types?.category
  );
  
  return sameFamily ? 0.3 : 1.0; // Penalty for same family
}

function calculateSoilSuitability(variety: any, soilData: any): number {
  if (!soilData) return 0.5; // Default if no soil data
  
  let score = 1.0;
  
  // Check pH suitability
  const optimalPhMin = variety.optimal_temperature_min || 6.0;
  const optimalPhMax = variety.optimal_temperature_max || 7.5;
  
  if (soilData.ph_level < optimalPhMin || soilData.ph_level > optimalPhMax) {
    score *= 0.7;
  }
  
  // Check organic matter
  if (soilData.organic_matter_percentage < 2.0) {
    score *= 0.8;
  }
  
  return Math.max(0.1, score);
}

function calculateExpectedYield(variety: any, parcel: any, soilData: any): number {
  // Base yield per hectare (simplified calculation)
  const baseYield = 5.0; // tons per hectare
  
  // Adjust based on soil quality
  let soilMultiplier = 1.0;
  if (soilData) {
    if (soilData.organic_matter_percentage > 3.0) soilMultiplier *= 1.2;
    if (soilData.nitrogen_ppm > 50) soilMultiplier *= 1.1;
  }
  
  return baseYield * soilMultiplier * parcel.area;
}

function calculateMarketValue(variety: any, area: number): number {
  // Simplified market value calculation
  const basePrice = 200; // EUR per ton
  return basePrice * area * 5.0; // Assuming 5 tons per hectare
}

function calculatePlantingDate(variety: any, year: number): string {
  // Simplified planting date calculation
  const plantingMonth = variety.crop_types?.category === 'vegetables' ? 3 : 4;
  return `${year}-${plantingMonth.toString().padStart(2, '0')}-15`;
}

function calculateHarvestDate(variety: any, year: number): string {
  const plantingDate = new Date(calculatePlantingDate(variety, year));
  const harvestDate = new Date(plantingDate);
  harvestDate.setDate(harvestDate.getDate() + (variety.days_to_maturity || 120));
  return harvestDate.toISOString().split('T')[0];
}

function calculateRotationCompliance(plans: CropPlan[], historicalCrops: any[]): number {
  // Calculate how well the plan follows crop rotation principles
  let compliance = 1.0;
  
  for (const plan of plans) {
    const parcelHistory = historicalCrops.filter(c => c.parcel_id === plan.parcel_id);
    const recentCrops = parcelHistory.slice(-2);
    
    const sameFamily = recentCrops.some(crop => 
      crop.crop_types?.category === plan.crop_name
    );
    
    if (sameFamily) {
      compliance *= 0.8; // Penalty for poor rotation
    }
  }
  
  return Math.round(compliance * 100) / 100;
}
