import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FarmAnalyticsRequest {
  farm_id: string;
  analysis_type: 'performance' | 'financial' | 'comparative' | 'trend';
  date_range?: {
    start_date: string;
    end_date: string;
  };
  metrics?: string[];
}

interface FarmAnalytics {
  farm_id: string;
  analysis_type: string;
  period: string;
  summary: {
    total_area: number;
    active_parcels: number;
    total_crops: number;
    total_yield: number;
    total_revenue: number;
    total_costs: number;
    net_profit: number;
    profit_margin: number;
  };
  performance_metrics: {
    yield_per_hectare: number;
    cost_per_hectare: number;
    revenue_per_hectare: number;
    water_efficiency: number;
    fertilizer_efficiency: number;
  };
  trends: {
    yield_trend: 'increasing' | 'decreasing' | 'stable';
    cost_trend: 'increasing' | 'decreasing' | 'stable';
    profit_trend: 'increasing' | 'decreasing' | 'stable';
  };
  recommendations: string[];
  alerts: string[];
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

    const { farm_id, analysis_type, date_range, metrics }: FarmAnalyticsRequest = await req.json();

    // Get farm data
    const { data: farm } = await supabase
      .from('farms')
      .select('id, name, size, organization_id')
      .eq('id', farm_id)
      .single();

    if (!farm) {
      throw new Error('Farm not found');
    }

    // Set default date range if not provided
    const endDate = date_range?.end_date || new Date().toISOString().split('T')[0];
    const startDate = date_range?.start_date || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Get parcels data
    const { data: parcels } = await supabase
      .from('parcels')
      .select('id, name, area, soil_type')
      .eq('farm_id', farm_id);

    // Get crops data
    const { data: crops } = await supabase
      .from('crops')
      .select(`
        id, name, planted_area, expected_yield, actual_yield, status,
        crop_varieties!inner(name, category)
      `)
      .eq('farm_id', farm_id)
      .gte('planting_date', startDate)
      .lte('planting_date', endDate);

    // Get harvest data
    const { data: harvests } = await supabase
      .from('harvests')
      .select('quantity, harvest_date, quality_grade')
      .in('crop_id', crops?.map(c => c.id) || [])
      .gte('harvest_date', startDate)
      .lte('harvest_date', endDate);

    // Get financial data
    const { data: costs } = await supabase
      .from('costs')
      .select('amount, cost_type, date')
      .eq('farm_id', farm_id)
      .gte('date', startDate)
      .lte('date', endDate);

    const { data: revenues } = await supabase
      .from('revenues')
      .select('amount, revenue_type, date')
      .eq('farm_id', farm_id)
      .gte('date', startDate)
      .lte('date', endDate);

    // Get utilities data
    const { data: utilities } = await supabase
      .from('utilities')
      .select('amount, consumption_value, consumption_unit, type')
      .eq('farm_id', farm_id)
      .gte('billing_date', startDate)
      .lte('billing_date', endDate);

    // Get weather data
    const { data: weatherData } = await supabase
      .from('weather_data')
      .select('temperature_celsius, rainfall_mm, recorded_at')
      .eq('farm_id', farm_id)
      .gte('recorded_at', startDate)
      .lte('recorded_at', endDate);

    // Generate analytics based on type
    let analytics: FarmAnalytics;
    
    switch (analysis_type) {
      case 'performance':
        analytics = generatePerformanceAnalytics({
          farm,
          parcels: parcels || [],
          crops: crops || [],
          harvests: harvests || [],
          costs: costs || [],
          revenues: revenues || [],
          utilities: utilities || [],
          weatherData: weatherData || [],
          startDate,
          endDate
        });
        break;
      case 'financial':
        analytics = generateFinancialAnalytics({
          farm,
          costs: costs || [],
          revenues: revenues || [],
          parcels: parcels || [],
          startDate,
          endDate
        });
        break;
      case 'comparative':
        analytics = generateComparativeAnalytics({
          farm,
          parcels: parcels || [],
          crops: crops || [],
          harvests: harvests || [],
          startDate,
          endDate
        });
        break;
      case 'trend':
        analytics = generateTrendAnalytics({
          farm,
          harvests: harvests || [],
          costs: costs || [],
          revenues: revenues || [],
          startDate,
          endDate
        });
        break;
      default:
        throw new Error('Invalid analysis type');
    }

