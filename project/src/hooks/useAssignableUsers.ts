import { useQuery } from '@tanstack/react-query';
import { authSupabase } from '../lib/auth-supabase';

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
        const { data: viewData, error: viewError } = await authSupabase
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
          const { data: orgUsers, error: orgError } = await authSupabase
            .from('organization_users')
            .select(`
              user_id,
              role,
              organization_id
            `)
            .eq('organization_id', organizationId)
            .eq('is_active', true);

          console.log('useAssignableUsers: Organization users query result:', { orgUsers, orgError });

          if (orgError) {
            console.error('useAssignableUsers: Organization users query error:', orgError);
            throw orgError;
          }

          // Get user profiles for these users
          const userIds = orgUsers?.map(u => u.user_id) || [];
          console.log('useAssignableUsers: Found user IDs:', userIds);

          let profilesMap = new Map();
          if (userIds.length > 0) {
            const { data: profiles } = await authSupabase
              .from('user_profiles')
              .select('id, first_name, last_name')
              .in('id', userIds);

            console.log('useAssignableUsers: User profiles query result:', profiles);
            profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
          }

          // Get workers for these users
          let workersMap = new Map();
          if (userIds.length > 0) {
            const { data: workers } = await authSupabase
              .from('workers')
              .select('id, user_id, position')
              .in('user_id', userIds)
              .eq('is_active', true);

            console.log('useAssignableUsers: Workers query result:', workers);
            workersMap = new Map(workers?.map(w => [w.user_id, w]) || []);
          }

          // Combine the data - use actual roles from the database
          const assignableUsers: AssignableUser[] = (orgUsers || [])
            .filter(ou => ['admin', 'manager', 'member'].includes(ou.role)) // Use actual roles from schema
            .map(ou => {
              const profile = profilesMap.get(ou.user_id);
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
