import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  structuresApi,
  type Structure,
  type CreateStructureInput,
  type UpdateStructureInput,
} from '../lib/api/structures';
import { useAuth } from '../hooks/useAuth';

export const useStructures = () => {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['structures', currentOrganization?.id],
    queryFn: async (): Promise<Structure[]> => {
      if (!currentOrganization?.id) return [];
      return structuresApi.getAll(undefined, currentOrganization.id);
    },
    enabled: !!currentOrganization?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useStructure = (id: string | undefined) => {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['structures', currentOrganization?.id, id],
    queryFn: async (): Promise<Structure | null> => {
      if (!currentOrganization?.id || !id) return null;
      return structuresApi.getOne(id, currentOrganization.id);
    },
    enabled: !!currentOrganization?.id && !!id,
    staleTime: 2 * 60 * 1000,
  });
};

export const useCreateStructure = () => {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateStructureInput) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return structuresApi.create(data, currentOrganization.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['structures', currentOrganization?.id] });
    },
  });
};

export const useUpdateStructure = () => {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateStructureInput }) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return structuresApi.update(id, data, currentOrganization.id);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['structures', currentOrganization?.id] });
      queryClient.invalidateQueries({
        queryKey: ['structures', currentOrganization?.id, variables.id],
      });
    },
  });
};

export const useDeleteStructure = () => {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return structuresApi.delete(id, currentOrganization.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['structures', currentOrganization?.id] });
    },
  });
};
