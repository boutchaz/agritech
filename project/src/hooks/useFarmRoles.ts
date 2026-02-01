import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { farmRolesApi, type AssignFarmRoleInput } from '@/lib/api/farm-roles';
import { toast } from 'sonner';

export type { FarmRole, FarmPermission, OrganizationUser, AssignFarmRoleInput } from '@/lib/api/farm-roles';

export function useFarmRoles(farmId: string | null) {
  return useQuery({
    queryKey: ['farm-roles', farmId],
    queryFn: () => farmRolesApi.getRolesForFarm(farmId!),
    enabled: !!farmId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useFarmPermissions() {
  return useQuery({
    queryKey: ['farm-permissions'],
    queryFn: () => farmRolesApi.getAvailableRoles(),
    staleTime: 10 * 60 * 1000,
  });
}

export function useOrganizationUsersForFarm(farmId: string | null) {
  return useQuery({
    queryKey: ['organization-users-for-farm', farmId],
    queryFn: () => farmRolesApi.getOrganizationUsersForFarm(farmId!),
    enabled: !!farmId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAssignFarmRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AssignFarmRoleInput) => farmRolesApi.assignRole(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['farm-roles', variables.farm_id] });
      toast.success('Role assigned successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to assign role: ${error.message}`);
    },
  });
}

export function useRemoveFarmRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roleId, farmId }: { roleId: string; farmId: string }) => 
      farmRolesApi.removeRole(roleId, farmId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['farm-roles', variables.farmId] });
      toast.success('Role removed successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove role: ${error.message}`);
    },
  });
}
