import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { modulesApi, type OrganizationModule, type UpdateModuleInput } from '../lib/api/modules';
import { useAuth } from '../hooks/useAuth';

export const useModules = () => {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['modules', currentOrganization?.id],
    queryFn: async (): Promise<OrganizationModule[]> => {
      if (!currentOrganization?.id) return [];
      return modulesApi.getAll(undefined, currentOrganization.id);
    },
    enabled: !!currentOrganization?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
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
      queryClient.invalidateQueries({ queryKey: ['modules', currentOrganization?.id] });
    },
  });
};
