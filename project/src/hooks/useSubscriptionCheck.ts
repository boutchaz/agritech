import { useQuery } from '@tanstack/react-query';
import { authSupabase } from '../lib/auth-supabase';
import { useAuth } from '../hooks/useAuth';

export interface SubscriptionCheckResponse {
  isValid: boolean;
  subscription: Record<string, unknown> | null;
  hasFeature?: boolean;
  reason?:
    | 'no_subscription'
    | 'canceled'
    | 'past_due'
    | 'expired'
    | 'suspended'
    | 'terminated';
  usage?: {
    hectares: { current: number; max: number | null; allowed: boolean };
    users: { current: number; max: number | null; allowed: boolean };
    farms: { current: number; max: number | null; allowed: boolean };
    parcels: { current: number; max: number | null; allowed: boolean };
  };
}

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
        const {
          data: { session },
        } = await authSupabase.auth.getSession();
        if (!session?.access_token) {
          return {
            isValid: false,
            subscription: null,
            reason: 'no_subscription',
          };
        }

        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const response = await fetch(`${apiUrl}/api/v1/subscriptions/check`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            'X-Organization-Id': currentOrganization.id,
          },
          body: JSON.stringify({
            organizationId: currentOrganization.id,
            feature,
          }),
        });

        if (!response.ok) {
          return {
            isValid: false,
            subscription: null,
            reason: 'no_subscription',
          };
        }

        const data = await response.json();
        if (!data || typeof data.isValid !== 'boolean') {
          return {
            isValid: false,
            subscription: null,
            reason: 'no_subscription',
          };
        }

        return data as SubscriptionCheckResponse;
      } catch (error) {
        console.error('❌ Failed to check subscription:', error);
        return {
          isValid: false,
          subscription: null,
          reason: 'no_subscription',
        };
      }
    },
    enabled: !!currentOrganization?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useCanCreateResource = (resourceType: 'farm' | 'parcel' | 'user') => {
  const { data: subscriptionCheck, isLoading } = useSubscriptionCheck();

  const canCreate = subscriptionCheck?.usage
    ? resourceType === 'farm'
      ? subscriptionCheck.usage.farms.allowed
      : resourceType === 'parcel'
        ? subscriptionCheck.usage.parcels.allowed
        : subscriptionCheck.usage.users.allowed
    : false;

  return {
    canCreate,
    isLoading,
    usage: subscriptionCheck?.usage,
  };
};

export const useHasFeature = (feature: string) => {
  const { data: subscriptionCheck, isLoading } = useSubscriptionCheck(feature);

  return {
    hasAccess: subscriptionCheck?.hasFeature ?? false,
    isLoading,
    subscription: subscriptionCheck?.subscription,
  };
};
