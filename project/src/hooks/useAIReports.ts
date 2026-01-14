import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../components/MultiTenantAuthProvider';
import { aiReportsApi, type GenerateAIReportDto, type AIReportResponse, type AIProviderInfo, type DataAvailabilityResponse, type CalibrationStatus, type CalibrateRequest, type FetchDataRequest } from '../lib/api/ai-reports';

/**
 * Hook to fetch available AI providers
 */
export function useAIProviders() {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['ai-providers', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return aiReportsApi.getProviders(currentOrganization.id);
    },
    enabled: !!currentOrganization?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes - providers don't change often
  });
}

/**
 * Hook to generate an AI report for a parcel
 */
export function useGenerateAIReport() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (data: GenerateAIReportDto): Promise<AIReportResponse> => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return aiReportsApi.generateReport(data, currentOrganization.id);
    },
    onSuccess: (data) => {
      // Invalidate parcel reports query to include the new AI report
      queryClient.invalidateQueries({
        queryKey: ['parcel-reports', data.parcel_id]
      });
    },
  });
}

export function useDataAvailability(parcelId: string, startDate?: string, endDate?: string) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['ai-report-data-availability', parcelId, startDate, endDate],
    queryFn: () => aiReportsApi.getDataAvailability(parcelId, startDate, endDate, currentOrganization?.id),
    enabled: !!parcelId && !!currentOrganization?.id,
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Hook to get calibration status for a parcel
 */
export function useCalibrationStatus(parcelId: string, startDate?: string, endDate?: string) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['calibration-status', parcelId, startDate, endDate],
    queryFn: () => aiReportsApi.getCalibrationStatus(parcelId, startDate, endDate, currentOrganization?.id),
    enabled: !!parcelId && !!currentOrganization?.id,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Hook to trigger calibration
 */
export function useCalibrate() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async ({ parcelId, request }: { parcelId: string; request: CalibrateRequest }): Promise<CalibrationStatus> => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return aiReportsApi.calibrate(parcelId, request, currentOrganization.id);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['calibration-status', variables.parcelId],
      });
    },
  });
}

/**
 * Hook to fetch missing data
 */
export function useFetchData() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async ({ parcelId, request }: { parcelId: string; request: FetchDataRequest }) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return aiReportsApi.fetchData(parcelId, request, currentOrganization.id);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['calibration-status', variables.parcelId],
      });
      queryClient.invalidateQueries({
        queryKey: ['satellite-indices-cache', variables.parcelId],
      });
    },
  });
}

export type { AIReportResponse, AIProviderInfo, GenerateAIReportDto, DataAvailabilityResponse, CalibrationStatus, CalibrateRequest, FetchDataRequest };
