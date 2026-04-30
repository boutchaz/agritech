import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { runOrQueue as runOrQueueOffline } from '../lib/offline/runOrQueue';
import {
  pestAlertsApi,
  type CreatePestReportDto,
  type UpdatePestReportDto,
  type PestReportResponseDto,
  type PestDiseaseLibraryItem,
  type EscalateToAlertResponse,
  type DiseaseRiskResponse,
} from '../lib/api/pest-alerts';

// =====================================================
// QUERY HOOKS
// =====================================================

/**
 * Fetch pest/disease reference library
 */
export function usePestDiseaseLibrary(organizationId: string | null) {
  return useQuery({
    queryKey: ['pest-alerts', 'library', organizationId],
    queryFn: async (): Promise<PestDiseaseLibraryItem[]> => {
      if (!organizationId) return [];
      return pestAlertsApi.getPestDiseaseLibrary(organizationId);
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch all pest reports for organization
 */
export function usePestReports(organizationId: string | null) {
  return useQuery({
    queryKey: ['pest-alerts', 'reports', organizationId],
    queryFn: async (): Promise<PestReportResponseDto[]> => {
      if (!organizationId) return [];
      return pestAlertsApi.getPestReports(organizationId);
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch single pest report by ID
 */
export function usePestReport(organizationId: string | null, reportId: string | null) {
  return useQuery({
    queryKey: ['pest-alerts', 'report', reportId],
    queryFn: async (): Promise<PestReportResponseDto | null> => {
      if (!reportId || !organizationId) return null;
      return pestAlertsApi.getPestReport(organizationId, reportId);
    },
    enabled: !!reportId && !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch disease risk assessment for a parcel
 */
export function useDiseaseRisk(organizationId: string | null, parcelId: string | null) {
  return useQuery({
    queryKey: ['pest-alerts', 'disease-risk', parcelId],
    queryFn: async (): Promise<DiseaseRiskResponse | null> => {
      if (!organizationId || !parcelId) return null;
      return pestAlertsApi.getDiseaseRisk(organizationId, parcelId);
    },
    enabled: !!organizationId && !!parcelId,
    staleTime: 10 * 60 * 1000,
  });
}

// =====================================================
// MUTATION HOOKS
// =====================================================

/**
 * Create new pest report
 */
export function useCreatePestReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      data,
    }: {
      organizationId: string;
      data: CreatePestReportDto;
    }): Promise<PestReportResponseDto> => {
      const cid = uuidv4();
      const payload = { ...data, client_id: cid } as CreatePestReportDto & { client_id: string };
      const outcome = await runOrQueueOffline(
        {
          organizationId,
          resource: 'pest-report',
          method: 'POST',
          url: '/api/v1/pest-alerts/reports',
          payload,
          clientId: cid,
        },
        () => pestAlertsApi.createPestReport(organizationId, payload),
      );
      if (outcome.status === 'queued') {
        return { ...payload, id: cid, _pending: true } as unknown as PestReportResponseDto;
      }
      return outcome.result;
    },
    onSuccess: (_, variables) => {
      // Invalidate reports list
      queryClient.invalidateQueries({
        queryKey: ['pest-alerts', 'reports', variables.organizationId],
      });
      toast.success('Pest report created successfully');
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to create pest report';
      toast.error(message);
    },
  });
}

/**
 * Update pest report status
 */
export function useUpdatePestReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      reportId,
      data,
    }: {
      organizationId: string;
      reportId: string;
      data: UpdatePestReportDto;
    }): Promise<PestReportResponseDto> => {
      return pestAlertsApi.updatePestReport(organizationId, reportId, data);
    },
    onSuccess: (_, variables) => {
      // Invalidate specific report and reports list
      queryClient.invalidateQueries({
        queryKey: ['pest-alerts', 'report', variables.reportId],
      });
      queryClient.invalidateQueries({
        queryKey: ['pest-alerts', 'reports', variables.organizationId],
      });
      toast.success('Pest report updated successfully');
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to update pest report';
      toast.error(message);
    },
  });
}

/**
 * Delete pest report
 */
export function useDeletePestReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      reportId,
    }: {
      organizationId: string;
      reportId: string;
    }): Promise<void> => {
      return pestAlertsApi.deletePestReport(organizationId, reportId);
    },
    onSuccess: (_, variables) => {
      // Invalidate reports list
      queryClient.invalidateQueries({
        queryKey: ['pest-alerts', 'reports', variables.organizationId],
      });
      toast.success('Pest report deleted successfully');
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to delete pest report';
      toast.error(message);
    },
  });
}

/**
 * Escalate pest report to performance alert
 */
export function useEscalatePestReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      reportId,
    }: {
      organizationId: string;
      reportId: string;
    }): Promise<EscalateToAlertResponse> => {
      return pestAlertsApi.escalatePestReport(organizationId, reportId);
    },
    onSuccess: (_, variables) => {
      // Invalidate specific report and reports list
      queryClient.invalidateQueries({
        queryKey: ['pest-alerts', 'report', variables.reportId],
      });
      queryClient.invalidateQueries({
        queryKey: ['pest-alerts', 'reports', variables.organizationId],
      });
      toast.success('Pest report escalated to alert successfully');
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to escalate pest report';
      toast.error(message);
    },
  });
}
