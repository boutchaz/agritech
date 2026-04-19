import { useQuery } from '@tanstack/react-query';
import { fetchPhenologicalCounters, type PhenologicalCountersResponse } from '@/lib/api/weather';

export const usePhenologicalCounters = (params: {
  parcelId: string | null | undefined;
  organizationId: string | null | undefined;
  year?: number;
}) => {
  const year = params.year ?? new Date().getFullYear();
  return useQuery<PhenologicalCountersResponse>({
    queryKey: ['phenological-counters', params.parcelId, params.organizationId, year],
    queryFn: () =>
      fetchPhenologicalCounters({
        parcelId: params.parcelId!,
        organizationId: params.organizationId!,
        year,
      }),
    enabled: !!params.parcelId && !!params.organizationId,
    staleTime: 60 * 60 * 1000, // 1h — counters change slowly
  });
};
