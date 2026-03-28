/**
 * Profitability Query Hook
 *
 * Provides comprehensive profitability analysis from:
 * - Cost/revenue tracking (costs, revenues, cost_categories tables)
 * - Accounting ledger (journal_entries, accounts, vw_ledger)
 */

import { useQuery } from '@tanstack/react-query';
import { profitabilityApi, type ParcelProfitabilityData, type AnalysisFilters, type AnalysisResult } from '@/lib/api/profitability';

export type { ParcelProfitabilityData, AnalysisFilters, AnalysisResult };

export function useProfitabilityData(
  parcelId: string,
  startDate: string,
  endDate: string,
  organizationId: string
) {
  return useQuery({
    queryKey: ['profitability', parcelId, startDate, endDate, organizationId],
    queryFn: async (): Promise<ParcelProfitabilityData> => {
      return profitabilityApi.getParcelProfitability(parcelId, startDate, endDate, organizationId);
    },
    enabled: !!parcelId && !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useProfitabilityAnalysis(
  filters: AnalysisFilters,
  organizationId: string | null,
) {
  return useQuery<AnalysisResult>({
    queryKey: ['profitability-analysis', organizationId, filters],
    queryFn: () => profitabilityApi.getAnalysis(filters, organizationId!),
    enabled: !!organizationId && !!filters.filter_type,
    staleTime: 5 * 60 * 1000,
  });
}

export function useJournalEntriesForParcel(
  parcelId: string,
  startDate: string,
  endDate: string,
  organizationId: string
) {
  return useQuery({
    queryKey: ['journal-entries-parcel', parcelId, startDate, endDate, organizationId],
    queryFn: async () => {
      return profitabilityApi.getJournalEntriesForParcel(parcelId, startDate, endDate, organizationId);
    },
    enabled: !!parcelId && !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}
