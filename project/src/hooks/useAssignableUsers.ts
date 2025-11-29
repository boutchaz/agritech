import { useQuery } from '@tanstack/react-query';
import { organizationUsersApi, type AssignableUser } from '../lib/api/organization-users';
import { supabase } from '../lib/supabase';

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
        console.log('useAssignableUsers: No organizationId provided');
        return [];
      }

      console.log('useAssignableUsers: Fetching users for organization:', organizationId);

      try {
        const users = await organizationUsersApi.getAssignableUsers(organizationId);
        console.log('useAssignableUsers: API response:', users?.length, 'users');
        return users || [];
      } catch (error) {
        console.error('useAssignableUsers: API error:', error);
        throw error;
      }
    },
    enabled: !!organizationId,
  });
};

/**
 * Get tasks assigned to the current user
 */
export const useMyTasks = () => {
  return useQuery({
    queryKey: ['my-tasks'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .rpc('get_user_tasks', { user_uuid: user.id });

      if (error) throw error;
      return data || [];
    },
  });
};