    // Store analytics result
    const { data: analyticsRecord, error: insertError } = await supabase
      .from('farm_analytics')
      .insert({
        farm_id,
        analysis_type,
        period_start: startDate,
        period_end: endDate,
        analytics_data: analytics,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.warn('Failed to store analytics:', insertError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        analytics,
        farm_info: {
          name: farm.name,
          size: farm.size
        },
        period: {
          start_date: startDate,
          end_date: endDate
        },
        record_id: analyticsRecord?.id
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

function generatePerformanceAnalytics(params: {
  farm: any;
  parcels: any[];
  crops: any[];
  harvests: any[];
  costs: any[];
  revenues: any[];
  utilities: any[];
  weatherData: any[];
  startDate: string;
  endDate: string;
}): FarmAnalytics {
  const { farm, parcels, crops, harvests, costs, revenues, utilities, weatherData, startDate, endDate } = params;
  
  // Calculate summary metrics
  const totalArea = parcels.reduce((sum, p) => sum + (p.area || 0), 0);
  const activeParcels = parcels.length;
  const totalCrops = crops.length;
  const totalYield = harvests.reduce((sum, h) => sum + h.quantity, 0);
  const totalRevenue = revenues.reduce((sum, r) => sum + r.amount, 0);
  const totalCosts = costs.reduce((sum, c) => sum + c.amount, 0);
  const netProfit = totalRevenue - totalCosts;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
  
  // Calculate performance metrics
  const yieldPerHectare = totalArea > 0 ? totalYield / totalArea : 0;
  const costPerHectare = totalArea > 0 ? totalCosts / totalArea : 0;
  const revenuePerHectare = totalArea > 0 ? totalRevenue / totalArea : 0;
  
  // Calculate water efficiency
  const waterCosts = utilities.filter(u => u.type === 'water').reduce((sum, u) => sum + u.amount, 0);
  const waterEfficiency = waterCosts > 0 ? totalYield / waterCosts : 0;
  
  // Calculate fertilizer efficiency
  const fertilizerCosts = costs.filter(c => c.cost_type === 'materials').reduce((sum, c) => sum + c.amount, 0);
  const fertilizerEfficiency = fertilizerCosts > 0 ? totalYield / fertilizerCosts : 0;
  
  // Generate recommendations
  const recommendations = generatePerformanceRecommendations({
    yieldPerHectare,
    costPerHectare,
    profitMargin,
    waterEfficiency,
    fertilizerEfficiency
  });
  
  // Generate alerts
  const alerts = generatePerformanceAlerts({
    yieldPerHectare,
    profitMargin,
    waterEfficiency,
    fertilizerEfficiency
  });
  
  return {
    farm_id: farm.id,
    analysis_type: 'performance',
    period: `${startDate} to ${endDate}`,
    summary: {
      total_area: totalArea,
      active_parcels: activeParcels,
      total_crops: totalCrops,
      total_yield: totalYield,
      total_revenue: totalRevenue,
      total_costs: totalCosts,
      net_profit: netProfit,
      profit_margin: profitMargin
    },
    performance_metrics: {
      yield_per_hectare: yieldPerHectare,
      cost_per_hectare: costPerHectare,
      revenue_per_hectare: revenuePerHectare,
      water_efficiency: waterEfficiency,
      fertilizer_efficiency: fertilizerEfficiency
    },
    trends: {
      yield_trend: 'stable', // Would need historical data to calculate
      cost_trend: 'stable',
      profit_trend: 'stable'
    },
    recommendations,
    alerts
  };
}

function generateFinancialAnalytics(params: {
  farm: any;
  costs: any[];
  revenues: any[];
  parcels: any[];
  startDate: string;
  endDate: string;
}): FarmAnalytics {
  const { farm, costs, revenues, parcels, startDate, endDate } = params;
  
  const totalArea = parcels.reduce((sum, p) => sum + (p.area || 0), 0);
  const totalRevenue = revenues.reduce((sum, r) => sum + r.amount, 0);
  const totalCosts = costs.reduce((sum, c) => sum + c.amount, 0);
  const netProfit = totalRevenue - totalCosts;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
  
  // Cost breakdown
  const costBreakdown = costs.reduce((acc, cost) => {
    acc[cost.cost_type] = (acc[cost.cost_type] || 0) + cost.amount;
    return acc;
  }, {} as Record<string, number>);
  
  // Revenue breakdown
  const revenueBreakdown = revenues.reduce((acc, revenue) => {
    acc[revenue.revenue_type] = (acc[revenue.revenue_type] || 0) + revenue.amount;
    return acc;
  }, {} as Record<string, number>);
  
  const recommendations = generateFinancialRecommendations({
    profitMargin,
    costBreakdown,
    revenueBreakdown,
    totalArea
  });
  
  const alerts = generateFinancialAlerts({
    profitMargin,
    totalCosts,
    totalRevenue
  });
  
  return {
    farm_id: farm.id,
    analysis_type: 'financial',
    period: `${startDate} to ${endDate}`,
    summary: {
      total_area: totalArea,
      active_parcels: parcels.length,
      total_crops: 0,
      total_yield: 0,
      total_revenue: totalRevenue,
      total_costs: totalCosts,
      net_profit: netProfit,
      profit_margin: profitMargin
    },
    performance_metrics: {
      yield_per_hectare: 0,
      cost_per_hectare: totalArea > 0 ? totalCosts / totalArea : 0,
      revenue_per_hectare: totalArea > 0 ? totalRevenue / totalArea : 0,
      water_efficiency: 0,
      fertilizer_efficiency: 0
    },
    trends: {
      yield_trend: 'stable',
      cost_trend: 'stable',
      profit_trend: 'stable'
    },
    recommendations,
    alerts
  };
}

function generateComparativeAnalytics(params: {
  farm: any;
  parcels: any[];
  crops: any[];
  harvests: any[];
  startDate: string;
  endDate: string;
}): FarmAnalytics {
  const { farm, parcels, crops, harvests, startDate, endDate } = params;
  
  // Compare parcels performance
  const parcelPerformance = parcels.map(parcel => {
    const parcelCrops = crops.filter(c => c.parcel_id === parcel.id);
    const parcelHarvests = harvests.filter(h => 
      parcelCrops.some(c => c.id === h.crop_id)
    );
    const parcelYield = parcelHarvests.reduce((sum, h) => sum + h.quantity, 0);
    
    return {
      parcel_id: parcel.id,
      parcel_name: parcel.name,
      area: parcel.area,
      yield: parcelYield,
      yield_per_hectare: parcel.area > 0 ? parcelYield / parcel.area : 0
    };
  });
  
  // Find best and worst performing parcels
  const sortedParcels = parcelPerformance.sort((a, b) => b.yield_per_hectare - a.yield_per_hectare);
  const bestParcel = sortedParcels[0];
  const worstParcel = sortedParcels[sortedParcels.length - 1];
  
  const recommendations = generateComparativeRecommendations({
    bestParcel,
    worstParcel,
    parcelPerformance
  });
  
  const alerts = generateComparativeAlerts({
    parcelPerformance,
    bestParcel,
    worstParcel
  });
  
  return {
    farm_id: farm.id,
    analysis_type: 'comparative',
    period: `${startDate} to ${endDate}`,
    summary: {
      total_area: parcels.reduce((sum, p) => sum + (p.area || 0), 0),
      active_parcels: parcels.length,
      total_crops: crops.length,
      total_yield: harvests.reduce((sum, h) => sum + h.quantity, 0),
      total_revenue: 0,
      total_costs: 0,
      net_profit: 0,
      profit_margin: 0
    },
    performance_metrics: {
      yield_per_hectare: 0,
      cost_per_hectare: 0,
      revenue_per_hectare: 0,
      water_efficiency: 0,
      fertilizer_efficiency: 0
    },
    trends: {
      yield_trend: 'stable',
      cost_trend: 'stable',
      profit_trend: 'stable'
    },
    recommendations,
    alerts
  };
}

function generateTrendAnalytics(params: {
  farm: any;
  harvests: any[];
  costs: any[];
  revenues: any[];
  startDate: string;
  endDate: string;
}): FarmAnalytics {
  const { farm, harvests, costs, revenues, startDate, endDate } = params;
  
  // Group data by month for trend analysis
  const monthlyData = groupDataByMonth(harvests, costs, revenues);
  
  // Calculate trends
  const yieldTrend = calculateTrend(monthlyData.map(m => m.yield));
  const costTrend = calculateTrend(monthlyData.map(m => m.costs));
  const profitTrend = calculateTrend(monthlyData.map(m => m.revenue - m.costs));
  
  const recommendations = generateTrendRecommendations({
    yieldTrend,
    costTrend,
    profitTrend,
    monthlyData
  });
  
  const alerts = generateTrendAlerts({
    yieldTrend,
    costTrend,
    profitTrend
  });
  
  return {
    farm_id: farm.id,
    analysis_type: 'trend',
    period: `${startDate} to ${endDate}`,
    summary: {
      total_area: 0,
      active_parcels: 0,
      total_crops: 0,
      total_yield: harvests.reduce((sum, h) => sum + h.quantity, 0),
      total_revenue: revenues.reduce((sum, r) => sum + r.amount, 0),
      total_costs: costs.reduce((sum, c) => sum + c.amount, 0),
      net_profit: revenues.reduce((sum, r) => sum + r.amount, 0) - costs.reduce((sum, c) => sum + c.amount, 0),
      profit_margin: 0
    },
    performance_metrics: {
      yield_per_hectare: 0,
      cost_per_hectare: 0,
      revenue_per_hectare: 0,
      water_efficiency: 0,
      fertilizer_efficiency: 0
    },
    trends: {
      yield_trend: yieldTrend,
      cost_trend: costTrend,
      profit_trend: profitTrend
    },
    recommendations,
    alerts
  };
}

function generatePerformanceRecommendations(params: {
  yieldPerHectare: number;
  costPerHectare: number;
  profitMargin: number;
  waterEfficiency: number;
  fertilizerEfficiency: number;
}): string[] {
  const { yieldPerHectare, costPerHectare, profitMargin, waterEfficiency, fertilizerEfficiency } = params;
  const recommendations: string[] = [];
  
  if (yieldPerHectare < 3.0) {
    recommendations.push('Consider improving soil health and crop management practices to increase yield');
  }
  
  if (costPerHectare > 2000) {
    recommendations.push('Review cost structure and identify areas for cost reduction');
  }
  
  if (profitMargin < 10) {
    recommendations.push('Focus on improving profitability through yield optimization and cost management');
  }
  
  if (waterEfficiency < 0.1) {
    recommendations.push('Improve water management and irrigation efficiency');
  }
  
  if (fertilizerEfficiency < 0.05) {
    recommendations.push('Optimize fertilizer application and consider precision agriculture');
  }
  
  return recommendations;
}

function generatePerformanceAlerts(params: {
  yieldPerHectare: number;
  profitMargin: number;
  waterEfficiency: number;
  fertilizerEfficiency: number;
}): string[] {
  const { yieldPerHectare, profitMargin, waterEfficiency, fertilizerEfficiency } = params;
  const alerts: string[] = [];
  
  if (yieldPerHectare < 2.0) {
    alerts.push('CRITICAL: Very low yield per hectare detected');
  }
  
  if (profitMargin < 0) {
    alerts.push('CRITICAL: Farm is operating at a loss');
  }
  
  if (waterEfficiency < 0.05) {
    alerts.push('WARNING: Very low water efficiency');
  }
  
  return alerts;
}

function generateFinancialRecommendations(params: {
  profitMargin: number;
  costBreakdown: Record<string, number>;
  revenueBreakdown: Record<string, number>;
  totalArea: number;
}): string[] {
  const { profitMargin, costBreakdown, revenueBreakdown, totalArea } = params;
  const recommendations: string[] = [];
  
  if (profitMargin < 15) {
    recommendations.push('Focus on increasing revenue or reducing costs to improve profitability');
  }
  
  const laborCosts = costBreakdown['labor'] || 0;
  const materialCosts = costBreakdown['materials'] || 0;
  
  if (laborCosts > materialCosts * 2) {
    recommendations.push('Consider automation to reduce labor costs');
  }
  
  return recommendations;
}

function generateFinancialAlerts(params: {
  profitMargin: number;
  totalCosts: number;
  totalRevenue: number;
}): string[] {
  const { profitMargin, totalCosts, totalRevenue } = params;
  const alerts: string[] = [];
  
  if (profitMargin < 0) {
    alerts.push('CRITICAL: Negative profit margin - immediate action required');
  }
  
  if (totalCosts > totalRevenue * 0.9) {
    alerts.push('WARNING: Costs are very high relative to revenue');
  }
  
  return alerts;
}

function generateComparativeRecommendations(params: {
  bestParcel: any;
  worstParcel: any;
  parcelPerformance: any[];
}): string[] {
  const { bestParcel, worstParcel, parcelPerformance } = params;
  const recommendations: string[] = [];
  
  if (bestParcel && worstParcel) {
    const performanceGap = bestParcel.yield_per_hectare - worstParcel.yield_per_hectare;
    
    if (performanceGap > 2.0) {
      recommendations.push(`Apply successful practices from ${bestParcel.parcel_name} to ${worstParcel.parcel_name}`);
    }
  }
  
  return recommendations;
}

function generateComparativeAlerts(params: {
  parcelPerformance: any[];
  bestParcel: any;
  worstParcel: any;
}): string[] {
  const { parcelPerformance, bestParcel, worstParcel } = params;
  const alerts: string[] = [];
  
  if (worstParcel && worstParcel.yield_per_hectare < 1.0) {
    alerts.push(`WARNING: ${worstParcel.parcel_name} has very low yield`);
  }
  
  return alerts;
}

function generateTrendRecommendations(params: {
  yieldTrend: string;
  costTrend: string;
  profitTrend: string;
  monthlyData: any[];
}): string[] {
  const { yieldTrend, costTrend, profitTrend } = params;
  const recommendations: string[] = [];
  
  if (yieldTrend === 'decreasing') {
    recommendations.push('Yield trend is declining - investigate causes and implement corrective measures');
  }
  
  if (costTrend === 'increasing' && profitTrend === 'decreasing') {
    recommendations.push('Rising costs are impacting profitability - review cost management strategies');
  }
  
  return recommendations;
}

function generateTrendAlerts(params: {
  yieldTrend: string;
  costTrend: string;
  profitTrend: string;
}): string[] {
  const { yieldTrend, costTrend, profitTrend } = params;
  const alerts: string[] = [];
  
  if (yieldTrend === 'decreasing') {
    alerts.push('ALERT: Declining yield trend detected');
  }
  
  if (profitTrend === 'decreasing') {
    alerts.push('ALERT: Declining profit trend detected');
  }
  
  return alerts;
}

function groupDataByMonth(harvests: any[], costs: any[], revenues: any[]): any[] {
  const monthlyData: Record<string, { yield: number; costs: number; revenue: number }> = {};
  
  // Group harvests by month
  harvests.forEach(harvest => {
    const month = harvest.harvest_date.substring(0, 7); // YYYY-MM
    if (!monthlyData[month]) {
      monthlyData[month] = { yield: 0, costs: 0, revenue: 0 };
    }
    monthlyData[month].yield += harvest.quantity;
  });
  
  // Group costs by month
  costs.forEach(cost => {
    const month = cost.date.substring(0, 7);
    if (!monthlyData[month]) {
      monthlyData[month] = { yield: 0, costs: 0, revenue: 0 };
    }
    monthlyData[month].costs += cost.amount;
  });
  
  // Group revenues by month
  revenues.forEach(revenue => {
    const month = revenue.date.substring(0, 7);
    if (!monthlyData[month]) {
      monthlyData[month] = { yield: 0, costs: 0, revenue: 0 };
    }
    monthlyData[month].revenue += revenue.amount;
  });
  
  return Object.entries(monthlyData)
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

function calculateTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
  if (values.length < 2) return 'stable';
  
  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));
  
  const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
  
  const change = (secondAvg - firstAvg) / firstAvg;
  
  if (change > 0.1) return 'increasing';
  if (change < -0.1) return 'decreasing';
  return 'stable';
}
