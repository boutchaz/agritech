import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { satelliteIndicesApi, type SatelliteIndex } from '@/lib/api/satellite-indices';
import {
  satelliteApi,
  VegetationIndexType,
  TimeSeriesRequest,
  convertBoundaryToGeoJSON,
} from '@/lib/satellite-api';

interface CachedTimeSeriesParams {
  parcelId: string;
  parcelName?: string;
  farmId?: string;
  boundary?: number[][];
  indices: VegetationIndexType[];
  startDate: string;
  endDate: string;
  interval: 'day' | 'week' | 'month' | 'year';
  cloudCoverage?: number;
}

interface TimeSeriesDataPoint {
  date: string;
  value: number;
}

interface CachedTimeSeriesResult {
  data: Record<string, TimeSeriesDataPoint[]>;
  isLoading: boolean;
  isFetching: boolean;
  error: string | null;
  cachedDates: Record<string, string[]>;
  fetchedFromApi: boolean;
  syncData: () => Promise<void>;
  lastSyncAt?: string;
}

/**
 * Hook for fetching satellite time series data with database caching.
 *
 * Strategy:
 * 1. First, query the database for existing cached data
 * 2. Identify date gaps (dates not in cache)
 * 3. Only fetch missing dates from satellite API
 * 4. Store new data in database
 * 5. Return merged data
 */
export function useCachedSatelliteTimeSeries(params: CachedTimeSeriesParams): CachedTimeSeriesResult {
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();
  const [fetchedFromApi, setFetchedFromApi] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const organizationId = currentOrganization?.id;

  // Query cached data from database
  const {
    data: cachedData,
    isLoading: isLoadingCache,
    refetch: refetchCache,
  } = useQuery({
    queryKey: ['satellite-indices-cache', params.parcelId, params.indices, params.startDate, params.endDate],
    queryFn: async () => {
      if (!organizationId || !params.parcelId) return {};

      const result: Record<string, SatelliteIndex[]> = {};

      // Fetch cached data for each index
      for (const index of params.indices) {
        try {
          const response = await satelliteIndicesApi.getAll(
            {
              parcel_id: params.parcelId,
              index_name: index,
              date_from: params.startDate,
              date_to: params.endDate,
            },
            organizationId
          );
          result[index] = Array.isArray(response) ? response : (response as any)?.data || [];
        } catch (err) {
          console.warn(`Failed to fetch cached data for ${index}:`, err);
          result[index] = [];
        }
      }

      return result;
    },
    enabled: !!organizationId && !!params.parcelId && params.indices.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutation to save new data to database
  const saveMutation = useMutation({
    mutationFn: async (data: {
      index: string;
      date: string;
      value: number;
      parcelId: string;
      farmId?: string;
    }) => {
      if (!organizationId) throw new Error('No organization');

      return satelliteIndicesApi.create(
        {
          parcel_id: data.parcelId,
          farm_id: data.farmId || '',
          index_name: data.index,
          index_value: data.value,
          date: data.date,
        },
        organizationId
      );
    },
  });

  // Function to fetch missing data from satellite API and cache it
  const syncData = useCallback(async () => {
    if (!params.boundary || !organizationId || params.indices.length === 0) {
      return;
    }

    setError(null);
    setFetchedFromApi(false);

    try {
      // Get all dates in the range
      const allDates = generateDateRange(params.startDate, params.endDate, params.interval);

      // For each index, find missing dates and fetch them
      for (const index of params.indices) {
        const cachedDatesForIndex = new Set(
          (cachedData?.[index] || []).map((item) => item.date?.split('T')[0])
        );

        // Find dates that are not in cache
        const missingDates = allDates.filter((date) => !cachedDatesForIndex.has(date));

        if (missingDates.length === 0) {
          continue;
        }

        setFetchedFromApi(true);

        // Fetch from satellite API
        const request: TimeSeriesRequest = {
          aoi: {
            geometry: convertBoundaryToGeoJSON(params.boundary),
            name: params.parcelName || 'Parcel',
          },
          date_range: {
            start_date: params.startDate,
            end_date: params.endDate,
          },
          index,
          interval: params.interval,
          cloud_coverage: params.cloudCoverage || 20,
          parcel_id: params.parcelId,
          farm_id: params.farmId,
        };

        try {
          const response = await satelliteApi.getTimeSeries(request);

          // Save each new data point to database
          if (response.data && response.data.length > 0) {
            for (const point of response.data) {
              const pointDate = point.date?.split('T')[0];
              if (pointDate && !cachedDatesForIndex.has(pointDate)) {
                try {
                  await saveMutation.mutateAsync({
                    index,
                    date: point.date,
                    value: point.value,
                    parcelId: params.parcelId,
                    farmId: params.farmId,
                  });
                } catch (saveErr) {
                  // Ignore duplicate key errors
                  console.warn(`Could not save ${index} for ${point.date}:`, saveErr);
                }
              }
            }
          }
        } catch (apiErr) {
          console.error(`Failed to fetch ${index} from satellite API:`, apiErr);
        }
      }

      // Refetch cache to get updated data
      await refetchCache();

      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: ['satellite-indices-cache', params.parcelId]
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync satellite data');
    }
  }, [
    params.boundary,
    params.parcelId,
    params.farmId,
    params.parcelName,
    params.indices,
    params.startDate,
    params.endDate,
    params.interval,
    params.cloudCoverage,
    organizationId,
    cachedData,
    saveMutation,
    refetchCache,
    queryClient,
  ]);

  // Transform cached data to chart format
  const transformedData = useCallback((): Record<string, TimeSeriesDataPoint[]> => {
    if (!cachedData) return {};

    const result: Record<string, TimeSeriesDataPoint[]> = {};

    for (const index of params.indices) {
      const indexData = cachedData[index] || [];
      result[index] = indexData
        .map((item) => ({
          date: item.date?.split('T')[0] || item.date,
          value: item.mean_value ?? (item as any).index_value ?? 0,
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }

    return result;
  }, [cachedData, params.indices]);

  // Get cached dates for each index
  const getCachedDates = useCallback((): Record<string, string[]> => {
    if (!cachedData) return {};

    const result: Record<string, string[]> = {};
    for (const index of params.indices) {
      result[index] = (cachedData[index] || []).map((item) => item.date?.split('T')[0]);
    }
    return result;
  }, [cachedData, params.indices]);

  return {
    data: transformedData(),
    isLoading: isLoadingCache,
    isFetching: saveMutation.isPending,
    error,
    cachedDates: getCachedDates(),
    fetchedFromApi,
    syncData,
    lastSyncAt: undefined,
  };
}

/**
 * Generate array of dates based on interval
 */
function generateDateRange(
  startDate: string,
  endDate: string,
  interval: 'day' | 'week' | 'month' | 'year'
): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  const current = new Date(start);

  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);

    switch (interval) {
      case 'day':
        current.setDate(current.getDate() + 1);
        break;
      case 'week':
        current.setDate(current.getDate() + 7);
        break;
      case 'month':
        current.setMonth(current.getMonth() + 1);
        break;
      case 'year':
        current.setFullYear(current.getFullYear() + 1);
        break;
    }
  }

  return dates;
}

export default useCachedSatelliteTimeSeries;
