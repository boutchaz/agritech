import { useQuery } from '@tanstack/react-query';
import { authSupabase } from '../lib/auth-supabase';
import { useAuth } from '../components/MultiTenantAuthProvider';

export interface SubscriptionCheckResponse {
  isValid: boolean;
  subscription: Record<string, unknown> | null;
  hasFeature?: boolean;
  reason?: 'no_subscription' | 'canceled' | 'past_due' | 'expired';
  usage?: {
    farms: { current: number; max: number; canCreate: boolean };
    parcels: { current: number; max: number; canCreate: boolean };
    users: { current: number; max: number; canAdd: boolean };
  };
}

/**
 * Hook to check subscription status using NestJS API
 * This offloads all validation logic to the backend
 */
export const useSubscriptionCheck = (feature?: string) => {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['subscription-check', currentOrganization?.id, feature],
    queryFn: async (): Promise<SubscriptionCheckResponse> => {
      if (!currentOrganization?.id) {
        return {
          isValid: false,
          subscription: null,
          reason: 'no_subscription',
        };
      }

      try {
        // Get the access token from the current session
        const { data: { session } } = await authSupabase.auth.getSession();
        if (!session?.access_token) {
          console.error('❌ Not authenticated');
          return {
            isValid: false,
            subscription: null,
            reason: 'no_subscription',
          };
        }

        // Call NestJS API to check subscription
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const response = await fetch(`${apiUrl}/api/v1/subscriptions/check`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            organizationId: currentOrganization.id,
            feature,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('❌ Subscription check error:', errorData);
          // On error, block access (fail closed)
          return {
            isValid: false,
            subscription: null,
            reason: 'no_subscription',
          };
        }

        const data = await response.json();

        // Ensure we have a valid response
        if (!data || typeof data.isValid !== 'boolean') {
          console.error('❌ Invalid response from subscription check:', data);
          return {
            isValid: false,
            subscription: null,
            reason: 'no_subscription',
          };
        }

        return data as SubscriptionCheckResponse;
      } catch (error) {
        console.error('❌ Failed to check subscription:', error);
        // On exception, block access (fail closed)
        return {
          isValid: false,
          subscription: null,
          reason: 'no_subscription',
        };
      }
    },
    enabled: !!currentOrganization?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Hook to check if organization can create a specific resource
 */
export const useCanCreateResource = (resourceType: 'farm' | 'parcel' | 'user') => {
  const { data: subscriptionCheck, isLoading } = useSubscriptionCheck();

  const canCreate = subscriptionCheck?.usage
    ? resourceType === 'farm'
      ? subscriptionCheck.usage.farms.canCreate
      : resourceType === 'parcel'
      ? subscriptionCheck.usage.parcels.canCreate
      : subscriptionCheck.usage.users.canAdd
    : false;

  return {
    canCreate,
    isLoading,
    usage: subscriptionCheck?.usage,
  };
};

/**
 * Hook to check if organization has access to a feature
 */
export const useHasFeature = (feature: string) => {
  const { data: subscriptionCheck, isLoading } = useSubscriptionCheck(feature);

  return {
    hasAccess: subscriptionCheck?.hasFeature ?? false,
    isLoading,
    subscription: subscriptionCheck?.subscription,
  };
};
