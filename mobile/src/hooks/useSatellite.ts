import { useQuery } from '@tanstack/react-query';
import { satelliteApi, type SatelliteDataPoint, type VegetationIndex } from '@/lib/api/satellite';
import { useAuthStore } from '@/stores/authStore';

export const satelliteKeys = {
  all: ['satellite'] as const,
  parcelData: (parcelId: string, indices?: string[]) =>
    [...satelliteKeys.all, 'data', parcelId, indices?.join(',') ?? 'all'] as const,
  latestData: (parcelId: string) =>
    [...satelliteKeys.all, 'latest', parcelId] as const,
  syncStatus: (parcelId: string) =>
    [...satelliteKeys.all, 'sync', parcelId] as const,
  heatmap: (parcelId: string, index: string, date: string) =>
    [...satelliteKeys.all, 'heatmap', parcelId, index, date] as const,
};

/** Get cached satellite timeseries data for a parcel */
export function useSatelliteData(
  parcelId: string,
  options?: { start_date?: string; end_date?: string; indices?: VegetationIndex[] },
) {
  const orgId = useAuthStore((s) => s.currentOrganization?.id);

  return useQuery({
    queryKey: satelliteKeys.parcelData(parcelId, options?.indices),
    queryFn: () =>
      satelliteApi.getParcelData(parcelId, {
        start_date: options?.start_date,
        end_date: options?.end_date,
        indices: options?.indices,
      }),
    enabled: !!parcelId && !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}

/** Get latest satellite data point per index */
export function useLatestSatelliteData(parcelId: string) {
  const orgId = useAuthStore((s) => s.currentOrganization?.id);

  return useQuery({
    queryKey: satelliteKeys.latestData(parcelId),
    queryFn: () => satelliteApi.getLatestData(parcelId),
    enabled: !!parcelId && !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}

/** Get sync status */
export function useSyncStatus(parcelId: string) {
  const orgId = useAuthStore((s) => s.currentOrganization?.id);

  return useQuery({
    queryKey: satelliteKeys.syncStatus(parcelId),
    queryFn: () => satelliteApi.getSyncStatus(parcelId),
    enabled: !!parcelId && !!orgId,
    staleTime: 60 * 1000,
  });
}

/** Get heatmap pixel data for a specific date + index */
export function useHeatmap(
  parcelId: string,
  boundary: number[][] | null,
  indexName: VegetationIndex,
  date: string,
) {
  const orgId = useAuthStore((s) => s.currentOrganization?.id);

  return useQuery({
    queryKey: satelliteKeys.heatmap(parcelId, indexName, date),
    queryFn: () => satelliteApi.getHeatmap(parcelId, boundary!, indexName, date),
    enabled: !!parcelId && !!orgId && !!boundary && boundary.length >= 3 && !!date,
    staleTime: 24 * 60 * 60 * 1000, // 24h — heatmap data doesn't change
  });
}

/**
 * Transform raw satellite data points into per-index timeseries
 * ready for charting: { date, NIRv, EVI, NDRE, ... }
 */
export function groupByDate(points: SatelliteDataPoint[]) {
  const map = new Map<string, Record<string, number>>();

  for (const p of points) {
    if (p.mean_value == null || isNaN(p.mean_value)) continue;
    const existing = map.get(p.date) ?? {};
    existing[p.index_name] = p.mean_value;
    map.set(p.date, existing);
  }

  return Array.from(map.entries())
    .map(([date, values]) => ({ date, ...values }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
