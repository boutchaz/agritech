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
          const row = payload.new as Record<string, unknown>;
          const updatedJob: AIReportJob = {
            job_id: (row.id as string) || jobId,
            status: row.status as AIReportJobStatus,
            progress: (row.progress as number) || 0,
            error_message: row.error_message as string | undefined,
            report_id: row.report_id as string | undefined,
            result: row.result as AIReportJob['result'],
            created_at: row.created_at as string,
            started_at: row.started_at as string | undefined,
            completed_at: row.completed_at as string | undefined,
          };
          setJob(updatedJob);

          if (updatedJob.status === 'completed') {
            queryClient.invalidateQueries({ queryKey: ['parcel-reports'] });
            queryClient.invalidateQueries({ queryKey: ['ai-report-jobs'] });
          }
        }
      )
      .subscribe();

    const pollInterval = setInterval(() => {
      if (job?.status === 'completed' || job?.status === 'failed') {
        clearInterval(pollInterval);
        return;
      }
      fetchJobStatus();
    }, 3000);

    return () => {
      authSupabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [jobId, fetchJobStatus, queryClient, job?.status]);

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

export function usePendingAIReportJobs() {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['ai-report-jobs', 'pending', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return { jobs: [] };
      const pending = await aiReportsApi.listJobs(currentOrganization.id, 'pending', 10);
      const processing = await aiReportsApi.listJobs(currentOrganization.id, 'processing', 10);
      return { jobs: [...pending.jobs, ...processing.jobs] };
    },
    enabled: !!currentOrganization?.id,
    staleTime: 1000 * 10,
    refetchInterval: 1000 * 30,
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

export type { AIReportResponse, AIProviderInfo, GenerateAIReportDto, DataAvailabilityResponse, CalibrationStatus, CalibrateRequest, FetchDataRequest, AIReportJob, AIReportJobStatus };
