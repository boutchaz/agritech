// Weather Hooks for Mobile App
// All data comes from NestJS GET /weather/parcel/:id
import { useQuery } from '@tanstack/react-query';
import { weatherApi } from '@/lib/api/weather';
import { useAuthStore } from '@/stores/authStore';
import type { TimeRange } from '@/types/weather';

export const weatherKeys = {
  all: ['weather'] as const,
  current: (parcelId: string) => [...weatherKeys.all, 'current', parcelId] as const,
  forecast: (parcelId: string) => [...weatherKeys.all, 'forecast', parcelId] as const,
  data: (parcelId: string) => [...weatherKeys.all, 'data', parcelId] as const,
  climateNormals: (parcelId: string) => [...weatherKeys.all, 'climate', parcelId] as const,
  monthly: (parcelId: string, range: TimeRange) => [...weatherKeys.all, 'monthly', parcelId, range] as const,
  alerts: (parcelId: string) => [...weatherKeys.all, 'alerts', parcelId] as const,
};

export function useCurrentWeather(parcelId: string) {
  const orgId = useAuthStore((s) => s.currentOrganization?.id);
  return useQuery({
    queryKey: weatherKeys.current(parcelId),
    queryFn: () => weatherApi.getCurrentWeather(parcelId),
    enabled: !!parcelId && !!orgId,
    staleTime: 10 * 60 * 1000,
  });
}

export function useWeatherForecast(parcelId: string) {
  const orgId = useAuthStore((s) => s.currentOrganization?.id);
  return useQuery({
    queryKey: weatherKeys.forecast(parcelId),
    queryFn: () => weatherApi.getForecast(parcelId),
    enabled: !!parcelId && !!orgId,
    staleTime: 30 * 60 * 1000,
  });
}

export function useWeatherData(parcelId: string) {
  const orgId = useAuthStore((s) => s.currentOrganization?.id);
  return useQuery({
    queryKey: weatherKeys.data(parcelId),
    queryFn: () => weatherApi.getWeatherData(parcelId),
    enabled: !!parcelId && !!orgId,
    staleTime: 10 * 60 * 1000,
  });
}

export function useClimateNormals(parcelId: string) {
  const orgId = useAuthStore((s) => s.currentOrganization?.id);
  return useQuery({
    queryKey: weatherKeys.climateNormals(parcelId),
    queryFn: () => weatherApi.getClimateNormals(parcelId),
    enabled: !!parcelId && !!orgId,
    staleTime: 24 * 60 * 60 * 1000,
  });
}

export function useMonthlyMetrics(parcelId: string, timeRange: TimeRange = 'last-12-months') {
  const orgId = useAuthStore((s) => s.currentOrganization?.id);
  return useQuery({
    queryKey: weatherKeys.monthly(parcelId, timeRange),
    queryFn: () => weatherApi.getMonthlyMetrics(parcelId, timeRange),
    enabled: !!parcelId && !!orgId,
    staleTime: 60 * 60 * 1000,
  });
}

export function useWeatherAlerts(parcelId: string) {
  const orgId = useAuthStore((s) => s.currentOrganization?.id);
  return useQuery({
    queryKey: weatherKeys.alerts(parcelId),
    queryFn: () => weatherApi.getAlerts(parcelId),
    enabled: !!parcelId && !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}
