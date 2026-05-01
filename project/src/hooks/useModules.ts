import { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { modulesApi, type UpdateModuleInput } from '../lib/api/modules';
import { useAuth } from '../hooks/useAuth';
import { useModuleConfig, MODULE_CONFIG_QUERY_KEY } from './useModuleConfig';
import type { ModuleConfig } from '@/lib/api/module-config';

/**
 * Returns modules with org activation state. Thin derivation over
 * useModuleConfig — single underlying request.
 */
export const useModules = () => {
  const query = useModuleConfig();
  const data = useMemo<ModuleConfig[]>(() => query.data?.modules ?? [], [query.data]);
  return { ...query, data };
};

export const useUpdateModule = () => {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async ({
      moduleId,
      data,
    }: {
      moduleId: string;
      data: UpdateModuleInput;
    }) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      // Validate that organizationId is a string
      if (typeof currentOrganization.id !== 'string') {
        console.error('[useUpdateModule] ERROR: currentOrganization.id is not a string!', {
          id: currentOrganization.id,
          type: typeof currentOrganization.id,
          currentOrganization
        });
        throw new Error(`Invalid organization ID: expected string, got ${typeof currentOrganization.id}`);
      }

      return modulesApi.update(currentOrganization.id, moduleId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MODULE_CONFIG_QUERY_KEY });
    },
  });
};
