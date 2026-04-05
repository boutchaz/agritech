import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import {
  productionIntelligenceApi,
  YieldHistory,
  HarvestForecast,
  YieldBenchmark,
  PerformanceAlert,
  ParcelPerformanceSummary,
  CreateYieldHistoryDto,
  CreateForecastDto,
  UpdateForecastDto,
  CreateBenchmarkDto,
} from '@/lib/api/production-intelligence';

export type {
  YieldHistory,
  HarvestForecast,
  YieldBenchmark,
  PerformanceAlert,
  ParcelPerformanceSummary,
};

export function useYieldHistory(filters?: {
  farmId?: string;
  parcelId?: string;
  cropType?: string;
  fromDate?: string;
  toDate?: string;
}) {
  const { currentOrganization } = useAuth();
  const filterKey = filters ? JSON.stringify(filters) : undefined;

  return useQuery({
    queryKey: ['yield_history', currentOrganization?.id, filterKey],
    queryFn: async () => {
      if (!currentOrganization?.id) throw new Error('No organization selected');

      return productionIntelligenceApi.getYieldHistory(
        {
          farm_id: filters?.farmId,
          parcel_id: filters?.parcelId,
          crop_type: filters?.cropType,
          from_date: filters?.fromDate,
          to_date: filters?.toDate,
        },
        currentOrganization.id,
      );
    },
    enabled: !!currentOrganization?.id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateYieldHistory() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (yieldData: Partial<CreateYieldHistoryDto>) => {
      if (!currentOrganization?.id) throw new Error('No organization selected');

      return productionIntelligenceApi.createYieldHistory(
        yieldData as CreateYieldHistoryDto,
        currentOrganization.id,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['yield_history'] });
      queryClient.invalidateQueries({ queryKey: ['parcel_performance'] });
    },
  });
}

export function useHarvestForecasts(filters?: {
  farmId?: string;
  parcelId?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
}) {
  const { currentOrganization } = useAuth();
  const filterKey = filters ? JSON.stringify(filters) : undefined;

  return useQuery({
    queryKey: ['harvest_forecasts', currentOrganization?.id, filterKey],
    queryFn: async () => {
      if (!currentOrganization?.id) throw new Error('No organization selected');

      return productionIntelligenceApi.getForecasts(
        {
          farm_id: filters?.farmId,
          parcel_id: filters?.parcelId,
          status: filters?.status,
          from_date: filters?.fromDate,
          to_date: filters?.toDate,
        },
        currentOrganization.id,
      );
    },
    enabled: !!currentOrganization?.id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateHarvestForecast() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (forecastData: Partial<CreateForecastDto>) => {
      if (!currentOrganization?.id) throw new Error('No organization selected');

      return productionIntelligenceApi.createForecast(
        forecastData as CreateForecastDto,
        currentOrganization.id,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['harvest_forecasts'] });
    },
  });
}

export function useUpdateHarvestForecast() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<UpdateForecastDto> }) => {
      if (!currentOrganization?.id) throw new Error('No organization selected');

      return productionIntelligenceApi.updateForecast(
        id,
        updates as UpdateForecastDto,
        currentOrganization.id,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['harvest_forecasts'] });
    },
  });
}

export function useYieldBenchmarks(filters?: {
  farmId?: string;
  parcelId?: string;
  cropType?: string;
  isActive?: boolean;
}) {
  const { currentOrganization } = useAuth();
  const filterKey = filters ? JSON.stringify(filters) : undefined;

  return useQuery({
    queryKey: ['yield_benchmarks', currentOrganization?.id, filterKey],
    queryFn: async () => {
      if (!currentOrganization?.id) throw new Error('No organization selected');

      return productionIntelligenceApi.getBenchmarks(
        {
          farm_id: filters?.farmId,
          parcel_id: filters?.parcelId,
          crop_type: filters?.cropType,
          is_active: filters?.isActive,
        },
        currentOrganization.id,
      );
    },
    enabled: !!currentOrganization?.id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateYieldBenchmark() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (benchmarkData: Partial<CreateBenchmarkDto>) => {
      if (!currentOrganization?.id) throw new Error('No organization selected');

      return productionIntelligenceApi.createBenchmark(
        benchmarkData as CreateBenchmarkDto,
        currentOrganization.id,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['yield_benchmarks'] });
    },
  });
}

export function usePerformanceAlerts(filters?: {
  farmId?: string;
  parcelId?: string;
  status?: string;
  severity?: string;
  alertType?: string;
}) {
  const { currentOrganization } = useAuth();
  const filterKey = filters ? JSON.stringify(filters) : undefined;

  return useQuery({
    queryKey: ['performance_alerts', currentOrganization?.id, filterKey],
    queryFn: async () => {
      if (!currentOrganization?.id) throw new Error('No organization selected');

      return productionIntelligenceApi.getAlerts(
        {
          farm_id: filters?.farmId,
          parcel_id: filters?.parcelId,
          status: filters?.status,
          severity: filters?.severity,
          alert_type: filters?.alertType,
        },
        currentOrganization.id,
      );
    },
    enabled: !!currentOrganization?.id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (alertId: string) => {
      if (!currentOrganization?.id) throw new Error('No organization selected');

      return productionIntelligenceApi.acknowledgeAlert(alertId, currentOrganization.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance_alerts'] });
    },
  });
}

export function useResolveAlert() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async ({ alertId, notes }: { alertId: string; notes: string }) => {
      if (!currentOrganization?.id) throw new Error('No organization selected');

      return productionIntelligenceApi.resolveAlert(alertId, notes, currentOrganization.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance_alerts'] });
    },
  });
}

export function useParcelPerformanceSummary(filters?: {
  farmId?: string;
  parcelId?: string;
  fromDate?: string;
  toDate?: string;
}) {
  const { currentOrganization } = useAuth();
  const filterKey = filters ? JSON.stringify(filters) : undefined;

  return useQuery({
    queryKey: ['parcel_performance', currentOrganization?.id, filterKey],
    queryFn: async () => {
      if (!currentOrganization?.id) throw new Error('No organization selected');

      return productionIntelligenceApi.getParcelPerformance(
        {
          farm_id: filters?.farmId,
          parcel_id: filters?.parcelId,
          from_date: filters?.fromDate,
          to_date: filters?.toDate,
        },
        currentOrganization.id,
      );
    },
    enabled: !!currentOrganization?.id,
    staleTime: 5 * 60 * 1000,
  });
}
