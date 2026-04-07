import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import {
  qualityControlApi,
  type QualityInspectionFilters,
  type InspectionStatus as QualityInspectionStatus,
} from '@/lib/api/quality-control';

export function useQualityInspections(filters: QualityInspectionFilters = {}) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['quality-inspections', currentOrganization?.id, filters],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        return { data: [], total: 0, page: 1, pageSize: 12, totalPages: 0 };
      }
      return qualityControlApi.getAll(currentOrganization.id, filters);
    },
    enabled: !!currentOrganization?.id,
    staleTime: 30 * 1000,
  });
}

export function useQualityInspection(id: string | undefined) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['quality-inspection', id],
    queryFn: async () => {
      if (!id || !currentOrganization?.id) throw new Error('ID and organization required');
      return qualityControlApi.getById(currentOrganization.id, id);
    },
    enabled: !!id && !!currentOrganization?.id,
  });
}

export function useQualityControlStats() {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['quality-control-stats', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) throw new Error('Organization required');
      return qualityControlApi.getStatistics(currentOrganization.id);
    },
    enabled: !!currentOrganization?.id,
    staleTime: 60 * 1000,
  });
}

export function useUpdateInspectionStatus() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: QualityInspectionStatus }) => {
      if (!currentOrganization?.id) throw new Error('Organization required');
      return qualityControlApi.updateStatus(currentOrganization.id, id, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality-inspections'] });
      queryClient.invalidateQueries({ queryKey: ['quality-control-stats'] });
    },
  });
}

export function useDeleteInspection() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!currentOrganization?.id) throw new Error('Organization required');
      return qualityControlApi.delete(currentOrganization.id, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality-inspections'] });
      queryClient.invalidateQueries({ queryKey: ['quality-control-stats'] });
    },
  });
}
