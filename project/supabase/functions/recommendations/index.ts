import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

interface ModuleData {
  id: string;
  type: string;
  status: string;
}

interface SensorData {
  timestamp: string;
  temperature: number;
  humidity: number;
  soilMoisture: number;
}

interface RequestData {
  moduleData: ModuleData;
  sensorData: SensorData[];
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { moduleData, sensorData }: RequestData = await req.json();

    if (!moduleData || !sensorData || !Array.isArray(sensorData)) {
      throw new Error('Invalid request data');
    }

    // Process sensor data to generate recommendations
    const recommendations = [];

    // Check temperature trends
    const recentTemps = sensorData
      .slice(-5)
      .map(reading => reading.temperature);
    const avgTemp = recentTemps.reduce((a, b) => a + b, 0) / recentTemps.length;

    if (avgTemp > 30) {
      recommendations.push({
        type: 'warning',
        message: 'High temperature detected. Consider increasing irrigation frequency.',
        priority: 'high',
      });
    }

    // Check soil moisture levels
    const recentMoisture = sensorData
      .slice(-5)
      .map(reading => reading.soilMoisture);
    const avgMoisture = recentMoisture.reduce((a, b) => a + b, 0) / recentMoisture.length;

    if (avgMoisture < 30) {
      recommendations.push({
        type: 'warning',
        message: 'Low soil moisture detected. Irrigation recommended.',
        priority: 'high',
      });
    } else if (avgMoisture > 80) {
      recommendations.push({
        type: 'warning',
        message: 'High soil moisture detected. Consider reducing irrigation.',
        priority: 'medium',
      });
    }

    // Check humidity levels
    const recentHumidity = sensorData
      .slice(-5)
      .map(reading => reading.humidity);
    const avgHumidity = recentHumidity.reduce((a, b) => a + b, 0) / recentHumidity.length;

    if (avgHumidity > 85) {
      recommendations.push({
        type: 'warning',
        message: 'High humidity detected. Monitor for potential fungal diseases.',
        priority: 'medium',
      });
    }

    // Add general recommendations based on module status
    if (moduleData.status === 'active') {
      recommendations.push({
        type: 'info',
        message: 'Module is operating normally. Continue regular monitoring.',
        priority: 'low',
      });
    }

    return new Response(
      JSON.stringify({ recommendations }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error.message || 'An error occurred while processing the request',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});