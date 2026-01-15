import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../components/MultiTenantAuthProvider';
import { authSupabase } from '../lib/auth-supabase';
import { aiReportsApi, type GenerateAIReportDto, type AIReportResponse, type AIProviderInfo, type DataAvailabilityResponse, type CalibrationStatus, type CalibrateRequest, type FetchDataRequest, type AIReportJob, type AIReportJobStatus } from '../lib/api/ai-reports';

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
 * Hook to start an AI report generation job
 */
export function useGenerateAIReport() {
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (data: GenerateAIReportDto): Promise<AIReportJob> => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return aiReportsApi.generateReport(data, currentOrganization.id);
    },
  });
}

/**
 * Hook to track AI report job status with realtime updates
 */
export function useAIReportJob(jobId: string | null) {
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();
  const [job, setJob] = useState<AIReportJob | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchJobStatus = useCallback(async () => {
    if (!jobId || !currentOrganization?.id) return;
    
    setIsLoading(true);
    try {
      const jobData = await aiReportsApi.getJobStatus(jobId, currentOrganization.id);
      setJob(jobData);
      setError(null);
      
      if (jobData.status === 'completed' && jobData.result) {
        queryClient.invalidateQueries({ queryKey: ['parcel-reports'] });
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch job status'));
    } finally {
      setIsLoading(false);
    }
  }, [jobId, currentOrganization?.id, queryClient]);

  useEffect(() => {
    if (!jobId) {
      setJob(null);
      return;
    }

    fetchJobStatus();

    const channel = authSupabase
      .channel(`ai_report_job_${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ai_report_jobs',
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          const updated = payload.new as AIReportJob;
          setJob({
            job_id: updated.job_id || (payload.new as { id: string }).id,
            status: updated.status,
            progress: updated.progress,
            error_message: updated.error_message,
            report_id: updated.report_id,
            result: updated.result,
            created_at: updated.created_at,
            started_at: updated.started_at,
            completed_at: updated.completed_at,
          });

          if (updated.status === 'completed') {
            queryClient.invalidateQueries({ queryKey: ['parcel-reports'] });
          }
        }
      )
      .subscribe();

    return () => {
      authSupabase.removeChannel(channel);
    };
  }, [jobId, fetchJobStatus, queryClient]);

  const report = job ? aiReportsApi.mapJobResultToReport(job) : null;

  return {
    job,
    report,
    isLoading,
    error,
    isCompleted: job?.status === 'completed',
    isFailed: job?.status === 'failed',
    isProcessing: job?.status === 'processing' || job?.status === 'pending',
    refetch: fetchJobStatus,
  };
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

export type { AIReportResponse, AIProviderInfo, GenerateAIReportDto, DataAvailabilityResponse, CalibrationStatus, CalibrateRequest, FetchDataRequest, AIReportJob, AIReportJobStatus };
