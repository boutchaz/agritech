import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type {
  HarvestRecord,
  HarvestSummary,
  HarvestFilters,
  CreateHarvestRequest,
  Delivery,
  DeliverySummary,
  DeliveryFilters,
  CreateDeliveryRequest,
  UpdateDeliveryStatusRequest,
  CompleteDeliveryRequest,
  DeliveryItem,
  DeliveryTracking,
  HarvestStatistics,
  DeliveryStatistics,
} from '../types/harvests';

// =====================================================
// HARVEST QUERIES
// =====================================================

export function useHarvests(organizationId: string, filters?: HarvestFilters) {
  return useQuery({
    queryKey: ['harvests', organizationId, filters],
    queryFn: async () => {
      let query = supabase
        .from('harvest_records')
        .select('*')
        .eq('organization_id', organizationId);

      if (filters?.status) {
        const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
        query = query.in('status', statuses);
      }

      if (filters?.farm_id) {
        query = query.eq('farm_id', filters.farm_id);
      }

      if (filters?.parcel_id) {
        query = query.eq('parcel_id', filters.parcel_id);
      }

      if (filters?.crop_id) {
        query = query.eq('crop_id', filters.crop_id);
      }

      if (filters?.date_from) {
        query = query.gte('harvest_date', filters.date_from);
      }

      if (filters?.date_to) {
        query = query.lte('harvest_date', filters.date_to);
      }

      if (filters?.quality_grade) {
        const grades = Array.isArray(filters.quality_grade) ? filters.quality_grade : [filters.quality_grade];
        query = query.in('quality_grade', grades);
      }

      if (filters?.intended_for) {
        query = query.eq('intended_for', filters.intended_for);
      }

      query = query.order('harvest_date', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as HarvestSummary[];
    },
    enabled: !!organizationId,
  });
}

export function useHarvest(harvestId: string | null) {
  return useQuery({
    queryKey: ['harvest', harvestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('harvest_records')
        .select('*')
        .eq('id', harvestId!)
        .single();

      if (error) throw error;
      return data as HarvestSummary;
    },
    enabled: !!harvestId,
  });
}

export function useHarvestStatistics(organizationId: string, filters?: { date_from?: string; date_to?: string }) {
  return useQuery({
    queryKey: ['harvest-statistics', organizationId, filters],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_harvest_statistics', {
          p_organization_id: organizationId,
          p_start_date: filters?.date_from || new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().split('T')[0],
          p_end_date: filters?.date_to || new Date().toISOString().split('T')[0],
        });

      if (error) throw error;
      return data as HarvestStatistics;
    },
    enabled: !!organizationId,
  });
}

// =====================================================
// DELIVERY QUERIES
// =====================================================

