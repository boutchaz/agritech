// Weather Hooks for Mobile App
import { useQuery } from '@tanstack/react-query';
import { weatherApi } from '@/lib/api/weather';
import { useAuthStore } from '@/stores/authStore';
import type { TimeRange } from '@/types/weather';

// Query Keys
export const weatherKeys = {
  all: ['weather'] as const,
  current: (parcelId: string) => [...weatherKeys.all, 'current', parcelId] as const,
  forecast: (parcelId: string) => [...weatherKeys.all, 'forecast', parcelId] as const,
  data: (parcelId: string) => [...weatherKeys.all, 'data', parcelId] as const,
  climateNormals: (parcelId: string) => [...weatherKeys.all, 'climate', parcelId] as const,
  monthly: (parcelId: string, range: TimeRange) => [...weatherKeys.all, 'monthly', parcelId, range] as const,
  alerts: (parcelId: string) => [...weatherKeys.all, 'alerts', parcelId] as const,
};

/**
 * Get current weather for a parcel
 */
export function useCurrentWeather(parcelId: string) {
  const orgId = useAuthStore((s) => s.currentOrganization?.id);

  return useQuery({
    queryKey: weatherKeys.current(parcelId),
    queryFn: () => weatherApi.getCurrentWeather(parcelId),
    enabled: !!parcelId && !!orgId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Get weather forecast for a parcel
 */
export function useWeatherForecast(parcelId: string) {
  const orgId = useAuthStore((s) => s.currentOrganization?.id);

  return useQuery({
    queryKey: weatherKeys.forecast(parcelId),
    queryFn: () => weatherApi.getForecast(parcelId),
    enabled: !!parcelId && !!orgId,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Get full weather data for a parcel
 */
export function useWeatherData(parcelId: string) {
  const orgId = useAuthStore((s) => s.currentOrganization?.id);

  return useQuery({
    queryKey: weatherKeys.data(parcelId),
    queryFn: () => weatherApi.getWeatherData(parcelId),
    enabled: !!parcelId && !!orgId,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Get climate normals for a parcel
 */
export function useClimateNormals(parcelId: string) {
  const orgId = useAuthStore((s) => s.currentOrganization?.id);

  return useQuery({
    queryKey: weatherKeys.climateNormals(parcelId),
    queryFn: () => weatherApi.getClimateNormals(parcelId),
    enabled: !!parcelId && !!orgId,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}

/**
 * Get monthly metrics for a parcel
 */
export function useMonthlyMetrics(parcelId: string, timeRange: TimeRange = 'last-12-months') {
  const orgId = useAuthStore((s) => s.currentOrganization?.id);

  return useQuery({
    queryKey: weatherKeys.monthly(parcelId, timeRange),
    queryFn: () => weatherApi.getMonthlyMetrics(parcelId, timeRange),
    enabled: !!parcelId && !!orgId,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

/**
 * Get weather alerts for a parcel
 */
export function useWeatherAlerts(parcelId: string) {
  const orgId = useAuthStore((s) => s.currentOrganization?.id);

  return useQuery({
    queryKey: weatherKeys.alerts(parcelId),
    queryFn: () => weatherApi.getAlerts(parcelId),
    enabled: !!parcelId && !!orgId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
