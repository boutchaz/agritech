import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import {
  subscriptionsService,
  type Subscription,
  type SubscriptionUsage,
} from '../services/subscriptionsService';
export type {
  Subscription,
  SubscriptionUsage,
} from '../services/subscriptionsService';

export const useSubscription = (
  organizationOverride?: { id: string; name: string } | null,
) => {
  const authContext = useAuth();
  const queryClient = useQueryClient();

  const currentOrganization =
    organizationOverride !== undefined
      ? organizationOverride
      : authContext.currentOrganization;

  const orgId = currentOrganization?.id || 'none';

  const query = useQuery({
    queryKey: ['subscription', orgId],
    queryFn: async (): Promise<Subscription | null> => {
      if (orgId === 'none') {
        return null;
      }

      try {
        return await subscriptionsService.getCurrentSubscription(orgId);
      } catch (error) {
        console.error('[useSubscription] Error in queryFn:', error);

        if (
          error instanceof Error &&
          (error.message?.includes('Failed to fetch') ||
            error.message?.includes('NetworkError') ||
            error.message?.includes('Network request failed'))
        ) {
          throw error;
        }

        if (error instanceof Error && error.message?.includes('404')) {
          return null;
        }

        if (
          error instanceof Error &&
          (error.message?.includes('403') ||
            error.message?.includes('Forbidden') ||
            error.message?.includes('permission'))
        ) {
          throw error;
        }

        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      if (
        failureCount < 3 &&
        error instanceof Error &&
        (error.message?.includes('Failed to fetch') ||
          error.message?.includes('NetworkError') ||
          error.message?.includes('Network request failed') ||
          error.message?.includes('403') ||
          error.message?.includes('Forbidden'))
      ) {
        return true;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 3000),
  });

  useEffect(() => {
    if (orgId !== 'none') {
      queryClient.invalidateQueries({ queryKey: ['subscription', orgId] });
    }
  }, [orgId, queryClient]);

  return query;
};

export const useSubscriptionUsage = () => {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['subscription-usage', currentOrganization?.id],
    queryFn: async (): Promise<SubscriptionUsage | null> => {
      if (!currentOrganization?.id) return null;

      try {
        return await subscriptionsService.getUsage(currentOrganization.id);
      } catch (error) {
        console.error('Error fetching subscription usage:', error);
        return null;
      }
    },
    enabled: !!currentOrganization?.id,
    staleTime: 60 * 1000,
  });
};
