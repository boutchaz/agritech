import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface AssignableUser {
  user_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  organization_id: string;
  role: string;
  worker_id: string | null;
  worker_position: string | null;
  user_type: 'worker' | 'user';
}

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

      // First, try the view if it exists
      try {
        const { data: viewData, error: viewError } = await supabase
          .from('assignable_users')
          .select('*')
          .eq('organization_id', organizationId)
          .order('last_name', { ascending: true });

        console.log('useAssignableUsers: View query result:', { viewData, viewError });

        if (!viewError && viewData && viewData.length > 0) {
          console.log('useAssignableUsers: Returning view data:', viewData.length, 'users');
          return viewData as AssignableUser[];
        }
      } catch (err) {
        console.warn('assignable_users view not found, using fallback query:', err);
      }

      // Fallback: Query organization users directly
      console.log('useAssignableUsers: Using fallback query for organization_users');
      const { data: orgUsers, error: orgError } = await supabase
        .from('organization_users')
        .select(`
          user_id,
          role,
          organization_id,
          user_profiles!inner (
            id,
            first_name,
            last_name
          )
        `)
        .eq('organization_id', organizationId);

      console.log('useAssignableUsers: Organization users query result:', { orgUsers, orgError });

      if (orgError) {
        console.error('useAssignableUsers: Organization users query error:', orgError);
        throw orgError;
      }

      // Get workers for these users
      const userIds = orgUsers?.map(u => u.user_id) || [];
      console.log('useAssignableUsers: Found user IDs:', userIds);

      let workersMap = new Map();
      if (userIds.length > 0) {
        const { data: workers } = await supabase
          .from('workers')
          .select('id, user_id, position')
          .in('user_id', userIds)
          .eq('is_active', true);

        console.log('useAssignableUsers: Workers query result:', workers);
        workersMap = new Map(workers?.map(w => [w.user_id, w]) || []);
      }

      // Combine the data
      const assignableUsers: AssignableUser[] = (orgUsers || [])
        .filter(ou => ['organization_admin', 'farm_manager', 'farm_worker', 'day_laborer'].includes(ou.role))
        .map(ou => {
          const profile = ou.user_profiles as any;
          const worker = workersMap.get(ou.user_id);

          return {
            user_id: ou.user_id,
            first_name: profile?.first_name || '',
            last_name: profile?.last_name || '',
            full_name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim(),
            organization_id: ou.organization_id,
            role: ou.role,
            worker_id: worker?.id || null,
            worker_position: worker?.position || null,
            user_type: worker ? 'worker' as const : 'user' as const,
          };
        })
        .sort((a, b) => a.last_name.localeCompare(b.last_name));

      console.log('useAssignableUsers: Final assignable users:', assignableUsers);
      return assignableUsers;
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
