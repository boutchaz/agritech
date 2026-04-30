import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import {
  letterHeadsApi,
  LetterHead,
  CreateLetterHeadDto,
  UpdateLetterHeadDto,
} from '@/lib/api/letter-heads';

export type { LetterHead };

export function useLetterHeads() {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['letter-heads', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      try {
        return await letterHeadsApi.getAll(currentOrganization.id);
      } catch (error: unknown) {
        const status = (error as { status?: number; response?: { status?: number } })?.status
          || (error as { response?: { status?: number } })?.response?.status;
        if (status === 404 || status === 403) {
          console.warn('Letter heads endpoint not accessible - returning empty data');
          return [];
        }
        throw error;
      }
    },
    enabled: !!currentOrganization?.id,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useDefaultLetterHead() {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['letter-head', 'default', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      try {
        return await letterHeadsApi.getDefault(currentOrganization.id);
      } catch (error: unknown) {
        const status = (error as { status?: number; response?: { status?: number } })?.status
          || (error as { response?: { status?: number } })?.response?.status;
        if (status === 404 || status === 403) {
          console.warn('Default letter head not accessible - returning null');
          return null;
        }
        throw error;
      }
    },
    enabled: !!currentOrganization?.id,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useCreateLetterHead() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateLetterHeadDto) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      return letterHeadsApi.create(data, currentOrganization.id);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['letter-heads'] });
      if (data.is_default) {
        queryClient.invalidateQueries({ queryKey: ['letter-head', 'default'] });
      }
    },
  });
}

export function useUpdateLetterHead() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateLetterHeadDto }) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      return letterHeadsApi.update(id, updates, currentOrganization.id);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['letter-heads'] });
      queryClient.invalidateQueries({ queryKey: ['letter-head', data.id] });
      if (data.is_default) {
        queryClient.invalidateQueries({ queryKey: ['letter-head', 'default'] });
      }
    },
  });
}

export function useDeleteLetterHead() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      return letterHeadsApi.delete(id, currentOrganization.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['letter-heads'] });
    },
  });
}

export function useSetDefaultLetterHead() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      return letterHeadsApi.setDefault(id, currentOrganization.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['letter-heads'] });
      queryClient.invalidateQueries({ queryKey: ['letter-head', 'default'] });
    },
  });
}

export function useDuplicateLetterHead() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async ({ id, newName }: { id: string; newName?: string }) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      return letterHeadsApi.duplicate(id, newName, currentOrganization.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['letter-heads'] });
    },
  });
}
