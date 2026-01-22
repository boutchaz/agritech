import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { costCentersApi, type CostCenterFilters, type CreateCostCenterInput, type UpdateCostCenterInput } from '../lib/api/cost-centers';

export interface CostCenter {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  farm_id: string | null;
  parcel_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

/**
 * Hook to fetch all cost centers
 */
export function useCostCenters(filters?: CostCenterFilters) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['cost-centers', currentOrganization?.id, filters],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      const data = await costCentersApi.getAll(filters);
      return data as CostCenter[];
    },
    enabled: !!currentOrganization?.id,
  });
}

/**
 * Hook to fetch a single cost center
 */
export function useCostCenter(costCenterId: string | null) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['cost-center', costCenterId],
    queryFn: async () => {
      if (!costCenterId) throw new Error('Cost center ID is required');
      const data = await costCentersApi.getOne(costCenterId);
      return data as CostCenter;
    },
    enabled: !!costCenterId && !!currentOrganization?.id,
  });
}

/**
 * Hook to create a new cost center
 */
export function useCreateCostCenter() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateCostCenterInput) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return costCentersApi.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-centers', currentOrganization?.id] });
    },
  });
}

/**
 * Hook to update a cost center
 */
export function useUpdateCostCenter() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateCostCenterInput }) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return costCentersApi.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-centers', currentOrganization?.id] });
    },
  });
}

/**
 * Hook to delete a cost center
 */
export function useDeleteCostCenter() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return costCentersApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-centers', currentOrganization?.id] });
    },
  });
}
