import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface YieldPredictionRequest {
  parcel_id: string;
  crop_id: string;
  prediction_date: string;
  include_weather?: boolean;
  include_satellite?: boolean;
}

interface YieldPrediction {
  predicted_yield: number; // tons per hectare
  confidence_level: number; // 0-100%
  factors: {
    historical_performance: number;
    weather_impact: number;
    soil_health: number;
    crop_health: number;
    management_practices: number;
  };
  recommendations: string[];
  risk_factors: string[];
  seasonal_forecast: {
    month: string;
    expected_yield: number;
    confidence: number;
  }[];
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

    const { parcel_id, crop_id, prediction_date, include_weather = true, include_satellite = true }: YieldPredictionRequest = await req.json();

    // Get parcel and crop data
    const { data: parcel } = await supabase
      .from('parcels')
      .select(`
        id, name, area, soil_type, 
        farms!inner(id, name, organization_id)
      `)
      .eq('id', parcel_id)
      .single();

    const { data: crop } = await supabase
      .from('crops')
      .select(`
        id, name, planting_date, expected_harvest_date, planted_area,
        crop_varieties!inner(name, days_to_maturity, optimal_temperature_min, optimal_temperature_max)
      `)
      .eq('id', crop_id)
      .single();

    if (!parcel || !crop) {
      throw new Error('Parcel or crop not found');
    }

    // Get historical yield data
    const { data: historicalYields } = await supabase
      .from('harvests')
      .select('harvest_date, quantity, quality_grade')
      .eq('crop_id', crop_id)
      .order('harvest_date', { ascending: false })
      .limit(5);

    // Get soil analysis data
    const { data: soilAnalysis } = await supabase
      .from('soil_analyses')
      .select('ph_level, organic_matter_percentage, nitrogen_ppm, phosphorus_ppm, potassium_ppm')
      .eq('parcel_id', parcel_id)
      .order('analysis_date', { ascending: false })
      .limit(1)
      .single();

    // Get weather data
    let weatherData = null;
    if (include_weather) {
      const { data: weather } = await supabase
        .from('weather_data')
        .select('temperature_celsius, humidity_percentage, rainfall_mm')
        .eq('farm_id', parcel.farms.id)
        .gte('recorded_at', crop.planting_date)
        .order('recorded_at', { ascending: false })
        .limit(30);
      weatherData = weather;
    }

    // Get satellite data
    let satelliteData = null;
    if (include_satellite) {
      const { data: satellite } = await supabase
        .from('satellite_indices_data')
        .select('index_name, mean_value, date')
        .eq('parcel_id', parcel_id)
        .gte('date', crop.planting_date)
        .order('date', { ascending: false })
        .limit(10);
      satelliteData = satellite;
    }

    // Generate yield prediction
    const yieldPrediction = await generateYieldPrediction({
      parcel,
      crop,
      historicalYields: historicalYields || [],
      soilAnalysis: soilAnalysis || {},
      weatherData: weatherData || [],
      satelliteData: satelliteData || [],
      predictionDate: prediction_date
    });

