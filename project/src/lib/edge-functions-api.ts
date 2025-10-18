import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const EDGE_FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

/**
 * Generic function to call Supabase Edge Functions
 * Requires authentication - throws error if user is not authenticated
 */
async function callEdgeFunction<T>(
  functionName: string,
  payload: Record<string, unknown>
): Promise<T> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  // Require authentication - no fallback to anon key
  if (sessionError || !session?.access_token) {
    throw new Error('Authentication required. Please sign in to use this feature.');
  }

  const response = await fetch(`${EDGE_FUNCTIONS_URL}/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Edge function call failed' }));
    throw new Error(error.error || 'Edge function call failed');
  }

  return response.json();
}

// ============================================================================
// IRRIGATION SCHEDULING
// ============================================================================

export interface IrrigationRequest {
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

export interface IrrigationSchedule {
  recommended_irrigation: boolean;
  irrigation_amount: number;
  irrigation_duration: number;
  optimal_time: string;
  next_irrigation_date: string;
  reasoning: string[];
  warnings: string[];
}

export interface IrrigationScheduleResponse {
  success: boolean;
  irrigation_schedule: IrrigationSchedule;
  parcel_info: {
    name: string;
    area: number;
    soil_type: string;
    irrigation_type: string;
  };
  record_id?: string;
}

export async function getIrrigationSchedule(
  request: IrrigationRequest
): Promise<IrrigationScheduleResponse> {
  return callEdgeFunction<IrrigationScheduleResponse>('irrigation-scheduling', request);
}

// ============================================================================
// CROP PLANNING
// ============================================================================

export interface CropPlanningRequest {
  farm_id: string;
  parcel_ids: string[];
  planning_year: number;
  crop_preferences?: string[];
  constraints?: {
    max_area_per_crop?: number;
    rotation_requirements?: Record<string, unknown>;
    seasonal_preferences?: Record<string, unknown>;
  };
}

export interface CropPlan {
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

export interface CropPlanningResponse {
  success: boolean;
  crop_plan: CropPlan | CropPlan[];
  plans: CropPlan[];
  summary: {
    total_parcels: number;
    planned_crops: number;
    estimated_total_yield: number;
    rotation_compliance: number;
  };
}

export async function generateCropPlan(
  request: CropPlanningRequest
): Promise<CropPlanningResponse> {
  return callEdgeFunction<CropPlanningResponse>('crop-planning', request);
}

// ============================================================================
// YIELD PREDICTION
// ============================================================================

export interface YieldPredictionRequest {
  parcel_id: string;
  crop_id: string;
  prediction_date: string;
  include_weather?: boolean;
  include_satellite?: boolean;
}

export interface YieldPrediction {
  predicted_yield: number;
  confidence_level: number;
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

export interface YieldPredictionResponse {
  success: boolean;
  yield_prediction: YieldPrediction;
  parcel_info: {
    name: string;
    area: number;
    soil_type: string;
  };
  crop_info: {
    name: string;
    variety: string;
    planted_area: number;
  };
  record_id?: string;
}

export async function getYieldPrediction(
  request: YieldPredictionRequest
): Promise<YieldPredictionResponse> {
  return callEdgeFunction<YieldPredictionResponse>('yield-prediction', request);
}

// ============================================================================
// FARM ANALYTICS
// ============================================================================

export interface FarmAnalyticsRequest {
  farm_id: string;
  analysis_type: 'performance' | 'financial' | 'comparative' | 'trend';
  date_range?: {
    start_date: string;
    end_date: string;
  };
  metrics?: string[];
}

export interface FarmAnalytics {
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

export interface FarmAnalyticsResponse {
  success: boolean;
  analytics: FarmAnalytics;
  farm_info: {
    name: string;
    size: number;
  };
  period: {
    start_date: string;
    end_date: string;
  };
  record_id?: string;
}

export async function getFarmAnalytics(
  request: FarmAnalyticsRequest
): Promise<FarmAnalyticsResponse> {
  return callEdgeFunction<FarmAnalyticsResponse>('farm-analytics', request);
}

// ============================================================================
// TASK ASSIGNMENT
// ============================================================================

export interface TaskAssignmentRequest {
  farm_id: string;
  task_type: 'planting' | 'harvesting' | 'irrigation' | 'fertilization' | 'maintenance';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  scheduled_date: string;
  estimated_duration?: number;
  required_skills?: string[];
  equipment_required?: string[];
}

export interface TaskAssignment {
  task_id: string;
  assigned_to: string;
  assigned_worker: {
    id: string;
    name: string;
    skills: string[];
    availability: string;
  };
  assignment_score: number;
  reasoning: string[];
  alternative_assignments: {
    worker_id: string;
    worker_name: string;
    score: number;
  }[];
}

export interface TaskAssignmentResponse {
  success: boolean;
  task_assignment: TaskAssignment;
  task_info: {
    id: string;
    type: string;
    priority: string;
    scheduled_date: string;
  };
  farm_info: {
    name: string;
  };
}

export async function assignTask(
  request: TaskAssignmentRequest
): Promise<TaskAssignmentResponse> {
  return callEdgeFunction<TaskAssignmentResponse>('task-assignment', request);
}

// ============================================================================
// RECOMMENDATIONS
// ============================================================================

export interface RecommendationsRequest {
  moduleData: {
    id: string;
    type: string;
    status: string;
  };
  sensorData: {
    timestamp: string;
    temperature: number;
    humidity: number;
    soilMoisture: number;
  }[];
}

export interface Recommendation {
  type: 'warning' | 'info';
  message: string;
  priority: 'low' | 'medium' | 'high';
}

export interface RecommendationsResponse {
  recommendations: Recommendation[];
}

export async function getRecommendations(
  request: RecommendationsRequest
): Promise<RecommendationsResponse> {
  return callEdgeFunction<RecommendationsResponse>('recommendations', request);
}

// ============================================================================
// SENSOR DATA PROCESSING
// ============================================================================

export interface SensorDataRequest {
  device_id: string;
  timestamp: string;
  readings: {
    type: string;
    value: number;
    unit: string;
  }[];
}

export interface SensorDataResponse {
  success: boolean;
}

export async function processSensorData(
  request: SensorDataRequest
): Promise<SensorDataResponse> {
  return callEdgeFunction<SensorDataResponse>('sensor-data', request);
}

// ============================================================================
// PARCEL REPORT GENERATION
// ============================================================================

export interface ParcelReportRequest {
  parcel_id: string;
  template_id: string;
  parcel_data: {
    parcel: {
      name: string;
      area?: number;
      soil_type?: string;
    };
    metrics: {
      health: string;
      ndvi: string;
      irrigation: number;
      yield: number;
    };
    analysis: {
      soil?: {
        ph: number;
        organicMatter: number;
        nitrogen: number;
        phosphorus: number;
        potassium: number;
      };
      recommendations?: string[];
    };
  };
}

export interface ParcelReportResponse {
  success: boolean;
  report: {
    id: string;
    parcel_id: string;
    template_id: string;
    title: string;
    status: string;
    metadata: Record<string, unknown>;
    created_at: string;
  };
}

export async function generateParcelReport(
  request: ParcelReportRequest
): Promise<ParcelReportResponse> {
  return callEdgeFunction<ParcelReportResponse>('generate-parcel-report', request);
}

// ============================================================================
// Export all functions
// ============================================================================

export const edgeFunctions = {
  irrigation: {
    getSchedule: getIrrigationSchedule,
  },
  cropPlanning: {
    generatePlan: generateCropPlan,
  },
  yieldPrediction: {
    getPrediction: getYieldPrediction,
  },
  farmAnalytics: {
    getAnalytics: getFarmAnalytics,
  },
  taskAssignment: {
    assignTask: assignTask,
  },
  recommendations: {
    get: getRecommendations,
  },
  sensorData: {
    process: processSensorData,
  },
  reports: {
    generateParcelReport: generateParcelReport,
  },
};

export default edgeFunctions;