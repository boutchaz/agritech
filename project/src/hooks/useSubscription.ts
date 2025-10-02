import React, { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/MultiTenantAuthProvider';
import type { PlanType } from '../lib/polar';

export interface Subscription {
  id: string;
  organization_id: string;
  polar_subscription_id: string | null;
  polar_customer_id: string | null;
  polar_product_id: string | null;
  plan_type: PlanType;
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'paused';
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  max_farms: number;
  max_parcels: number;
  max_users: number;
  max_satellite_reports: number;
  has_analytics: boolean;
  has_sensor_integration: boolean;
  has_ai_recommendations: boolean;
  has_advanced_reporting: boolean;
  has_api_access: boolean;
  has_priority_support: boolean;
  metadata: Record<string, any>;
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

  console.log('🔍 useSubscription HOOK CALLED:', {
    currentOrganization: currentOrganization?.name,
    orgId,
    hasOrgId: !!currentOrganization?.id,
    queryKey: ['subscription', orgId]
  });

  const query = useQuery({
    queryKey: ['subscription', orgId],
    queryFn: async (): Promise<Subscription | null> => {
      console.log('🔥 queryFn EXECUTING for org:', orgId);

      // Fetch the organization ID directly - don't rely on closure
      if (orgId === 'none') {
        console.log('📊 useSubscription: No organization yet');
        return null;
      }

      console.log('📊 useSubscription: Fetching subscription for org:', orgId);

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('organization_id', orgId)
        .maybeSingle();

      console.log('📊 useSubscription query result:', {
        organizationId: orgId,
        data,
        error,
        hasData: !!data,
        dataStatus: data?.status,
        dataEndDate: data?.current_period_end
      });

      if (error) {
        console.error('❌ Error fetching subscription:', error);
        return null;
      }

      if (!data) {
        console.warn('⚠️ No subscription found for organization:', orgId);
      }

      return data as Subscription | null;
    },
    staleTime: 0, // Disable caching
    gcTime: 0, // Don't keep in cache after unmount (was cacheTime in v4)
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Force invalidation and refetch when organization changes
  useEffect(() => {
    if (orgId !== 'none') {
      console.log('🔄 Organization changed to:', orgId, '- invalidating and refetching');
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

      const { data, error } = await supabase
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

      const { data, error } = await supabase
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
