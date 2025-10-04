import React, { createContext, useContext, useMemo } from 'react';
import { createContextualCan } from '@casl/react';
import { useAuth } from '../../components/MultiTenantAuthProvider';
import { useSubscription } from '../../hooks/useSubscription';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { defineAbilitiesFor, type AppAbility } from './ability';

// Create CASL context
const AbilityContext = createContext<AppAbility | undefined>(undefined);

// Create Can component
export const Can = createContextualCan(AbilityContext.Consumer);

// Provider component
export const AbilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, currentOrganization, userRole } = useAuth();
  const { data: subscription } = useSubscription();

  // Fetch current usage counts
  const { data: currentCounts } = useQuery({
    queryKey: ['usage-counts', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        return { farms: 0, parcels: 0, users: 0, satelliteReports: 0 };
      }

      // Get farms count
      const { count: farmsCount } = await supabase
        .from('farms')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', currentOrganization.id);

      // Get parcels count - first get farm IDs, then count parcels
      const { data: farms } = await supabase
        .from('farms')
        .select('id')
        .eq('organization_id', currentOrganization.id);
      
      const farmIds = farms?.map(f => f.id) || [];
      let parcelsCount = 0;
      
      if (farmIds.length > 0) {
        const { count } = await supabase
          .from('parcels')
          .select('*', { count: 'exact', head: true })
          .in('farm_id', farmIds);
        parcelsCount = count || 0;
      }

      // Get users count
      const { count: usersCount } = await supabase
        .from('organization_users')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', currentOrganization.id)
        .eq('is_active', true);

      // Get satellite indices data count for current period
      const { count: reportsCount } = await supabase
        .from('satellite_indices_data')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', currentOrganization.id)
        .gte('created_at', subscription?.current_period_start || new Date().toISOString());

      return {
        farms: farmsCount || 0,
        parcels: parcelsCount || 0,
        users: usersCount || 0,
        satelliteReports: reportsCount || 0,
      };
    },
    enabled: !!currentOrganization?.id,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });

  // Build ability based on user context
  const ability = useMemo(() => {
    if (!user || !currentOrganization || !userRole) {
      // Guest ability - can do nothing
      return defineAbilitiesFor({
        userId: '',
        organizationId: '',
        role: { name: 'viewer', level: 999 },
        subscription: null,
        currentCounts: { farms: 0, parcels: 0, users: 0, satelliteReports: 0 },
      });
    }

    return defineAbilitiesFor({
      userId: user.id,
      organizationId: currentOrganization.id,
      role: {
        name: userRole.role_name,
        level: userRole.role_level,
      },
      subscription: subscription || null,
      currentCounts: currentCounts || { farms: 0, parcels: 0, users: 0, satelliteReports: 0 },
    });
  }, [user, currentOrganization, userRole, subscription, currentCounts]);

  return <AbilityContext.Provider value={ability}>{children}</AbilityContext.Provider>;
};

// Hook to use ability
export const useAbility = () => {
  const ability = useContext(AbilityContext);
  if (!ability) {
    throw new Error('useAbility must be used within AbilityProvider');
  }
  return ability;
};

// Hook for checking specific permissions
export const useCan = () => {
  const ability = useAbility();

  return {
    can: ability.can.bind(ability),
    cannot: ability.cannot.bind(ability),
  };
};
