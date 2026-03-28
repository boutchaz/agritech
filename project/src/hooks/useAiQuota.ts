import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

const BASE_URL = '/api/v1';

export interface AiQuotaStatus {
  monthly_limit: number;
  current_count: number;
  period_start: string;
  period_end: string;
  is_byok: boolean;
  is_unlimited: boolean;
}

export const useAiQuota = (organizationId: string | null) => {
  return useQuery({
    queryKey: ['ai-quota', organizationId],
    queryFn: () =>
      apiClient.get<AiQuotaStatus>(
        `${BASE_URL}/ai-quota`,
        {},
        organizationId!,
      ),
    enabled: !!organizationId,
    staleTime: 60 * 1000, // 1 minute
  });
};
