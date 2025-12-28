import { apiClient } from '../api-client';

const BASE_URL = '/api/v1/organizations';

export interface YieldHistory {
  id: string;
  organization_id: string;
  farm_id: string;
  parcel_id: string;
  harvest_id: string | null;
  crop_type: string;
  variety: string | null;
  harvest_date: string;
  harvest_season: string | null;
  actual_yield_quantity: number;
  actual_yield_per_hectare: number | null;
  unit_of_measure: string;
  quality_grade: string | null;
  target_yield_quantity: number | null;
  target_yield_per_hectare: number | null;
  yield_variance_percent: number | null;
  performance_rating: string | null;
  revenue_amount: number | null;
  cost_amount: number | null;
  profit_amount: number | null;
  profit_margin_percent: number | null;
  price_per_unit: number | null;
  currency_code: string;
  growing_days: number | null;
  weather_conditions: unknown;
  soil_conditions: unknown;
  irrigation_total_m3: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface HarvestForecast {
  id: string;
  organization_id: string;
  farm_id: string;
  parcel_id: string;
  crop_type: string;
  variety: string | null;
  planting_date: string | null;
  forecast_harvest_date_start: string;
  forecast_harvest_date_end: string;
  forecast_season: string | null;
  confidence_level: string | null;
  predicted_yield_quantity: number;
  predicted_yield_per_hectare: number | null;
  unit_of_measure: string;
  predicted_quality_grade: string | null;
  min_yield_quantity: number | null;
  max_yield_quantity: number | null;
  estimated_revenue: number | null;
  estimated_cost: number | null;
  estimated_profit: number | null;
  estimated_price_per_unit: number | null;
  currency_code: string;
  forecast_method: string | null;
  based_on_historical_years: number | null;
  adjustment_factors: unknown;
  status: string;
  actual_harvest_id: string | null;
  actual_yield_quantity: number | null;
  forecast_accuracy_percent: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface YieldBenchmark {
  id: string;
  organization_id: string;
  farm_id: string | null;
  parcel_id: string | null;
  crop_type: string;
  variety: string | null;
  benchmark_type: string;
  target_yield_per_hectare: number;
  unit_of_measure: string;
  excellent_threshold_percent: number | null;
  good_threshold_percent: number | null;
  acceptable_threshold_percent: number | null;
  target_revenue_per_hectare: number | null;
  target_profit_margin_percent: number | null;
  valid_from: string | null;
  valid_until: string | null;
  source: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PerformanceAlert {
  id: string;
  organization_id: string;
  farm_id: string | null;
  parcel_id: string | null;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  yield_history_id: string | null;
  forecast_id: string | null;
  harvest_id: string | null;
  metric_name: string | null;
  actual_value: number | null;
  target_value: number | null;
  variance_percent: number | null;
  status: string;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ParcelPerformanceSummary {
  parcel_id: string;
  parcel_name: string;
  farm_name: string;
  crop_type: string;
  total_harvests: number;
  avg_yield_per_hectare: number;
  avg_target_yield: number;
  avg_variance_percent: number;
  performance_rating: string;
  total_revenue: number;
  total_cost: number;
  total_profit: number;
  avg_profit_margin: number;
  last_harvest_date: string;
}

export interface YieldHistoryFilters {
  farm_id?: string;
  parcel_id?: string;
  crop_type?: string;
  from_date?: string;
  to_date?: string;
}

export interface ForecastFilters {
  farm_id?: string;
  parcel_id?: string;
  status?: string;
  from_date?: string;
  to_date?: string;
}

export interface BenchmarkFilters {
  farm_id?: string;
  parcel_id?: string;
  crop_type?: string;
  is_active?: boolean;
}

export interface AlertFilters {
  farm_id?: string;
  parcel_id?: string;
  status?: string;
  severity?: string;
  alert_type?: string;
}

export interface ParcelPerformanceFilters {
  farm_id?: string;
  parcel_id?: string;
  from_date?: string;
  to_date?: string;
}

export interface CreateYieldHistoryDto {
  farm_id: string;
  parcel_id: string;
  harvest_id?: string;
  crop_type: string;
  variety?: string;
  harvest_date: string;
  harvest_season?: string;
  actual_yield_quantity: number;
  actual_yield_per_hectare?: number;
  unit_of_measure: string;
  quality_grade?: string;
  target_yield_quantity?: number;
  target_yield_per_hectare?: number;
  revenue_amount?: number;
  cost_amount?: number;
  price_per_unit?: number;
  currency_code?: string;
  growing_days?: number;
  irrigation_total_m3?: number;
  notes?: string;
}

export interface CreateForecastDto {
  farm_id: string;
  parcel_id: string;
  crop_type: string;
  variety?: string;
  planting_date?: string;
  forecast_harvest_date_start: string;
  forecast_harvest_date_end: string;
  forecast_season?: string;
  confidence_level?: 'low' | 'medium' | 'high';
  predicted_yield_quantity: number;
  predicted_yield_per_hectare?: number;
  unit_of_measure: string;
  predicted_quality_grade?: string;
  min_yield_quantity?: number;
  max_yield_quantity?: number;
  estimated_revenue?: number;
  estimated_cost?: number;
  estimated_price_per_unit?: number;
  currency_code?: string;
  forecast_method?: string;
  based_on_historical_years?: number;
  notes?: string;
}

export interface UpdateForecastDto {
  planting_date?: string;
  forecast_harvest_date_start?: string;
  forecast_harvest_date_end?: string;
  forecast_season?: string;
  confidence_level?: 'low' | 'medium' | 'high';
  predicted_yield_quantity?: number;
  predicted_yield_per_hectare?: number;
  predicted_quality_grade?: string;
  min_yield_quantity?: number;
  max_yield_quantity?: number;
  estimated_revenue?: number;
  estimated_cost?: number;
  estimated_price_per_unit?: number;
  status?: 'draft' | 'active' | 'completed' | 'cancelled';
  actual_harvest_id?: string;
  actual_yield_quantity?: number;
  notes?: string;
}

export interface CreateBenchmarkDto {
  farm_id?: string;
  parcel_id?: string;
  crop_type: string;
  variety?: string;
  benchmark_type: 'organization' | 'regional' | 'national' | 'custom';
  target_yield_per_hectare: number;
  unit_of_measure: string;
  excellent_threshold_percent?: number;
  good_threshold_percent?: number;
  acceptable_threshold_percent?: number;
  target_revenue_per_hectare?: number;
  target_profit_margin_percent?: number;
  valid_from?: string;
  valid_until?: string;
  source?: string;
  notes?: string;
  is_active?: boolean;
}

function buildQueryString(filters: Record<string, unknown>): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  });
  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

export const productionIntelligenceApi = {
  async getYieldHistory(
    filters: YieldHistoryFilters = {},
    organizationId?: string,
  ): Promise<YieldHistory[]> {
    const url = `${BASE_URL}/${organizationId}/production-intelligence/yield-history${buildQueryString(filters)}`;
    return apiClient.get<YieldHistory[]>(url, {}, organizationId);
  },

  async createYieldHistory(
    data: CreateYieldHistoryDto,
    organizationId?: string,
  ): Promise<YieldHistory> {
    return apiClient.post<YieldHistory>(
      `${BASE_URL}/${organizationId}/production-intelligence/yield-history`,
      data,
      {},
      organizationId,
    );
  },

  async getForecasts(
    filters: ForecastFilters = {},
    organizationId?: string,
  ): Promise<HarvestForecast[]> {
    const url = `${BASE_URL}/${organizationId}/production-intelligence/forecasts${buildQueryString(filters)}`;
    return apiClient.get<HarvestForecast[]>(url, {}, organizationId);
  },

  async createForecast(
    data: CreateForecastDto,
    organizationId?: string,
  ): Promise<HarvestForecast> {
    return apiClient.post<HarvestForecast>(
      `${BASE_URL}/${organizationId}/production-intelligence/forecasts`,
      data,
      {},
      organizationId,
    );
  },

  async updateForecast(
    forecastId: string,
    data: UpdateForecastDto,
    organizationId?: string,
  ): Promise<HarvestForecast> {
    return apiClient.patch<HarvestForecast>(
      `${BASE_URL}/${organizationId}/production-intelligence/forecasts/${forecastId}`,
      data,
      {},
      organizationId,
    );
  },

  async getBenchmarks(
    filters: BenchmarkFilters = {},
    organizationId?: string,
  ): Promise<YieldBenchmark[]> {
    const url = `${BASE_URL}/${organizationId}/production-intelligence/benchmarks${buildQueryString(filters)}`;
    return apiClient.get<YieldBenchmark[]>(url, {}, organizationId);
  },

  async createBenchmark(
    data: CreateBenchmarkDto,
    organizationId?: string,
  ): Promise<YieldBenchmark> {
    return apiClient.post<YieldBenchmark>(
      `${BASE_URL}/${organizationId}/production-intelligence/benchmarks`,
      data,
      {},
      organizationId,
    );
  },

  async getAlerts(
    filters: AlertFilters = {},
    organizationId?: string,
  ): Promise<PerformanceAlert[]> {
    const url = `${BASE_URL}/${organizationId}/production-intelligence/alerts${buildQueryString(filters)}`;
    return apiClient.get<PerformanceAlert[]>(url, {}, organizationId);
  },

  async acknowledgeAlert(
    alertId: string,
    organizationId?: string,
  ): Promise<PerformanceAlert> {
    return apiClient.patch<PerformanceAlert>(
      `${BASE_URL}/${organizationId}/production-intelligence/alerts/${alertId}/acknowledge`,
      {},
      {},
      organizationId,
    );
  },

  async resolveAlert(
    alertId: string,
    resolutionNotes: string,
    organizationId?: string,
  ): Promise<PerformanceAlert> {
    return apiClient.patch<PerformanceAlert>(
      `${BASE_URL}/${organizationId}/production-intelligence/alerts/${alertId}/resolve`,
      { resolution_notes: resolutionNotes },
      {},
      organizationId,
    );
  },

  async getParcelPerformance(
    filters: ParcelPerformanceFilters = {},
    organizationId?: string,
  ): Promise<ParcelPerformanceSummary[]> {
    const url = `${BASE_URL}/${organizationId}/production-intelligence/parcel-performance${buildQueryString(filters)}`;
    return apiClient.get<ParcelPerformanceSummary[]>(url, {}, organizationId);
  },
};
