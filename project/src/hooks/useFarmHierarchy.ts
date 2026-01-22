import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { farmHierarchyApi, type HierarchyFarm, type UserFarmRole } from '@/lib/api/farm-hierarchy';

export type { HierarchyFarm, UserFarmRole } from '@/lib/api/farm-hierarchy';

export function useFarmHierarchy(organizationId?: string) {
  const { currentOrganization } = useAuth();
  const orgId = organizationId || currentOrganization?.id;

  return useQuery({
    queryKey: ['farm-hierarchy', orgId],
    queryFn: () => farmHierarchyApi.getOrganizationFarms(orgId!),
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUserFarmRoles(userId: string | null, farms: HierarchyFarm[] = []) {
  const { currentOrganization } = useAuth();
  const organizationId = currentOrganization?.id;

  return useQuery({
    queryKey: ['user-farm-roles', userId, organizationId],
    queryFn: async (): Promise<UserFarmRole[]> => {
      if (!userId) return [];
      
      try {
        const roles = await farmHierarchyApi.getUserFarmRoles(userId);
        if (roles.length > 0) {
          return roles;
        }
      } catch {
      }
      
      if (organizationId && farms.length > 0) {
        return farmHierarchyApi.getBasicUserRoles(organizationId, userId, farms);
      }
      
      return [];
    },
    enabled: !!userId && !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}
