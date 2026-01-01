import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../components/MultiTenantAuthProvider';
import {
  organizationAISettingsApi,
  type AIProviderSettings,
  type UpsertAIProviderDto,
  type AIProviderType,
} from '../lib/api/organization-ai-settings';

/**
 * Hook to fetch AI provider settings for the organization
 */
export function useOrganizationAISettings() {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['organization-ai-settings', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return organizationAISettingsApi.getSettings(currentOrganization.id);
    },
    enabled: !!currentOrganization?.id,
  });
}

/**
 * Hook to upsert an AI provider configuration
 */
export function useUpsertAIProvider() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (data: UpsertAIProviderDto): Promise<AIProviderSettings> => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return organizationAISettingsApi.upsertProvider(data, currentOrganization.id);
    },
    onSuccess: () => {
      // Invalidate both AI settings and providers queries
      queryClient.invalidateQueries({
        queryKey: ['organization-ai-settings', currentOrganization?.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['ai-providers', currentOrganization?.id],
      });
    },
  });
}

/**
 * Hook to delete an AI provider configuration
 */
export function useDeleteAIProvider() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (provider: AIProviderType) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return organizationAISettingsApi.deleteProvider(provider, currentOrganization.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organization-ai-settings', currentOrganization?.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['ai-providers', currentOrganization?.id],
      });
    },
  });
}

/**
 * Hook to toggle provider enabled status
 */
export function useToggleAIProvider() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async ({
      provider,
      enabled,
    }: {
      provider: AIProviderType;
      enabled: boolean;
    }): Promise<AIProviderSettings> => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return organizationAISettingsApi.toggleProvider(
        provider,
        enabled,
        currentOrganization.id
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organization-ai-settings', currentOrganization?.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['ai-providers', currentOrganization?.id],
      });
    },
  });
}

export type { AIProviderSettings, AIProviderType };