export function useDeliveries(organizationId: string, filters?: DeliveryFilters) {
  return useQuery({
    queryKey: ['deliveries', organizationId, filters],
    queryFn: async () => {
      let query = supabase
        .from('deliveries')
        .select('*')
        .eq('organization_id', organizationId);

      if (filters?.status) {
        const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
        query = query.in('status', statuses);
      }

      if (filters?.payment_status) {
        const statuses = Array.isArray(filters.payment_status) ? filters.payment_status : [filters.payment_status];
        query = query.in('payment_status', statuses);
      }

      if (filters?.delivery_type) {
        const types = Array.isArray(filters.delivery_type) ? filters.delivery_type : [filters.delivery_type];
        query = query.in('delivery_type', types);
      }

      if (filters?.farm_id) {
        query = query.eq('farm_id', filters.farm_id);
      }

      if (filters?.driver_id) {
        query = query.eq('driver_id', filters.driver_id);
      }

      if (filters?.date_from) {
        query = query.gte('delivery_date', filters.date_from);
      }

      if (filters?.date_to) {
        query = query.lte('delivery_date', filters.date_to);
      }

      if (filters?.customer_name) {
        query = query.ilike('customer_name', `%${filters.customer_name}%`);
      }

      query = query.order('delivery_date', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as DeliverySummary[];
    },
    enabled: !!organizationId,
  });
}

export function useDelivery(deliveryId: string | null) {
  return useQuery({
    queryKey: ['delivery', deliveryId],
    queryFn: async () => {
      const [deliveryResult, itemsResult, trackingResult] = await Promise.all([
        supabase.from('deliveries').select('*').eq('id', deliveryId!).single(),
        supabase.from('delivery_items').select(`
          *,
          harvest:harvest_record_id(harvest_date, crop_id, parcel_id)
        `).eq('delivery_id', deliveryId!),
        supabase.from('delivery_tracking').select('*').eq('delivery_id', deliveryId!).order('recorded_at', { ascending: false }),
      ]);

      if (deliveryResult.error) throw deliveryResult.error;

      return {
        ...deliveryResult.data,
        items: itemsResult.data || [],
        tracking: trackingResult.data || [],
      } as DeliverySummary & { tracking: DeliveryTracking[] };
    },
    enabled: !!deliveryId,
  });
}

export function useDeliveryItems(deliveryId: string | null) {
  return useQuery({
    queryKey: ['delivery-items', deliveryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_items')
        .select(`
          *,
          harvest:harvest_record_id(
            harvest_date,
            crop_id,
            parcel_id
          )
        `)
        .eq('delivery_id', deliveryId!);

      if (error) throw error;
      return (data || []) as DeliveryItem[];
    },
    enabled: !!deliveryId,
  });
}

export function useDeliveryTracking(deliveryId: string | null) {
  return useQuery({
    queryKey: ['delivery-tracking', deliveryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_tracking')
        .select('*')
        .eq('delivery_id', deliveryId!)
        .order('recorded_at', { ascending: false });

      if (error) throw error;
      return (data || []) as DeliveryTracking[];
    },
    enabled: !!deliveryId,
  });
}

// =====================================================
// HARVEST MUTATIONS
// =====================================================

export function useCreateHarvest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateHarvestRequest & { organization_id: string }) => {
      const user = (await supabase.auth.getUser()).data.user;

      const { data, error } = await supabase
        .from('harvest_records')
        .insert({
          ...request,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as HarvestRecord;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['harvests', data.organization_id] });
      queryClient.invalidateQueries({ queryKey: ['harvest-statistics', data.organization_id] });
    },
  });
}

export function useUpdateHarvest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ harvestId, updates }: { harvestId: string; updates: Partial<HarvestRecord> }) => {
      const { data, error } = await supabase
        .from('harvest_records')
        .update(updates)
        .eq('id', harvestId)
        .select()
        .single();

      if (error) throw error;
      return data as HarvestRecord;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['harvest', data.id] });
      queryClient.invalidateQueries({ queryKey: ['harvests', data.organization_id] });
    },
  });
}

export function useDeleteHarvest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (harvestId: string) => {
      // Get harvest first to know organization_id
      const { data: harvest } = await supabase
        .from('harvest_records')
        .select('organization_id')
        .eq('id', harvestId)
        .single();

      const { error } = await supabase
        .from('harvest_records')
        .delete()
        .eq('id', harvestId);

      if (error) throw error;
      return { harvestId, organizationId: harvest?.organization_id };
    },
    onSuccess: (data) => {
      if (data.organizationId) {
        queryClient.invalidateQueries({ queryKey: ['harvests', data.organizationId] });
        queryClient.invalidateQueries({ queryKey: ['harvest-statistics', data.organizationId] });
      }
    },
  });
}

// =====================================================
// DELIVERY MUTATIONS
// =====================================================

