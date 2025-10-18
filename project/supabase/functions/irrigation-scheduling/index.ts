import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { authenticateRequest, validateParcelAccess } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IrrigationRequest {
  parcel_id: string;
  current_soil_moisture: number;
  weather_forecast?: {
    temperature: number[];
    humidity: number[];
    precipitation: number[];
    wind_speed: number[];
  };
  crop_data?: {
    growth_stage: string;
    water_requirements: number;
    root_depth: number;
  };
}

interface IrrigationSchedule {
  recommended_irrigation: boolean;
  irrigation_amount: number; // mm
  irrigation_duration: number; // minutes
  optimal_time: string; // time of day
  next_irrigation_date: string;
  reasoning: string[];
  warnings: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Authenticate the request
    const { user, supabase } = await authenticateRequest(req);

    const { parcel_id, current_soil_moisture, weather_forecast, crop_data }: IrrigationRequest = await req.json();

    // Validate user has access to this parcel
    const parcel = await validateParcelAccess(supabase, user.id, parcel_id);

    if (!parcel) {
      throw new Error('Parcel not found or access denied');
    }

    // Get recent weather data
    const { data: recentWeather } = await supabase
      .from('weather_data')
      .select('temperature_celsius, humidity_percentage, rainfall_mm, wind_speed_kmh')
      .eq('farm_id', parcel.farms.id)
      .order('recorded_at', { ascending: false })
      .limit(7);

    // Get soil analysis data
    const { data: soilAnalysis } = await supabase
      .from('soil_analyses')
      .select('ph_level, organic_matter_percentage, texture, cec_meq_per_100g')
      .eq('parcel_id', parcel_id)
      .order('analysis_date', { ascending: false })
      .limit(1)
      .single();

    // Get current crop data
    const { data: currentCrop } = await supabase
      .from('crops')
      .select(`
        id, name, planting_date, expected_harvest_date,
        crop_varieties!inner(name, water_requirements, days_to_maturity)
      `)
      .eq('parcel_id', parcel_id)
      .eq('status', 'growing')
      .single();

    // Calculate irrigation schedule
    const irrigationSchedule = calculateIrrigationSchedule({
      parcel,
      currentSoilMoisture: current_soil_moisture,
      weatherForecast: weather_forecast,
      recentWeather: recentWeather || [],
      soilAnalysis: soilAnalysis || {},
      cropData: currentCrop || {},
      providedCropData: crop_data
    });

