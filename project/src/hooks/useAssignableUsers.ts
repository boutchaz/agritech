import { useQuery } from '@tanstack/react-query';
import { organizationUsersApi, type AssignableUser } from '../lib/api/organization-users';
import { tasksApi } from '../lib/api/tasks';

export type { AssignableUser };

/**
 * Fetch all users who can be assigned to tasks in an organization
 * This includes both platform users and workers with platform access
 */
export const useAssignableUsers = (organizationId: string | null) => {
  return useQuery({
    queryKey: ['assignable-users', organizationId],
    queryFn: async () => {
      if (!organizationId) {
        return [];
      }

      try {
        const users = await organizationUsersApi.getAssignableUsers(organizationId);
        return users || [];
      } catch (error) {
        console.error('useAssignableUsers: API error:', error);
        throw error;
      }
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Get tasks assigned to the current user across all organizations
 */
export const useMyTasks = () => {
  return useQuery({
    queryKey: ['my-tasks'],
    queryFn: async () => {
      const tasks = await tasksApi.getMyTasks();
      return tasks || [];
    },
    staleTime: 2 * 60 * 1000,
  });
};
