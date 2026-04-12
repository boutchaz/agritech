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

export interface UsageLogEntry {
  id: string;
  created_at: string;
  feature: string;
  provider: string;
  model: string | null;
  tokens_used: number | null;
  is_byok: boolean | null;
}

export interface DailyTokenAggregate {
  date: string;
  total_tokens: number;
  request_count: number;
  by_model: Record<string, number>;
}

export interface UsageLogResponse {
  daily_aggregates: DailyTokenAggregate[];
  recent_entries: UsageLogEntry[];
  total_tokens: number;
  total_requests: number;
  period_start: string;
  period_end: string;
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
    staleTime: 60 * 1000,
  });
};

export const useAiUsageLog = (organizationId: string | null) => {
  return useQuery({
    queryKey: ['ai-usage-log', organizationId],
    queryFn: () =>
      apiClient.get<UsageLogResponse>(
        `${BASE_URL}/ai-quota/usage-log`,
        {},
        organizationId!,
      ),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 min
  });
};
