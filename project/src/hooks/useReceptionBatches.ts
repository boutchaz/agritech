import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/components/MultiTenantAuthProvider';
import { receptionBatchesApi } from '@/lib/api/reception-batches';
import { warehousesApi } from '@/lib/api/warehouses';
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

      return receptionBatchesApi.getAll(currentOrganization.id, filters);
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
      if (!currentOrganization?.id) throw new Error('No organization selected');

      return receptionBatchesApi.getById(currentOrganization.id, id);
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
      if (!currentOrganization?.id) throw new Error('No organization selected');

      return receptionBatchesApi.getAll(currentOrganization.id, { harvest_id: harvestId });
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

      const data = await receptionBatchesApi.getAll(currentOrganization.id, filters);

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
        if (batch.decision) {
          stats.by_decision[batch.decision as keyof typeof stats.by_decision]++;
        }

        if (batch.quality_grade) {
          stats.by_quality_grade[batch.quality_grade as keyof typeof stats.by_quality_grade]++;
        }

        if (batch.status) {
          stats.by_status[batch.status as keyof typeof stats.by_status]++;
        }

        if (batch.quality_score) {
          qualityScoreSum += batch.quality_score;
          qualityScoreCount++;
        }
      });

      stats.average_quality_score = qualityScoreCount > 0 ? qualityScoreSum / qualityScoreCount : undefined;

      return stats;
    },
    enabled: !!currentOrganization?.id,
    staleTime: 60000,
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

      return receptionBatchesApi.create(currentOrganization.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reception-batches'] });
      queryClient.invalidateQueries({ queryKey: ['reception-batch-stats'] });
    },
  });
}

/**
 * Update a reception batch (general update for editing)
 */
export function useUpdateReceptionBatch() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async ({
      batchId,
      data,
    }: {
      batchId: string;
      data: Partial<CreateReceptionBatchDto>;
    }) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      return receptionBatchesApi.update(currentOrganization.id, batchId, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reception-batches'] });
      queryClient.invalidateQueries({ queryKey: ['reception-batch', variables.batchId] });
      queryClient.invalidateQueries({ queryKey: ['reception-batch-stats'] });
    },
  });
}

/**
 * Update quality control information for a batch
 */
export function useUpdateQualityControl() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async ({
      batchId,
      data,
    }: {
      batchId: string;
      data: UpdateQualityControlDto;
    }) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      return receptionBatchesApi.updateQualityControl(currentOrganization.id, batchId, data);
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
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async ({
      batchId,
      data,
    }: {
      batchId: string;
      data: MakeReceptionDecisionDto;
    }) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      return receptionBatchesApi.makeDecision(currentOrganization.id, batchId, data);
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
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (batchId: string) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      return receptionBatchesApi.cancel(currentOrganization.id, batchId);
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
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (batchId: string) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      return receptionBatchesApi.cancel(currentOrganization.id, batchId);
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

      const warehouses = await warehousesApi.getAll(currentOrganization.id);
      return warehouses.filter((w) => w.is_active && (w as { is_reception_center?: boolean }).is_reception_center);
    },
    enabled: !!currentOrganization?.id,
    staleTime: 60000,
  });
}
