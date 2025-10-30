import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/MultiTenantAuthProvider';

// ============================================================================
// Types
// ============================================================================

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
  weather_conditions: any;
  soil_conditions: any;
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
  adjustment_factors: any;
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

// ============================================================================
// Yield History Hooks
// ============================================================================

export function useYieldHistory(filters?: {
  farmId?: string;
  parcelId?: string;
  cropType?: string;
  fromDate?: string;
  toDate?: string;
}) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['yield_history', currentOrganization?.id, filters],
    queryFn: async () => {
      if (!currentOrganization?.id) throw new Error('No organization selected');

      let query = supabase
        .from('yield_history')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('harvest_date', { ascending: false });

      if (filters?.farmId) query = query.eq('farm_id', filters.farmId);
      if (filters?.parcelId) query = query.eq('parcel_id', filters.parcelId);
      if (filters?.cropType) query = query.eq('crop_type', filters.cropType);
      if (filters?.fromDate) query = query.gte('harvest_date', filters.fromDate);
      if (filters?.toDate) query = query.lte('harvest_date', filters.toDate);

      const { data, error } = await query;
      if (error) throw error;
      return data as YieldHistory[];
    },
    enabled: !!currentOrganization?.id,
  });
}

export function useCreateYieldHistory() {
  const queryClient = useQueryClient();
  const { currentOrganization, user } = useAuth();

  return useMutation({
    mutationFn: async (yieldData: Partial<YieldHistory>) => {
      if (!currentOrganization?.id) throw new Error('No organization selected');

      const { data, error } = await supabase
        .from('yield_history')
        .insert({
          ...yieldData,
          organization_id: currentOrganization.id,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['yield_history'] });
      queryClient.invalidateQueries({ queryKey: ['parcel_performance'] });
    },
  });
}

// ============================================================================
// Harvest Forecast Hooks
// ============================================================================

export function useHarvestForecasts(filters?: {
  farmId?: string;
  parcelId?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
}) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['harvest_forecasts', currentOrganization?.id, filters],
    queryFn: async () => {
      if (!currentOrganization?.id) throw new Error('No organization selected');

      let query = supabase
        .from('harvest_forecasts')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('forecast_harvest_date_start', { ascending: true });

      if (filters?.farmId) query = query.eq('farm_id', filters.farmId);
      if (filters?.parcelId) query = query.eq('parcel_id', filters.parcelId);
      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.fromDate) query = query.gte('forecast_harvest_date_start', filters.fromDate);
      if (filters?.toDate) query = query.lte('forecast_harvest_date_end', filters.toDate);

      const { data, error } = await query;
      if (error) throw error;
      return data as HarvestForecast[];
    },
    enabled: !!currentOrganization?.id,
  });
}

export function useCreateHarvestForecast() {
  const queryClient = useQueryClient();
  const { currentOrganization, user } = useAuth();

  return useMutation({
    mutationFn: async (forecastData: Partial<HarvestForecast>) => {
      if (!currentOrganization?.id) throw new Error('No organization selected');

      const { data, error } = await supabase
        .from('harvest_forecasts')
        .insert({
          ...forecastData,
          organization_id: currentOrganization.id,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['harvest_forecasts'] });
    },
  });
}

export function useUpdateHarvestForecast() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<HarvestForecast> }) => {
      const { data, error } = await supabase
        .from('harvest_forecasts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['harvest_forecasts'] });
    },
  });
}

// ============================================================================
// Yield Benchmark Hooks
// ============================================================================

export function useYieldBenchmarks(filters?: {
  farmId?: string;
  parcelId?: string;
  cropType?: string;
  isActive?: boolean;
}) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['yield_benchmarks', currentOrganization?.id, filters],
    queryFn: async () => {
      if (!currentOrganization?.id) throw new Error('No organization selected');

      let query = supabase
        .from('yield_benchmarks')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('crop_type', { ascending: true });

      if (filters?.farmId) query = query.eq('farm_id', filters.farmId);
      if (filters?.parcelId) query = query.eq('parcel_id', filters.parcelId);
      if (filters?.cropType) query = query.eq('crop_type', filters.cropType);
      if (filters?.isActive !== undefined) query = query.eq('is_active', filters.isActive);

      const { data, error } = await query;
      if (error) throw error;
      return data as YieldBenchmark[];
    },
    enabled: !!currentOrganization?.id,
  });
}

export function useCreateYieldBenchmark() {
  const queryClient = useQueryClient();
  const { currentOrganization, user } = useAuth();

  return useMutation({
    mutationFn: async (benchmarkData: Partial<YieldBenchmark>) => {
      if (!currentOrganization?.id) throw new Error('No organization selected');

      const { data, error } = await supabase
        .from('yield_benchmarks')
        .insert({
          ...benchmarkData,
          organization_id: currentOrganization.id,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['yield_benchmarks'] });
    },
  });
}

// ============================================================================
// Performance Alerts Hooks
// ============================================================================

export function usePerformanceAlerts(filters?: {
  farmId?: string;
  parcelId?: string;
  status?: string;
  severity?: string;
  alertType?: string;
}) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['performance_alerts', currentOrganization?.id, filters],
    queryFn: async () => {
      if (!currentOrganization?.id) throw new Error('No organization selected');

      let query = supabase
        .from('performance_alerts')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false });

      if (filters?.farmId) query = query.eq('farm_id', filters.farmId);
      if (filters?.parcelId) query = query.eq('parcel_id', filters.parcelId);
      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.severity) query = query.eq('severity', filters.severity);
      if (filters?.alertType) query = query.eq('alert_type', filters.alertType);

      const { data, error } = await query;
      if (error) throw error;
      return data as PerformanceAlert[];
    },
    enabled: !!currentOrganization?.id,
  });
}

export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const { data, error } = await supabase
        .from('performance_alerts')
        .update({
          status: 'acknowledged',
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: user?.id,
        })
        .eq('id', alertId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance_alerts'] });
    },
  });
}

export function useResolveAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ alertId, notes }: { alertId: string; notes: string }) => {
      const { data, error } = await supabase
        .from('performance_alerts')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolution_notes: notes,
        })
        .eq('id', alertId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance_alerts'] });
    },
  });
}

// ============================================================================
// Parcel Performance Summary Hook
// ============================================================================

export function useParcelPerformanceSummary(filters?: {
  farmId?: string;
  parcelId?: string;
  fromDate?: string;
  toDate?: string;
}) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['parcel_performance', currentOrganization?.id, filters],
    queryFn: async () => {
      if (!currentOrganization?.id) throw new Error('No organization selected');

      const { data, error } = await supabase.rpc('get_parcel_performance_summary', {
        p_organization_id: currentOrganization.id,
        p_farm_id: filters?.farmId || null,
        p_parcel_id: filters?.parcelId || null,
        p_from_date: filters?.fromDate || null,
        p_to_date: filters?.toDate || null,
      });

      if (error) throw error;
      return data as ParcelPerformanceSummary[];
    },
    enabled: !!currentOrganization?.id,
  });
}
