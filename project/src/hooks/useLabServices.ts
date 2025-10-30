import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import type { Tables, InsertDto, UpdateDto } from '../types/database.types';

type LabServiceProvider = Tables<'lab_service_providers'>;
type LabServiceType = Tables<'lab_service_types'>;
type LabServiceOrder = Tables<'lab_service_orders'>;
type LabResultParameter = Tables<'lab_result_parameters'>;
type LabServiceRecommendation = Tables<'lab_service_recommendations'>;
type SampleCollectionSchedule = Tables<'sample_collection_schedules'>;

export type OrderStatus = 'pending' | 'sample_collected' | 'sent_to_lab' | 'in_progress' | 'completed' | 'cancelled';
export type ServiceCategory = 'soil' | 'leaf' | 'water' | 'tissue' | 'other';

/**
 * Fetch all active lab service providers
 */
export function useLabServiceProviders() {
  return useQuery({
    queryKey: ['lab-service-providers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lab_service_providers')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as LabServiceProvider[];
    },
  });
}

/**
 * Fetch lab service types for a specific provider
 */
export function useLabServiceTypes(providerId?: string, category?: ServiceCategory) {
  return useQuery({
    queryKey: ['lab-service-types', providerId, category],
    queryFn: async () => {
      let query = supabase
        .from('lab_service_types')
        .select('*, provider:lab_service_providers(*)')
        .eq('is_active', true);

      if (providerId) {
        query = query.eq('provider_id', providerId);
      }
      if (category) {
        query = query.eq('category', category);
      }

      query = query.order('category').order('name');

      const { data, error } = await query;

      if (error) throw error;
      return data as (LabServiceType & { provider: LabServiceProvider })[];
    },
  });
}

/**
 * Fetch lab service orders for current organization
 */
export function useLabServiceOrders(filters?: {
  farmId?: string;
  parcelId?: string;
  status?: OrderStatus;
}) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['lab-service-orders', currentOrganization?.id, filters],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      let query = supabase
        .from('lab_service_orders')
        .select(`
          *,
          service_type:lab_service_types(*),
          provider:lab_service_providers(*),
          farm:farms(id, name),
          parcel:parcels(id, name),
          sample_collector:user_profiles(id, full_name),
          creator:user_profiles(id, full_name)
        `)
        .eq('organization_id', currentOrganization.id)
        .order('order_date', { ascending: false });

      if (filters?.farmId) {
        query = query.eq('farm_id', filters.farmId);
      }
      if (filters?.parcelId) {
        query = query.eq('parcel_id', filters.parcelId);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as any[];
    },
    enabled: !!currentOrganization?.id,
  });
}

/**
 * Fetch a single lab service order
 */
