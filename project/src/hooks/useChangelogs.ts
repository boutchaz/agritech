import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { changelogsApi, type CreateChangelogInput, type UpdateChangelogInput } from '@/lib/api/changelogs';
import { useAuth } from '@/hooks/useAuth';

export function useChangelogs() {
  const { currentOrganization } = useAuth();
  return useQuery({
    queryKey: ['changelogs', currentOrganization?.id],
    queryFn: async () => {
      const res = await changelogsApi.getAll(currentOrganization!.id);
      return (res as any)?.data || [];
    },
    enabled: !!currentOrganization?.id,
    staleTime: 10 * 60 * 1000,
  });
}

export function useCreateChangelog() {
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateChangelogInput) => changelogsApi.create(data, currentOrganization!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['changelogs'] });
    },
  });
}

export function useUpdateChangelog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateChangelogInput }) =>
      changelogsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['changelogs'] });
    },
  });
}

export function useDeleteChangelog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => changelogsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['changelogs'] });
    },
  });
}
