import React, { createContext, useContext, useMemo } from 'react';
import { createContextualCan } from '@casl/react';
import { useAuth } from '../../components/MultiTenantAuthProvider';
import { useSubscription } from '../../hooks/useSubscription';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api-client';
import { defineAbilitiesFor, type AppAbility } from './ability';

// Create CASL context
const AbilityContext = createContext<AppAbility | undefined>(undefined);

// Create Can component
export const Can = createContextualCan(AbilityContext.Consumer);

interface UsageCounts {
  farms_count: number;
  parcels_count: number;
  users_count: number;
  satellite_reports_count: number;
}

// Provider component
export const AbilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, currentOrganization, userRole } = useAuth();
  const { data: subscription } = useSubscription();

  // Fetch current usage counts from NestJS API
  const { data: currentCounts } = useQuery({
    queryKey: ['usage-counts', currentOrganization?.id],
    queryFn: async (): Promise<{ farms: number; parcels: number; users: number; satelliteReports: number }> => {
      if (!currentOrganization?.id) {
        return { farms: 0, parcels: 0, users: 0, satelliteReports: 0 };
      }

      try {
        // Call NestJS API endpoint to get usage counts
        const usageCounts = await apiClient.get<UsageCounts>(
          '/api/v1/subscriptions/usage',
          {},
          currentOrganization.id
        );

        return {
          farms: usageCounts.farms_count || 0,
          parcels: usageCounts.parcels_count || 0,
          users: usageCounts.users_count || 0,
          satelliteReports: usageCounts.satellite_reports_count || 0,
        };
      } catch (error) {
        console.error('Error fetching usage counts:', error);
        return { farms: 0, parcels: 0, users: 0, satelliteReports: 0 };
      }
    },
    enabled: !!currentOrganization?.id,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: false,
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
