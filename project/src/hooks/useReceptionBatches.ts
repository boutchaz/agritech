import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/MultiTenantAuthProvider';
import type {
  ReceptionBatch,
  CreateReceptionBatchDto,
  UpdateQualityControlDto,
  MakeReceptionDecisionDto,
  ReceptionBatchFilters,
  ReceptionBatchStats,
} from '@/types/reception';

/**
 * Fetch all reception batches with optional filters (optimized for list view)
 */
export function useReceptionBatches(filters: ReceptionBatchFilters = {}) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['reception-batches', currentOrganization?.id, filters],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      // Optimized query - only fetch essential fields and limit nested data
      let query = supabase
        .from('reception_batches')
        .select(`
          id,
          batch_code,
          reception_date,
          weight,
          weight_unit,
          quality_grade,
          quality_score,
          decision,
          status,
          warehouse_id,
          parcel_id,
          warehouse:warehouses!reception_batches_warehouse_id_fkey(name, location),
          parcel:parcels(name, farm:farms(name))
        `)
        .eq('organization_id', currentOrganization.id)
        .order('reception_date', { ascending: false })
        .limit(100); // Limit initial results for performance

      // Apply filters
      if (filters.warehouse_id) {
        query = query.eq('warehouse_id', filters.warehouse_id);
      }
      if (filters.parcel_id) {
        query = query.eq('parcel_id', filters.parcel_id);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.decision) {
        query = query.eq('decision', filters.decision);
      }
      if (filters.quality_grade) {
        query = query.eq('quality_grade', filters.quality_grade);
      }
      if (filters.crop_id) {
        query = query.eq('crop_id', filters.crop_id);
      }
      if (filters.from_date) {
        query = query.gte('reception_date', filters.from_date);
      }
      if (filters.to_date) {
        query = query.lte('reception_date', filters.to_date);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ReceptionBatch[];
    },
    enabled: !!currentOrganization?.id,
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Fetch a single reception batch by ID
 */