    // Store prediction
    const { data: predictionRecord, error: insertError } = await supabase
      .from('yield_predictions')
      .insert({
        parcel_id,
        crop_id,
        prediction_date,
        predicted_yield: yieldPrediction.predicted_yield,
        confidence_level: yieldPrediction.confidence_level,
        factors: yieldPrediction.factors,
        recommendations: yieldPrediction.recommendations,
        risk_factors: yieldPrediction.risk_factors,
        seasonal_forecast: yieldPrediction.seasonal_forecast,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.warn('Failed to store yield prediction:', insertError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        yield_prediction: yieldPrediction,
        parcel_info: {
          name: parcel.name,
          area: parcel.area,
          soil_type: parcel.soil_type
        },
        crop_info: {
          name: crop.name,
          variety: crop.crop_varieties.name,
          planted_area: crop.planted_area
        },
        record_id: predictionRecord?.id
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

async function generateYieldPrediction(params: {
  parcel: any;
  crop: any;
  historicalYields: any[];
  soilAnalysis: any;
  weatherData: any[];
  satelliteData: any[];
  predictionDate: string;
}): Promise<YieldPrediction> {
  const { parcel, crop, historicalYields, soilAnalysis, weatherData, satelliteData, predictionDate } = params;
  
  // Calculate base yield from historical data
  const historicalPerformance = calculateHistoricalPerformance(historicalYields, crop.planted_area);
  
  // Calculate weather impact
  const weatherImpact = calculateWeatherImpact(weatherData, crop.crop_varieties);
  
  // Calculate soil health score
  const soilHealth = calculateSoilHealthScore(soilAnalysis);
  
  // Calculate crop health from satellite data
  const cropHealth = calculateCropHealthScore(satelliteData);
  
  // Calculate management practices score
  const managementScore = calculateManagementScore(crop, parcel);
  
  // Combine factors to predict yield
  const baseYield = historicalPerformance || 5.0; // Default 5 tons/ha
  const yieldMultiplier = (weatherImpact + soilHealth + cropHealth + managementScore) / 4;
  const predictedYield = baseYield * yieldMultiplier;
  
  // Calculate confidence level
  const confidenceLevel = calculateConfidenceLevel({
    historicalYields: historicalYields.length,
    weatherData: weatherData.length,
    satelliteData: satelliteData.length,
    soilAnalysis: Object.keys(soilAnalysis).length
  });
  
  // Generate recommendations
  const recommendations = generateRecommendations({
    predictedYield,
    soilHealth,
    cropHealth,
    weatherImpact,
    soilAnalysis,
    satelliteData
  });
  
  // Identify risk factors
  const riskFactors = identifyRiskFactors({
    soilHealth,
    cropHealth,
    weatherImpact,
    weatherData,
    satelliteData
  });
  
  // Generate seasonal forecast
  const seasonalForecast = generateSeasonalForecast(predictedYield, confidenceLevel);
  
  return {
    predicted_yield: Math.round(predictedYield * 100) / 100,
    confidence_level: confidenceLevel,
    factors: {
      historical_performance: historicalPerformance,
      weather_impact: weatherImpact,
      soil_health: soilHealth,
      crop_health: cropHealth,
      management_practices: managementScore
    },
    recommendations,
    risk_factors: riskFactors,
    seasonal_forecast: seasonalForecast
  };
}

function calculateHistoricalPerformance(historicalYields: any[], plantedArea: number): number {
  if (historicalYields.length === 0) return 5.0; // Default yield
  
  const totalYield = historicalYields.reduce((sum, harvest) => sum + harvest.quantity, 0);
  const avgYield = totalYield / historicalYields.length;
  
  return plantedArea > 0 ? avgYield / plantedArea : avgYield;
}

function calculateWeatherImpact(weatherData: any[], cropVariety: any): number {
  if (weatherData.length === 0) return 1.0; // Neutral impact
  
  const avgTemp = weatherData.reduce((sum, w) => sum + w.temperature_celsius, 0) / weatherData.length;
  const avgRainfall = weatherData.reduce((sum, w) => sum + (w.rainfall_mm || 0), 0) / weatherData.length;
  
  let impact = 1.0;
  
  // Temperature impact
  const optimalTempMin = cropVariety.optimal_temperature_min || 20;
  const optimalTempMax = cropVariety.optimal_temperature_max || 30;
  
  if (avgTemp < optimalTempMin) {
    impact *= 0.8; // Too cold
  } else if (avgTemp > optimalTempMax) {
    impact *= 0.9; // Too hot
  }
  
  // Rainfall impact
  if (avgRainfall < 2) {
    impact *= 0.7; // Too dry
  } else if (avgRainfall > 10) {
    impact *= 0.8; // Too wet
  }
  
  return Math.max(0.5, Math.min(1.5, impact));
}

function calculateSoilHealthScore(soilAnalysis: any): number {
  if (Object.keys(soilAnalysis).length === 0) return 0.7; // Default score
  
  let score = 1.0;
  
  // pH impact
  if (soilAnalysis.ph_level) {
    if (soilAnalysis.ph_level < 6.0 || soilAnalysis.ph_level > 7.5) {
      score *= 0.8;
    }
  }
  
  // Organic matter impact
  if (soilAnalysis.organic_matter_percentage) {
    if (soilAnalysis.organic_matter_percentage < 2.0) {
      score *= 0.7;
    } else if (soilAnalysis.organic_matter_percentage > 5.0) {
      score *= 1.2;
    }
  }
  
  // Nutrient levels
  const nutrients = ['nitrogen_ppm', 'phosphorus_ppm', 'potassium_ppm'];
  let nutrientScore = 0;
  
  nutrients.forEach(nutrient => {
    if (soilAnalysis[nutrient]) {
      nutrientScore += soilAnalysis[nutrient] > 50 ? 1 : 0.5;
    }
  });
  
  score *= (nutrientScore / nutrients.length) || 0.8;
  
  return Math.max(0.3, Math.min(1.5, score));
}

function calculateCropHealthScore(satelliteData: any[]): number {
  if (satelliteData.length === 0) return 0.8; // Default score
  
  // Find NDVI data
  const ndviData = satelliteData.filter(d => d.index_name === 'NDVI');
  if (ndviData.length === 0) return 0.8;
  
  const avgNDVI = ndviData.reduce((sum, d) => sum + d.mean_value, 0) / ndviData.length;
  
  // Convert NDVI to health score (0-1 range to 0.5-1.5 multiplier)
  const healthScore = 0.5 + (avgNDVI * 0.5);
  
  return Math.max(0.5, Math.min(1.5, healthScore));
}

function calculateManagementScore(crop: any, parcel: any): number {
  let score = 1.0;
  
  // Check planting timing
  const plantingDate = new Date(crop.planting_date);
  const optimalPlantingMonth = 4; // April
  const monthDiff = Math.abs(plantingDate.getMonth() + 1 - optimalPlantingMonth);
  
  if (monthDiff > 2) {
    score *= 0.9; // Suboptimal planting time
  }
  
  // Check irrigation system
  if (parcel.irrigation_type === 'drip') {
    score *= 1.1; // Efficient irrigation
  } else if (parcel.irrigation_type === 'none') {
    score *= 0.8; // No irrigation
  }
  
  return Math.max(0.7, Math.min(1.3, score));
}

function calculateConfidenceLevel(params: {
  historicalYields: number;
  weatherData: number;
  satelliteData: number;
  soilAnalysis: number;
}): number {
  const { historicalYields, weatherData, satelliteData, soilAnalysis } = params;
  
  let confidence = 50; // Base confidence
  
  // Increase confidence based on available data
  if (historicalYields > 0) confidence += 20;
  if (weatherData > 10) confidence += 15;
  if (satelliteData > 0) confidence += 10;
  if (soilAnalysis > 3) confidence += 5;
  
  return Math.min(95, confidence);
}

function generateRecommendations(params: {
  predictedYield: number;
  soilHealth: number;
  cropHealth: number;
  weatherImpact: number;
  soilAnalysis: any;
  satelliteData: any[];
}): string[] {
  const { predictedYield, soilHealth, cropHealth, weatherImpact, soilAnalysis, satelliteData } = params;
  const recommendations: string[] = [];
  
  if (soilHealth < 0.8) {
    recommendations.push('Improve soil health through organic matter addition and proper fertilization');
  }
  
  if (cropHealth < 0.8) {
    recommendations.push('Monitor crop health closely and consider pest/disease management');
  }
  
  if (weatherImpact < 0.9) {
    recommendations.push('Implement weather protection measures or adjust irrigation schedule');
  }
  
  if (predictedYield < 4.0) {
    recommendations.push('Consider soil amendments and improved crop management practices');
  }
  
  if (soilAnalysis.ph_level && (soilAnalysis.ph_level < 6.0 || soilAnalysis.ph_level > 7.5)) {
    recommendations.push('Adjust soil pH to optimal range (6.0-7.5)');
  }
  
  return recommendations;
}

function identifyRiskFactors(params: {
  soilHealth: number;
  cropHealth: number;
  weatherImpact: number;
  weatherData: any[];
  satelliteData: any[];
}): string[] {
  const { soilHealth, cropHealth, weatherImpact, weatherData, satelliteData } = params;
  const risks: string[] = [];
  
  if (soilHealth < 0.7) {
    risks.push('Poor soil health may limit yield potential');
  }
  
  if (cropHealth < 0.7) {
    risks.push('Crop health issues detected - monitor for diseases');
  }
  
  if (weatherImpact < 0.8) {
    risks.push('Adverse weather conditions may affect yield');
  }
  
  if (weatherData.length > 0) {
    const recentRainfall = weatherData.slice(0, 7).reduce((sum, w) => sum + (w.rainfall_mm || 0), 0);
    if (recentRainfall > 50) {
      risks.push('Excessive rainfall may cause waterlogging');
    }
  }
  
  return risks;
}

function generateSeasonalForecast(predictedYield: number, confidence: number): any[] {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentMonth = new Date().getMonth();
  
  return months.slice(currentMonth, currentMonth + 6).map((month, index) => ({
    month,
    expected_yield: Math.round((predictedYield * (0.8 + index * 0.05)) * 100) / 100,
    confidence: Math.max(60, confidence - (index * 5))
  }));
}
