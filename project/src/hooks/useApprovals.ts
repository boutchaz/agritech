import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { stockEntriesApi } from '../lib/api/stock';

export function usePendingApprovals() {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['stock-approvals-pending', currentOrganization?.id],
    queryFn: () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return stockEntriesApi.getPendingApprovals(currentOrganization.id);
    },
    enabled: !!currentOrganization?.id,
  });
}

export function useApproveEntry() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (approvalId: string) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return stockEntriesApi.approveEntry(approvalId, currentOrganization.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-approvals-pending', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['stock-entries', currentOrganization?.id] });
    },
  });
}

export function useRejectEntry() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async ({ approvalId, reason }: { approvalId: string; reason: string }) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return stockEntriesApi.rejectEntry(approvalId, reason, currentOrganization.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-approvals-pending', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['stock-entries', currentOrganization?.id] });
    },
  });
}
