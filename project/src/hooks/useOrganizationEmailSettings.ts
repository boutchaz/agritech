import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import {
  organizationEmailSettingsApi,
  type EmailSettings,
  type TestEmailResult,
  type UpsertEmailSettingsDto,
} from '../lib/api/organization-email-settings';

const queryKey = (orgId: string | null | undefined) => [
  'organization-email-settings',
  orgId,
];

export function useOrganizationEmailSettings() {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: queryKey(currentOrganization?.id),
    queryFn: async (): Promise<EmailSettings> => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return organizationEmailSettingsApi.get(currentOrganization.id);
    },
    enabled: !!currentOrganization?.id,
  });
}

export function useUpsertEmailSettings() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (data: UpsertEmailSettingsDto): Promise<EmailSettings> => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return organizationEmailSettingsApi.upsert(data, currentOrganization.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKey(currentOrganization?.id),
      });
    },
  });
}

export function useDeleteEmailSettings() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return organizationEmailSettingsApi.remove(currentOrganization.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKey(currentOrganization?.id),
      });
    },
  });
}

export function useTestEmailSettings() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (to: string): Promise<TestEmailResult> => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return organizationEmailSettingsApi.test(to, currentOrganization.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKey(currentOrganization?.id),
      });
    },
  });
}