export function useReceptionBatch(id: string | undefined) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['reception-batch', id],
    queryFn: async () => {
      if (!id) throw new Error('Batch ID is required');

      const { data, error } = await supabase
        .from('reception_batches')
        .select(`
          *,
          warehouse:warehouses!reception_batches_warehouse_id_fkey(
            id,
            name,
            location,
            is_reception_center,
            reception_type,
            has_weighing_station,
            has_quality_lab
          ),
          parcel:parcels(
            id,
            name,
            farm:farms(
              id,
              name
            )
          ),
          crop:crops(
            id,
            name
          ),
          harvest:harvest_records(
            id,
            harvest_date,
            quantity,
            unit
          ),
          destination_warehouse:warehouses!reception_batches_destination_warehouse_id_fkey(
            id,
            name,
            location
          ),
          stock_entry:stock_entries(
            id,
            entry_number,
            entry_type,
            status
          ),
          sales_order:sales_orders(
            id,
            order_number,
            status
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as ReceptionBatch;
    },
    enabled: !!id && !!currentOrganization?.id,
  });
}

/**
 * Fetch reception batches for a specific harvest
 */
export function useHarvestReceptionBatches(harvestId: string | undefined) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['reception-batches', 'harvest', harvestId],
    queryFn: async () => {
      if (!harvestId) throw new Error('Harvest ID is required');

      const { data, error } = await supabase
        .from('reception_batches')
        .select('*')
        .eq('harvest_id', harvestId)
        .order('reception_date', { ascending: false });

      if (error) throw error;
      return data as ReceptionBatch[];
    },
    enabled: !!harvestId && !!currentOrganization?.id,
  });
}

/**
 * Fetch reception batch statistics
 */
export function useReceptionBatchStats(filters: ReceptionBatchFilters = {}) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['reception-batch-stats', currentOrganization?.id, filters],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      // Fetch all batches with filters
      let query = supabase
        .from('reception_batches')
        .select('decision, quality_grade, status, weight, quality_score')
        .eq('organization_id', currentOrganization.id);

      // Apply same filters as useReceptionBatches
      if (filters.warehouse_id) query = query.eq('warehouse_id', filters.warehouse_id);
      if (filters.parcel_id) query = query.eq('parcel_id', filters.parcel_id);
      if (filters.from_date) query = query.gte('reception_date', filters.from_date);
      if (filters.to_date) query = query.lte('reception_date', filters.to_date);

      const { data, error } = await query;
      if (error) throw error;

      // Calculate statistics
      const stats: ReceptionBatchStats = {
        total_batches: data.length,
        total_weight: data.reduce((sum, b) => sum + (b.weight || 0), 0),
        average_quality_score: 0,
        by_decision: {
          pending: 0,
          direct_sale: 0,
          storage: 0,
          transformation: 0,
          rejected: 0,
        },
        by_quality_grade: {
          A: 0,
          B: 0,
          C: 0,
          Extra: 0,
          First: 0,
          Second: 0,
          Third: 0,
        },
        by_status: {
          received: 0,
          quality_checked: 0,
          decision_made: 0,
          processed: 0,
          cancelled: 0,
        },
      };

      let qualityScoreSum = 0;
      let qualityScoreCount = 0;

      data.forEach((batch) => {
        // Count by decision
        if (batch.decision) {
          stats.by_decision[batch.decision as keyof typeof stats.by_decision]++;
        }

        // Count by quality grade
        if (batch.quality_grade) {
          stats.by_quality_grade[batch.quality_grade as keyof typeof stats.by_quality_grade]++;
        }

        // Count by status
        if (batch.status) {
          stats.by_status[batch.status as keyof typeof stats.by_status]++;
        }

        // Sum quality scores
        if (batch.quality_score) {
          qualityScoreSum += batch.quality_score;
          qualityScoreCount++;
        }
      });

      stats.average_quality_score = qualityScoreCount > 0 ? qualityScoreSum / qualityScoreCount : undefined;

      return stats;
    },
    enabled: !!currentOrganization?.id,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Create a new reception batch
 */
export function useCreateReceptionBatch() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateReceptionBatchDto) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      const { data: batch, error } = await supabase
        .from('reception_batches')
        .insert({
          organization_id: currentOrganization.id,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;
      return batch as ReceptionBatch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reception-batches'] });
      queryClient.invalidateQueries({ queryKey: ['reception-batch-stats'] });
    },
  });
}

/**
 * Update quality control information for a batch
 */
export function useUpdateQualityControl() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      batchId,
      data,
    }: {
      batchId: string;
      data: UpdateQualityControlDto;
    }) => {
      const { data: batch, error } = await supabase
        .from('reception_batches')
        .update({
          ...data,
          status: 'quality_checked',
          updated_at: new Date().toISOString(),
        })
        .eq('id', batchId)
        .select()
        .single();

      if (error) throw error;
      return batch as ReceptionBatch;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reception-batches'] });
      queryClient.invalidateQueries({ queryKey: ['reception-batch', variables.batchId] });
      queryClient.invalidateQueries({ queryKey: ['reception-batch-stats'] });
    },
  });
}

/**
 * Make decision on a reception batch and create associated records
 */
export function useMakeReceptionDecision() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      batchId,
      data,
    }: {
      batchId: string;
      data: MakeReceptionDecisionDto;
    }) => {
      // Call database function to handle decision logic
      const { data: result, error } = await supabase.rpc(
        'make_reception_decision',
        {
          p_batch_id: batchId,
          p_decision: data.decision,
          p_decision_notes: data.decision_notes || null,
          p_destination_warehouse_id: data.destination_warehouse_id || null,
          p_item_id: data.item_id || null,
          p_decision_by: user?.id || null,
        }
      );

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reception-batches'] });
      queryClient.invalidateQueries({ queryKey: ['reception-batch', variables.batchId] });
      queryClient.invalidateQueries({ queryKey: ['reception-batch-stats'] });
      queryClient.invalidateQueries({ queryKey: ['stock-entries'] });
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
    },
  });
}

/**
 * Cancel a reception batch
 */
export function useCancelReceptionBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (batchId: string) => {
      const { data, error } = await supabase
        .from('reception_batches')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', batchId)
        .select()
        .single();

      if (error) throw error;
      return data as ReceptionBatch;
    },
    onSuccess: (_, batchId) => {
      queryClient.invalidateQueries({ queryKey: ['reception-batches'] });
      queryClient.invalidateQueries({ queryKey: ['reception-batch', batchId] });
      queryClient.invalidateQueries({ queryKey: ['reception-batch-stats'] });
    },
  });
}

/**
 * Delete a reception batch (only if in 'received' status)
 */
export function useDeleteReceptionBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (batchId: string) => {
      const { error } = await supabase
        .from('reception_batches')
        .delete()
        .eq('id', batchId)
        .eq('status', 'received'); // Only allow delete if just received

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reception-batches'] });
      queryClient.invalidateQueries({ queryKey: ['reception-batch-stats'] });
    },
  });
}

/**
 * Fetch reception centers (warehouses with is_reception_center = true)
 */
export function useReceptionCenters() {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['reception-centers', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .eq('is_reception_center', true)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!currentOrganization?.id,
    staleTime: 60000, // 1 minute
  });
}