    // Store irrigation recommendation
    const { data: irrigationRecord, error: insertError } = await supabase
      .from('irrigation_recommendations')
      .insert({
        parcel_id,
        soil_moisture: current_soil_moisture,
        recommended_amount: irrigationSchedule.irrigation_amount,
        recommended_duration: irrigationSchedule.irrigation_duration,
        optimal_time: irrigationSchedule.optimal_time,
        next_irrigation_date: irrigationSchedule.next_irrigation_date,
        reasoning: irrigationSchedule.reasoning,
        warnings: irrigationSchedule.warnings,
        weather_data: weather_forecast,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.warn('Failed to store irrigation recommendation:', insertError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        irrigation_schedule: irrigationSchedule,
        parcel_info: {
          name: parcel.name,
          area: parcel.area,
          soil_type: parcel.soil_type,
          irrigation_type: parcel.irrigation_type
        },
        record_id: irrigationRecord?.id
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

function calculateIrrigationSchedule(params: {
  parcel: any;
  currentSoilMoisture: number;
  weatherForecast?: any;
  recentWeather: any[];
  soilAnalysis: any;
  cropData: any;
  providedCropData?: any;
}): IrrigationSchedule {
  const { parcel, currentSoilMoisture, weatherForecast, recentWeather, soilAnalysis, cropData, providedCropData } = params;
  
  const reasoning: string[] = [];
  const warnings: string[] = [];
  
  // Determine optimal soil moisture based on soil type and crop
  const optimalMoisture = calculateOptimalMoisture(soilAnalysis, cropData, providedCropData);
  
  // Calculate water deficit
  const waterDeficit = Math.max(0, optimalMoisture - currentSoilMoisture);
  
  // Check if irrigation is needed
  const irrigationThreshold = 10; // mm deficit threshold
  const needsIrrigation = waterDeficit > irrigationThreshold;
  
  reasoning.push(`Current soil moisture: ${currentSoilMoisture}%`);
  reasoning.push(`Optimal soil moisture: ${optimalMoisture}%`);
  reasoning.push(`Water deficit: ${waterDeficit.toFixed(1)}mm`);
  
  if (!needsIrrigation) {
    reasoning.push('Soil moisture is adequate, no irrigation needed');
  }
  
  // Calculate irrigation amount
  let irrigationAmount = 0;
  let irrigationDuration = 0;
  let optimalTime = '06:00';
  
  if (needsIrrigation) {
    // Calculate irrigation amount based on deficit and soil characteristics
    irrigationAmount = calculateIrrigationAmount(waterDeficit, soilAnalysis, parcel.irrigation_type);
    
    // Calculate irrigation duration based on irrigation system
    irrigationDuration = calculateIrrigationDuration(irrigationAmount, parcel.irrigation_type, parcel.area);
    
    // Determine optimal irrigation time
    optimalTime = determineOptimalTime(weatherForecast, recentWeather);
    
    reasoning.push(`Recommended irrigation: ${irrigationAmount.toFixed(1)}mm`);
    reasoning.push(`Irrigation duration: ${irrigationDuration} minutes`);
    reasoning.push(`Optimal time: ${optimalTime}`);
  }
  
  // Check for weather warnings
  if (weatherForecast) {
    const avgPrecipitation = weatherForecast.precipitation?.reduce((a: number, b: number) => a + b, 0) / weatherForecast.precipitation?.length || 0;
    const avgTemperature = weatherForecast.temperature?.reduce((a: number, b: number) => a + b, 0) / weatherForecast.temperature?.length || 0;
    
    if (avgPrecipitation > 5) {
      warnings.push('Heavy rain forecasted - consider delaying irrigation');
    }
    
    if (avgTemperature > 35) {
      warnings.push('High temperatures forecasted - increase irrigation frequency');
    }
  }
  
  // Calculate next irrigation date
  const nextIrrigationDate = calculateNextIrrigationDate(
    currentSoilMoisture,
    optimalMoisture,
    weatherForecast,
    cropData,
    providedCropData
  );
  
  return {
    recommended_irrigation: needsIrrigation,
    irrigation_amount: irrigationAmount,
    irrigation_duration: irrigationDuration,
    optimal_time: optimalTime,
    next_irrigation_date: nextIrrigationDate,
    reasoning,
    warnings
  };
}

function calculateOptimalMoisture(soilAnalysis: any, cropData: any, providedCropData?: any): number {
  let baseMoisture = 60; // Default optimal moisture
  
  // Adjust based on soil type
  if (soilAnalysis.texture) {
    switch (soilAnalysis.texture) {
      case 'sand':
        baseMoisture = 50;
        break;
      case 'loam':
        baseMoisture = 65;
        break;
      case 'clay':
        baseMoisture = 70;
        break;
    }
  }
  
  // Adjust based on crop water requirements
  const waterRequirements = providedCropData?.water_requirements || cropData?.crop_varieties?.water_requirements;
  if (waterRequirements) {
    switch (waterRequirements) {
      case 'low':
        baseMoisture -= 10;
        break;
      case 'high':
        baseMoisture += 10;
        break;
    }
  }
  
  return Math.max(30, Math.min(80, baseMoisture));
}

function calculateIrrigationAmount(waterDeficit: number, soilAnalysis: any, irrigationType: string): number {
  let irrigationAmount = waterDeficit;
  
  // Adjust based on soil water holding capacity
  if (soilAnalysis.cec_meq_per_100g) {
    const cec = soilAnalysis.cec_meq_per_100g;
    if (cec > 20) {
      irrigationAmount *= 1.2; // High CEC soils can hold more water
    } else if (cec < 10) {
      irrigationAmount *= 0.8; // Low CEC soils hold less water
    }
  }
  
  // Adjust based on irrigation system efficiency
  switch (irrigationType) {
    case 'drip':
      irrigationAmount *= 0.9; // High efficiency
      break;
    case 'sprinkler':
      irrigationAmount *= 1.0; // Medium efficiency
      break;
    case 'flood':
      irrigationAmount *= 1.2; // Lower efficiency
      break;
  }
  
  return Math.max(5, Math.min(50, irrigationAmount)); // Reasonable limits
}

function calculateIrrigationDuration(irrigationAmount: number, irrigationType: string, area: number): number {
  // Simplified calculation based on irrigation system flow rates
  let flowRate = 1; // mm per minute (simplified)
  
  switch (irrigationType) {
    case 'drip':
      flowRate = 0.5; // Slower, more precise
      break;
    case 'sprinkler':
      flowRate = 2.0; // Faster coverage
      break;
    case 'flood':
      flowRate = 5.0; // Very fast
      break;
  }
  
  return Math.ceil(irrigationAmount / flowRate);
}

function determineOptimalTime(weatherForecast: any, recentWeather: any[]): string {
  // Default to early morning (6 AM)
  let optimalTime = '06:00';
  
  // Check for wind conditions
  if (weatherForecast?.wind_speed) {
    const avgWindSpeed = weatherForecast.wind_speed.reduce((a: number, b: number) => a + b, 0) / weatherForecast.wind_speed.length;
    
    if (avgWindSpeed > 15) {
      optimalTime = '05:00'; // Earlier to avoid wind
    } else if (avgWindSpeed < 5) {
      optimalTime = '07:00'; // Can irrigate later
    }
  }
  
  return optimalTime;
}

function calculateNextIrrigationDate(
  currentMoisture: number,
  optimalMoisture: number,
  weatherForecast: any,
  cropData: any,
  providedCropData?: any
): string {
  // Calculate how long until next irrigation is needed
  const moistureDeficit = optimalMoisture - currentMoisture;
  
  // Estimate moisture loss rate (simplified)
  let dailyLoss = 2; // mm per day default
  
  // Adjust based on crop growth stage
  const growthStage = providedCropData?.growth_stage || 'vegetative';
  switch (growthStage) {
    case 'seedling':
      dailyLoss = 1;
      break;
    case 'vegetative':
      dailyLoss = 2;
      break;
    case 'flowering':
      dailyLoss = 3;
      break;
    case 'fruiting':
      dailyLoss = 2.5;
      break;
  }
  
  // Adjust based on weather
  if (weatherForecast?.temperature) {
    const avgTemp = weatherForecast.temperature.reduce((a: number, b: number) => a + b, 0) / weatherForecast.temperature.length;
    if (avgTemp > 30) {
      dailyLoss *= 1.5;
    } else if (avgTemp < 20) {
      dailyLoss *= 0.7;
    }
  }
  
  // Calculate days until next irrigation
  const daysUntilIrrigation = Math.ceil(moistureDeficit / dailyLoss);
  
  // Add some buffer
  const nextIrrigationDate = new Date();
  nextIrrigationDate.setDate(nextIrrigationDate.getDate() + Math.max(1, daysUntilIrrigation - 1));
  
  return nextIrrigationDate.toISOString().split('T')[0];
}