export function useCreateDelivery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateDeliveryRequest & { organization_id: string }) => {
      const user = (await supabase.auth.getUser()).data.user;

      // Create delivery
      const { data: delivery, error: deliveryError } = await supabase
        .from('deliveries')
        .insert({
          organization_id: request.organization_id,
          farm_id: request.farm_id,
          delivery_date: request.delivery_date,
          delivery_type: request.delivery_type,
          customer_name: request.customer_name,
          customer_contact: request.customer_contact,
          customer_email: request.customer_email,
          delivery_address: request.delivery_address,
          destination_lat: request.destination_lat,
          destination_lng: request.destination_lng,
          driver_id: request.driver_id,
          vehicle_info: request.vehicle_info,
          payment_method: request.payment_method,
          payment_terms: request.payment_terms,
          notes: request.notes,
          created_by: user?.id,
        })
        .select()
        .single();

      if (deliveryError) throw deliveryError;

      // Create delivery items
      if (request.items && request.items.length > 0) {
        const itemInserts = request.items.map(item => ({
          delivery_id: delivery.id,
          ...item,
        }));

        const { error: itemsError } = await supabase
          .from('delivery_items')
          .insert(itemInserts);

        if (itemsError) throw itemsError;
      }

      return delivery as Delivery;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['deliveries', data.organization_id] });
      queryClient.invalidateQueries({ queryKey: ['harvests', data.organization_id] });
    },
  });
}

export function useUpdateDeliveryStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: UpdateDeliveryStatusRequest) => {
      const user = (await supabase.auth.getUser()).data.user;

      // Update delivery status
      const { data: delivery, error: deliveryError } = await supabase
        .from('deliveries')
        .update({ status: request.status })
        .eq('id', request.delivery_id)
        .select()
        .single();

      if (deliveryError) throw deliveryError;

      // Create tracking record
      const { error: trackingError } = await supabase
        .from('delivery_tracking')
        .insert({
          delivery_id: request.delivery_id,
          status: request.status,
          location_lat: request.location_lat,
          location_lng: request.location_lng,
          location_name: request.location_name,
          notes: request.notes,
          photo_url: request.photo_url,
          recorded_by: user?.id,
        });

      if (trackingError) throw trackingError;

      return delivery as Delivery;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['delivery', data.id] });
      queryClient.invalidateQueries({ queryKey: ['deliveries', data.organization_id] });
      queryClient.invalidateQueries({ queryKey: ['delivery-tracking', data.id] });
    },
  });
}

export function useCompleteDelivery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CompleteDeliveryRequest) => {
      const { data, error } = await supabase
        .from('deliveries')
        .update({
          status: 'delivered',
          signature_image: request.signature_image,
          signature_name: request.signature_name,
          signature_date: new Date().toISOString(),
          arrival_time: request.arrival_time || new Date().toISOString(),
          notes: request.notes || null,
        })
        .eq('id', request.delivery_id)
        .select()
        .single();

      if (error) throw error;
      return data as Delivery;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['delivery', data.id] });
      queryClient.invalidateQueries({ queryKey: ['deliveries', data.organization_id] });
      queryClient.invalidateQueries({ queryKey: ['harvests', data.organization_id] });
    },
  });
}

export function useUpdateDeliveryPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      deliveryId, 
      paymentReceived, 
      paymentDate,
      paymentStatus 
    }: { 
      deliveryId: string; 
      paymentReceived: number;
      paymentDate?: string;
      paymentStatus?: 'pending' | 'partial' | 'paid';
    }) => {
      const { data, error } = await supabase
        .from('deliveries')
        .update({
          payment_received: paymentReceived,
          payment_date: paymentDate || new Date().toISOString().split('T')[0],
          payment_status: paymentStatus || 'partial',
        })
        .eq('id', deliveryId)
        .select()
        .single();

      if (error) throw error;
      return data as Delivery;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['delivery', data.id] });
      queryClient.invalidateQueries({ queryKey: ['deliveries', data.organization_id] });
    },
  });
}

export function useCancelDelivery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ deliveryId, reason }: { deliveryId: string; reason?: string }) => {
      const { data, error } = await supabase
        .from('deliveries')
        .update({
          status: 'cancelled',
          notes: reason,
        })
        .eq('id', deliveryId)
        .select()
        .single();

      if (error) throw error;
      return data as Delivery;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['delivery', data.id] });
      queryClient.invalidateQueries({ queryKey: ['deliveries', data.organization_id] });
      queryClient.invalidateQueries({ queryKey: ['harvests', data.organization_id] });
    },
  });
}