export function useLabServiceOrder(orderId: string | null) {
  return useQuery({
    queryKey: ['lab-service-order', orderId],
    queryFn: async () => {
      if (!orderId) throw new Error('Order ID required');

      const { data, error } = await supabase
        .from('lab_service_orders')
        .select(`
          *,
          service_type:lab_service_types(*),
          provider:lab_service_providers(*),
          farm:farms(id, name),
          parcel:parcels(id, name),
          sample_collector:user_profiles(id, full_name),
          creator:user_profiles(id, full_name)
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;
      return data as any;
    },
    enabled: !!orderId,
  });
}

/**
 * Fetch lab result parameters for an order
 */
export function useLabResultParameters(orderId: string | null) {
  return useQuery({
    queryKey: ['lab-result-parameters', orderId],
    queryFn: async () => {
      if (!orderId) throw new Error('Order ID required');

      const { data, error } = await supabase
        .from('lab_result_parameters')
        .select('*')
        .eq('order_id', orderId)
        .order('parameter_name');

      if (error) throw error;
      return data as LabResultParameter[];
    },
    enabled: !!orderId,
  });
}

/**
 * Fetch lab service recommendations for an order
 */
export function useLabServiceRecommendations(orderId?: string, parcelId?: string) {
  return useQuery({
    queryKey: ['lab-service-recommendations', orderId, parcelId],
    queryFn: async () => {
      let query = supabase
        .from('lab_service_recommendations')
        .select('*, implementer:user_profiles(id, full_name)')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (orderId) {
        query = query.eq('order_id', orderId);
      }
      if (parcelId) {
        query = query.eq('parcel_id', parcelId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as any[];
    },
    enabled: !!(orderId || parcelId),
  });
}

/**
 * Fetch sample collection schedules
 */
export function useSampleCollectionSchedules(farmId?: string, parcelId?: string) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['sample-collection-schedules', currentOrganization?.id, farmId, parcelId],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      let query = supabase
        .from('sample_collection_schedules')
        .select(`
          *,
          farm:farms(id, name),
          parcel:parcels(id, name),
          service_type:lab_service_types(*),
          assignee:user_profiles(id, full_name)
        `)
        .eq('organization_id', currentOrganization.id)
        .eq('is_active', true)
        .order('next_collection_date');

      if (farmId) {
        query = query.eq('farm_id', farmId);
      }
      if (parcelId) {
        query = query.eq('parcel_id', parcelId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as any[];
    },
    enabled: !!currentOrganization?.id,
  });
}

/**
 * Create a new lab service order
 */
export function useCreateLabServiceOrder() {
  const queryClient = useQueryClient();
  const { currentOrganization, user } = useAuth();

  return useMutation({
    mutationFn: async (orderData: Partial<InsertDto<'lab_service_orders'>>) => {
      if (!currentOrganization?.id || !user?.id) {
        throw new Error('Organization and user required');
      }

      const { data, error } = await supabase
        .from('lab_service_orders')
        .insert({
          ...orderData,
          organization_id: currentOrganization.id,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-service-orders'] });
    },
  });
}

/**
 * Update a lab service order
 */
export function useUpdateLabServiceOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, updates }: { orderId: string; updates: Partial<UpdateDto<'lab_service_orders'>> }) => {
      const { data, error } = await supabase
        .from('lab_service_orders')
        .update(updates)
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-service-orders'] });
      queryClient.invalidateQueries({ queryKey: ['lab-service-order'] });
    },
  });
}

/**
 * Add lab result parameters
 */
export function useAddLabResultParameters() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (parameters: InsertDto<'lab_result_parameters'>[]) => {
      const { data, error } = await supabase
        .from('lab_result_parameters')
        .insert(parameters)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      if (variables.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['lab-result-parameters', variables[0].order_id] });
      }
    },
  });
}

/**
 * Create a lab service recommendation
 */
export function useCreateLabServiceRecommendation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recommendation: InsertDto<'lab_service_recommendations'>) => {
      const { data, error } = await supabase
        .from('lab_service_recommendations')
        .insert(recommendation)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lab-service-recommendations', data.order_id] });
      if (data.parcel_id) {
        queryClient.invalidateQueries({ queryKey: ['lab-service-recommendations', undefined, data.parcel_id] });
      }
    },
  });
}

/**
 * Update a lab service recommendation
 */
export function useUpdateLabServiceRecommendation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      recommendationId,
      updates,
    }: {
      recommendationId: string;
      updates: Partial<UpdateDto<'lab_service_recommendations'>>;
    }) => {
      const { data, error } = await supabase
        .from('lab_service_recommendations')
        .update(updates)
        .eq('id', recommendationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-service-recommendations'] });
    },
  });
}

/**
 * Create a sample collection schedule
 */
export function useCreateSampleCollectionSchedule() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (schedule: Partial<InsertDto<'sample_collection_schedules'>>) => {
      if (!currentOrganization?.id) {
        throw new Error('Organization required');
      }

      const { data, error } = await supabase
        .from('sample_collection_schedules')
        .insert({
          ...schedule,
          organization_id: currentOrganization.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sample-collection-schedules'] });
    },
  });
}

/**
 * Update a sample collection schedule
 */
export function useUpdateSampleCollectionSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      scheduleId,
      updates,
    }: {
      scheduleId: string;
      updates: Partial<UpdateDto<'sample_collection_schedules'>>;
    }) => {
      const { data, error } = await supabase
        .from('sample_collection_schedules')
        .update(updates)
        .eq('id', scheduleId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sample-collection-schedules'] });
    },
  });
}

/**
 * Delete a sample collection schedule
 */
export function useDeleteSampleCollectionSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (scheduleId: string) => {
      const { error } = await supabase
        .from('sample_collection_schedules')
        .delete()
        .eq('id', scheduleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sample-collection-schedules'] });
    },
  });
}
