import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SensorData {
  device_id: string;
  timestamp: string;
  readings: {
    type: string;
    value: number;
    unit: string;
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

    const { device_id, timestamp, readings } = await req.json() as SensorData;

    // Store raw sensor data
    const { error: insertError } = await supabase
      .from('sensor_readings')
      .insert({
        device_id,
        timestamp,
        data: readings
      });

    if (insertError) throw insertError;

    // Process readings and update relevant tables
    for (const reading of readings) {
      switch (reading.type) {
        case 'soil_moisture':
        case 'soil_temperature':
        case 'soil_ph':
          await updateSoilData(supabase, device_id, reading);
          break;
        case 'air_temperature':
        case 'air_humidity':
          await updateClimateData(supabase, device_id, reading);
          break;
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  }
});

async function updateSoilData(supabase: any, device_id: string, reading: any) {
  // Get the parcel associated with this device
  const { data: device } = await supabase
    .from('sensor_devices')
    .select('parcel_id')
    .eq('device_id', device_id)
    .single();

  if (!device?.parcel_id) return;

  // Update soil analysis data
  const { data: latestAnalysis } = await supabase
    .from('soil_analyses')
    .select('*')
    .eq('parcel_id', device.parcel_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (latestAnalysis) {
    const physical = { ...latestAnalysis.physical };
    
    switch (reading.type) {
      case 'soil_moisture':
        physical.moisture = reading.value;
        break;
      case 'soil_temperature':
        physical.temperature = reading.value;
        break;
      case 'soil_ph':
        physical.ph = reading.value;
        break;
    }

    await supabase
      .from('soil_analyses')
      .update({ physical })
      .eq('id', latestAnalysis.id);
  }
}

async function updateClimateData(supabase: any, device_id: string, reading: any) {
  const { data: device } = await supabase
    .from('sensor_devices')
    .select('parcel_id')
    .eq('device_id', device_id)
    .single();

  if (!device?.parcel_id) return;

  // Store climate data in a time series table
  await supabase
    .from('climate_readings')
    .insert({
      parcel_id: device.parcel_id,
      type: reading.type,
      value: reading.value,
      unit: reading.unit
    });
}