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

export const useSubscription = () => {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['subscription', currentOrganization?.id],
    queryFn: async (): Promise<Subscription | null> => {
      if (!currentOrganization?.id) return null;

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .maybeSingle();

      console.log('📊 useSubscription query result:', {
        organizationId: currentOrganization.id,
        organizationName: currentOrganization.name,
        data,
        error,
        hasData: !!data
      });

      if (error) {
        console.error('Error fetching subscription:', error);
        return null;
      }

      return data as Subscription | null;
    },
    enabled: !!currentOrganization?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
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
