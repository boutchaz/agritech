import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { calibrationApi,
type CalibrationStatusRecord,
type AnnualCampaignBilanResponse,
type AnnualEligibilityResponse,
type AnnualMissingTask,
type AnnualMissingTaskResolution,
type AnnualNewAnalysesResponse, } from '@/lib/api/calibration-output';
import { queryKeys } from '@/lib/query-keys';
import { useAuth } from './useAuth';

const STALE_TIME_MS = 5 * 60 * 1000;

export function useAnnualEligibility(parcelId: string) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: queryKeys.annual.eligibility(parcelId, currentOrganization?.id),
    queryFn: async (): Promise<AnnualEligibilityResponse> => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return calibrationApi.checkAnnualEligibility(parcelId, currentOrganization.id);
    },
    enabled: !!parcelId && !!currentOrganization?.id,
    staleTime: STALE_TIME_MS,
  });
}

export function useAnnualMissingTasks(parcelId: string) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: queryKeys.annual.missingTasks(parcelId, currentOrganization?.id),
    queryFn: async (): Promise<AnnualMissingTask[]> => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return calibrationApi.getAnnualMissingTasks(parcelId, currentOrganization.id);
    },
    enabled: !!parcelId && !!currentOrganization?.id,
    staleTime: STALE_TIME_MS,
  });
}

export function useAnnualNewAnalyses(parcelId: string) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: queryKeys.annual.newAnalyses(parcelId, currentOrganization?.id),
    queryFn: async (): Promise<AnnualNewAnalysesResponse> => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return calibrationApi.checkAnnualNewAnalyses(parcelId, currentOrganization.id);
    },
    enabled: !!parcelId && !!currentOrganization?.id,
    staleTime: STALE_TIME_MS,
  });
}

export function useAnnualCampaignBilan(parcelId: string) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: queryKeys.annual.campaignBilan(parcelId, currentOrganization?.id),
    queryFn: async (): Promise<AnnualCampaignBilanResponse> => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return calibrationApi.getAnnualCampaignBilan(parcelId, currentOrganization.id);
    },
    enabled: !!parcelId && !!currentOrganization?.id,
    staleTime: STALE_TIME_MS,
  });
}

export function useStartAnnualRecalibration(parcelId: string) {
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      dto: Record<string, unknown> = {},
    ): Promise<CalibrationStatusRecord> => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return calibrationApi.startAnnualRecalibration(
        parcelId,
        dto,
        currentOrganization.id,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.annual.eligibility(parcelId, currentOrganization?.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.annual.missingTasks(parcelId, currentOrganization?.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.annual.newAnalyses(parcelId, currentOrganization?.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.annual.campaignBilan(parcelId, currentOrganization?.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.calibration.status(parcelId, currentOrganization?.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.calibration.report(parcelId, currentOrganization?.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.calibration.phase(parcelId, currentOrganization?.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.calibration.history(parcelId, currentOrganization?.id),
      });
      queryClient.invalidateQueries({ queryKey: ['ai-calibration', parcelId] });
      toast.success('Recalibrage annuel lance.');
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Echec du lancement du recalibrage annuel',
      );
    },
  });
}

export function useResolveAnnualMissingTasks(parcelId: string) {
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (resolutions: AnnualMissingTaskResolution[]) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      return calibrationApi.resolveAnnualMissingTasks(
        parcelId,
        resolutions,
        currentOrganization.id,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.annual.missingTasks(parcelId, currentOrganization?.id),
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Echec de l enregistrement des taches annuelles',
      );
    },
  });
}

export function useSnoozeAnnualReminder(parcelId: string) {
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (days: number) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      return calibrationApi.snoozeAnnualReminder(
        parcelId,
        days,
        currentOrganization.id,
      );
    },
    onSuccess: (_data, days) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.annual.eligibility(parcelId, currentOrganization?.id),
      });
      toast.success(`Rappel programme dans ${days} jour(s).`);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Echec du report du rappel annuel',
      );
    },
  });
}
