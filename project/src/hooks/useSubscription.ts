import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authSupabase } from '../lib/auth-supabase';
import { useAuth } from '../components/MultiTenantAuthProvider';
import type { PlanType } from '../lib/polar';

export interface Subscription {
  id: string;
  organization_id: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'paused';
  plan_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionUsage {
  id: string;
  subscription_id: string;
  organization_id: string;
  farms_count: number;
  parcels_count: number;
  users_count: number;
  satellite_reports_count: number;
  period_start: string;
  period_end: string;
  created_at: string;
  updated_at: string;
}

export const useSubscription = (organizationOverride?: { id: string; name: string } | null) => {
  const authContext = useAuth();
  const queryClient = useQueryClient();

  // Use override if provided (for use in AuthProvider), otherwise use context
  const currentOrganization = organizationOverride !== undefined ? organizationOverride : authContext.currentOrganization;

  const orgId = currentOrganization?.id || 'none';

  const query = useQuery({
    queryKey: ['subscription', orgId],
    queryFn: async (): Promise<Subscription | null> => {
      if (orgId === 'none') {
        return null;
      }

      const { data, error } = await authSupabase
        .from('subscriptions')
        .select('id, organization_id, status, plan_id, current_period_start, current_period_end, cancel_at_period_end, created_at, updated_at')
        .eq('organization_id', orgId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching subscription:', error);
        return null;
      }

      return data as Subscription | null;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Force invalidation and refetch when organization changes
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

      const { data, error } = await authSupabase
        .from('subscription_usage')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching subscription usage:', error);
        return null;
      }

      return data as SubscriptionUsage | null;
    },
    enabled: !!currentOrganization?.id,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

export const useUpdateSubscription = () => {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async ({
      planType,
      polarSubscriptionId,
    }: {
      planType: PlanType;
      polarSubscriptionId?: string;
    }) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      const updateData: any = {
        plan_type: planType,
        status: 'active',
        updated_at: new Date().toISOString(),
      };

      if (polarSubscriptionId) {
        updateData.polar_subscription_id = polarSubscriptionId;
      }

      const { data, error } = await authSupabase
        .from('subscriptions')
        .update(updateData)
        .eq('organization_id', currentOrganization.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription', currentOrganization?.id] });
    },
  });
};
