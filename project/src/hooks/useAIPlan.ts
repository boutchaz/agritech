import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import i18n from '@/i18n/config';
import { useAuth } from './useAuth';
import {
  aiPlanApi,
  type AIPlan,
  type AIPlanIntervention,
  type AIPlanSummary,
} from '../lib/api/ai-plan';

export function useAIPlan(parcelId: string) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['ai-plan', parcelId, currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return aiPlanApi.getAIPlan(parcelId, currentOrganization.id);
    },
    enabled: !!parcelId && !!currentOrganization?.id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAIPlanInterventions(parcelId: string) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['ai-plan-interventions', parcelId, currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return aiPlanApi.getAIPlanInterventions(parcelId, currentOrganization.id);
    },
    enabled: !!parcelId && !!currentOrganization?.id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAIPlanSummary(parcelId: string, enabled = true) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['ai-plan-summary', parcelId, currentOrganization?.id],
    queryFn: async (): Promise<AIPlanSummary> => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return aiPlanApi.getAIPlanSummary(parcelId, currentOrganization.id);
    },
    enabled: enabled && !!parcelId && !!currentOrganization?.id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useValidateAIPlan(parcelId: string) {
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<AIPlan> => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return aiPlanApi.validateAIPlan(parcelId, currentOrganization.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-plan', parcelId, currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['ai-plan-summary', parcelId, currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['ai-plan-interventions', parcelId, currentOrganization?.id] });
      toast.success(i18n.t('toasts.calendarConfirmed', { ns: 'ai' }));
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : i18n.t('toasts.calendarConfirmError', { ns: 'ai' }),
      );
    },
  });
}

export function useExecuteAIPlanIntervention() {
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<AIPlanIntervention> => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return aiPlanApi.executeAIPlanIntervention(id, currentOrganization.id);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['ai-plan-interventions', data.parcel_id, currentOrganization?.id],
      });
    },
  });
}

export function useRegenerateAIPlan() {
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (parcelId: string): Promise<AIPlan> => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return aiPlanApi.regenerateAIPlan(parcelId, currentOrganization.id);
    },
    onSuccess: (_, parcelId) => {
      queryClient.invalidateQueries({ queryKey: ['ai-plan', parcelId, currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['ai-plan-summary', parcelId, currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['ai-plan-interventions', parcelId, currentOrganization?.id] });
      toast.success(i18n.t('toasts.calendarUpdated', { ns: 'ai' }));
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : i18n.t('toasts.calendarRecalcError', { ns: 'ai' }),
      );
    },
  });
}

/** Creates the annual plan when missing (e.g. post-activation job failed). Idempotent if a plan already exists. */
export function useEnsureAIPlan(parcelId: string) {
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<AIPlan> => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return aiPlanApi.ensureAIPlan(parcelId, currentOrganization.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-plan', parcelId, currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['ai-plan-summary', parcelId, currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['ai-plan-interventions', parcelId, currentOrganization?.id] });
      toast.success(i18n.t('toasts.calendarReady', { ns: 'ai' }));
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : i18n.t('toasts.ensurePlanError', { ns: 'ai' }),
      );
    },
  });
}
