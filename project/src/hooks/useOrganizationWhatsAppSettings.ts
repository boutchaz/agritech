import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import {
  organizationWhatsAppSettingsApi,
  type TestWhatsAppPayload,
  type TestWhatsAppResult,
  type UpsertWhatsAppSettingsDto,
  type WhatsAppSettings,
} from '../lib/api/organization-whatsapp-settings';

const queryKey = (orgId: string | null | undefined) => [
  'organization-whatsapp-settings',
  orgId,
];

export function useOrganizationWhatsAppSettings() {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: queryKey(currentOrganization?.id),
    queryFn: async (): Promise<WhatsAppSettings> => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return organizationWhatsAppSettingsApi.get(currentOrganization.id);
    },
    enabled: !!currentOrganization?.id,
  });
}

export function useUpsertWhatsAppSettings() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (
      data: UpsertWhatsAppSettingsDto,
    ): Promise<WhatsAppSettings> => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return organizationWhatsAppSettingsApi.upsert(
        data,
        currentOrganization.id,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKey(currentOrganization?.id),
      });
    },
  });
}

export function useDeleteWhatsAppSettings() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return organizationWhatsAppSettingsApi.remove(currentOrganization.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKey(currentOrganization?.id),
      });
    },
  });
}

export function useTestWhatsAppSettings() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (
      payload: TestWhatsAppPayload,
    ): Promise<TestWhatsAppResult> => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return organizationWhatsAppSettingsApi.test(
        payload,
        currentOrganization.id,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKey(currentOrganization?.id),
      });
    },
  });
}
