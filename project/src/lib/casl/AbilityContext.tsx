import React, { createContext, useContext, useMemo } from 'react';
import { createContextualCan } from '@casl/react';
import { AbilityBuilder, createMongoAbility } from '@casl/ability';
import { useAuth } from '../../hooks/useAuth';
import { useSubscription, type Subscription } from '../../hooks/useSubscription';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api-client';
import { authApi, type UserAbilities } from '../api/auth';
import { defineAbilitiesFor, type AppAbility, type Action, type Subject } from './ability';
import { isSubscriptionValid } from '../polar';

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

// Extended subscription type with limit fields (from API response)
interface SubscriptionWithLimits extends Subscription {
  max_farms: number;
  max_parcels: number;
  max_users: number;
  max_satellite_reports: number;
  has_analytics: boolean;
  has_sensor_integration: boolean;
  has_advanced_reporting: boolean;
  has_api_access: boolean;
}

/**
 * Build CASL ability from backend abilities response
 * This creates an ability object from the server-provided rules
 */
function buildAbilityFromBackend(
  abilitiesData: UserAbilities,
  subscription: SubscriptionWithLimits | null,
  currentCounts: { farms: number; parcels: number; users: number; satelliteReports: number }
): AppAbility {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  // Apply abilities from backend
  for (const rule of abilitiesData.abilities) {
    if (rule.inverted) {
      cannot(rule.action as Action, rule.subject as Subject);
    } else {
      can(rule.action as Action, rule.subject as Subject);
    }
  }

  // Apply subscription-based limits (these are frontend concerns for UX)
  // The backend will still enforce these, but we want to show proper UI
  if (subscription) {
    // Align with polar.ts / billing: pending_renewal and grace periods count as usable
    if (!isSubscriptionValid(subscription)) {
      // Invalid or expired subscription - block mutating actions in the UI
      cannot('create', 'all');
      cannot('update', 'all');
      cannot('delete', 'all');
      can('read', 'Subscription');
    } else {
      // Apply limits based on current counts
      if (currentCounts.farms >= subscription.max_farms) {
        cannot('create', 'Farm');
      }
      if (currentCounts.parcels >= subscription.max_parcels) {
        cannot('create', 'Parcel');
      }
      if (currentCounts.users >= subscription.max_users) {
        cannot('invite', 'User');
        cannot('create', 'User');
      }
      if (currentCounts.satelliteReports >= subscription.max_satellite_reports) {
        cannot('create', 'SatelliteReport');
      }

      // Feature flags
      if (!subscription.has_analytics) {
        cannot('view_analytics', 'Analytics');
      }
      if (!subscription.has_sensor_integration) {
        cannot('read', 'Sensor');
        cannot('create', 'Sensor');
      }
      if (!subscription.has_advanced_reporting) {
        cannot('export', 'all');
      }
      if (!subscription.has_api_access) {
        cannot('access_api', 'API');
      }
    }
  }

  return build();
}

// Provider component
export const AbilityProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, currentOrganization, userRole } = useAuth();
  const { data: subscription } = useSubscription();

  // Fetch abilities from backend (source of truth)
  const { data: backendAbilities } = useQuery({
    queryKey: ['abilities', currentOrganization?.id],
    queryFn: async (): Promise<UserAbilities | null> => {
      if (!currentOrganization?.id) {
        return null;
      }

      try {
        return await authApi.getAbilities(currentOrganization.id);
      } catch (error) {
        console.error('Error fetching abilities from backend:', error);
        return null;
      }
    },
    enabled: !!currentOrganization?.id && !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

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
    const defaultCounts = { farms: 0, parcels: 0, users: 0, satelliteReports: 0 };

    if (!user || !currentOrganization || !userRole) {
      // Guest ability - can do nothing
      return defineAbilitiesFor({
        userId: '',
        organizationId: '',
        role: { name: 'viewer', level: 999 },
        subscription: null,
        currentCounts: defaultCounts,
      });
    }

    // Use backend abilities if available (source of truth)
    if (backendAbilities && backendAbilities.abilities.length > 0) {
      return buildAbilityFromBackend(
        backendAbilities,
        // Cast subscription to extended type - API returns additional limit fields
        (subscription as SubscriptionWithLimits | null) || null,
        currentCounts || defaultCounts
      );
    }

    // Fall back to local definition while loading or on error
    return defineAbilitiesFor({
      userId: user.id,
      organizationId: currentOrganization.id,
      role: {
        name: userRole.role_name,
        level: userRole.role_level,
      },
      subscription: subscription || null,
      currentCounts: currentCounts || defaultCounts,
    });
  }, [user, currentOrganization, userRole, subscription, currentCounts, backendAbilities]);

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
