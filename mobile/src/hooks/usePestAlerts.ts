// Pest Alerts Hooks for Mobile App
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pestAlertsApi } from '@/lib/api/pest-alerts';
import { useAuthStore } from '@/stores/authStore';
import type {
  CreatePestReportInput,
  UpdatePestReportInput,
  PestReportFilters,
} from '@/types/pest-alerts';

// Query Keys
export const pestAlertKeys = {
  all: ['pestAlerts'] as const,
  reports: (filters?: PestReportFilters) => [...pestAlertKeys.all, 'reports', filters] as const,
  report: (id: string) => [...pestAlertKeys.all, 'report', id] as const,
  library: () => [...pestAlertKeys.all, 'library'] as const,
  diseaseRisk: (parcelId: string) => [...pestAlertKeys.all, 'disease-risk', parcelId] as const,
};

// Reports
export function usePestReports(filters?: PestReportFilters) {
  const orgId = useAuthStore((s) => s.currentOrganization?.id);

  return useQuery({
    queryKey: pestAlertKeys.reports(filters),
    queryFn: () => pestAlertsApi.getReports(filters),
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000,
  });
}

export function usePestReport(reportId: string) {
  return useQuery({
    queryKey: pestAlertKeys.report(reportId),
    queryFn: () => pestAlertsApi.getReport(reportId),
    enabled: !!reportId,
    staleTime: 5 * 60 * 1000,
  });
}

// Library
export function usePestDiseaseLibrary() {
  const orgId = useAuthStore((s) => s.currentOrganization?.id);

  return useQuery({
    queryKey: pestAlertKeys.library(),
    queryFn: () => pestAlertsApi.getLibrary(),
    enabled: !!orgId,
    staleTime: 10 * 60 * 1000,
  });
}

// Disease Risk
export function useDiseaseRisk(parcelId: string) {
  const orgId = useAuthStore((s) => s.currentOrganization?.id);

  return useQuery({
    queryKey: pestAlertKeys.diseaseRisk(parcelId),
    queryFn: () => pestAlertsApi.getDiseaseRisk(parcelId),
    enabled: !!orgId && !!parcelId,
    staleTime: 10 * 60 * 1000,
  });
}

// Mutations
export function useCreatePestReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePestReportInput) => pestAlertsApi.createReport(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pestAlertKeys.reports() });
    },
  });
}

export function useUpdatePestReport(reportId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdatePestReportInput) => pestAlertsApi.updateReport(reportId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pestAlertKeys.report(reportId) });
      queryClient.invalidateQueries({ queryKey: pestAlertKeys.reports() });
    },
  });
}

export function useDeletePestReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reportId: string) => pestAlertsApi.deleteReport(reportId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pestAlertKeys.reports() });
    },
  });
}

export function useEscalatePestReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reportId: string) => pestAlertsApi.escalateReport(reportId),
    onSuccess: (_data, reportId) => {
      queryClient.invalidateQueries({ queryKey: pestAlertKeys.report(reportId) });
      queryClient.invalidateQueries({ queryKey: pestAlertKeys.reports() });
    },
  });
}
