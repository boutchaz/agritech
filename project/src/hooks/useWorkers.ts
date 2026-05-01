import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { trackEntityCreate, trackEntityUpdate, trackEntityDelete } from '../lib/analytics';
import { workersApi, type PaginatedWorkerQuery } from '../lib/api/workers';
import { withOfflineQueue } from '../lib/offline/withOfflineQueue';
import type { PaginatedResponse } from '../lib/api/types';
import type { WorkerFormData, WorkRecord, MetayageSettlement } from '../types/workers';

export type { PaginatedWorkerQuery };

// Fetch workers for an organization
export const useWorkers = (organizationId: string | null, farmId?: string | null) => {
  return useQuery({
    queryKey: ['workers', organizationId, farmId],
    queryFn: async () => {
      if (!organizationId) return [];
      return workersApi.getAll({ farmId: farmId || undefined }, organizationId);
    },
    enabled: !!organizationId,
  });
};

export const usePaginatedWorkers = (organizationId: string, query: PaginatedWorkerQuery) => {
  const queryKey = JSON.stringify(query);

  return useQuery({
    queryKey: ['workers', 'paginated', organizationId, queryKey],
    queryFn: async (): Promise<PaginatedResponse<import('../types/workers').Worker>> => {
      if (!organizationId) {
        return { data: [], total: 0, page: 1, pageSize: 10, totalPages: 0 };
      }

      return workersApi.getPaginated(organizationId, query);
    },
    enabled: !!organizationId,
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });
};

// Fetch active workers summary
export const useActiveWorkers = (organizationId: string | null) => {
  return useQuery({
    queryKey: ['active-workers', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      return workersApi.getActive(organizationId);
    },
    enabled: !!organizationId,
  });
};

// Fetch single worker
export const useWorker = (organizationId: string | null, workerId: string | null) => {
  return useQuery({
    queryKey: ['worker', organizationId, workerId],
    queryFn: async () => {
      if (!organizationId || !workerId) return null;
      return workersApi.getById(organizationId, workerId);
    },
    enabled: !!organizationId && !!workerId,
  });
};

// Create worker
export const useCreateWorker = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: WorkerFormData & { organization_id: string }) => {
      const { organization_id, ...workerData } = data;
      const queued = withOfflineQueue<WorkerFormData, Awaited<ReturnType<typeof workersApi.create>>>(
        {
          organizationId: organization_id,
          resource: 'worker',
          method: 'POST',
          url: '/api/v1/workers',
          buildPayload: (input, clientId) => ({ ...input, client_id: clientId }),
          buildOptimisticStub: (input, clientId) =>
            ({ id: clientId, _pending: true, organization_id, ...input }) as never,
        },
        (input) => workersApi.create(input, organization_id),
      );
      return queued(workerData);
    },
    onSuccess: (worker) => {
      trackEntityCreate('worker');
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      queryClient.invalidateQueries({ queryKey: ['active-workers', worker.organization_id] });
    },
  });
};

// Update worker
export const useUpdateWorker = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, organizationId, data }: { id: string; organizationId: string; data: Partial<WorkerFormData> }) => {
      const queued = withOfflineQueue<Partial<WorkerFormData>, Awaited<ReturnType<typeof workersApi.update>>>(
        {
          organizationId,
          resource: 'worker',
          method: 'PATCH',
          url: `/api/v1/workers/${id}`,
          buildOptimisticStub: (input, clientId) =>
            ({ id, _pending: true, organization_id: organizationId, ...input, client_id: clientId }) as never,
        },
        (input) => workersApi.update(id, input, organizationId),
      );
      return queued(data);
    },
    onSuccess: (worker) => {
      trackEntityUpdate('worker');
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      queryClient.invalidateQueries({ queryKey: ['worker', worker.organization_id, worker.id] });
      queryClient.invalidateQueries({ queryKey: ['active-workers', worker.organization_id] });
    },
  });
};

// Delete worker
export const useDeleteWorker = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workerId, organizationId }: { workerId: string; organizationId: string }) => {
      const queued = withOfflineQueue<void, Awaited<ReturnType<typeof workersApi.delete>>>(
        {
          organizationId,
          resource: 'worker',
          method: 'DELETE',
          url: `/api/v1/workers/${workerId}`,
        },
        () => workersApi.delete(workerId, organizationId),
      );
      return queued();
    },
    onSuccess: (_, variables) => {
      trackEntityDelete('worker');
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      queryClient.invalidateQueries({ queryKey: ['active-workers', variables.organizationId] });
    },
  });
};

// Deactivate worker (soft delete)
export const useDeactivateWorker = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workerId, organizationId, endDate }: { workerId: string; organizationId: string; endDate?: string }) => {
      return workersApi.deactivate(organizationId, workerId, endDate);
    },
    onSuccess: (worker) => {
      trackEntityDelete('worker');
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      queryClient.invalidateQueries({ queryKey: ['worker', worker.organization_id, worker.id] });
      queryClient.invalidateQueries({ queryKey: ['active-workers', worker.organization_id] });
    },
  });
};

// Fetch work records - now uses NestJS API
export const useWorkRecords = (
  organizationId: string | null,
  workerId: string | null,
  startDate?: string,
  endDate?: string,
) => {
  return useQuery({
    queryKey: ['work-records', organizationId, workerId, startDate, endDate],
    queryFn: async () => {
      if (!organizationId || !workerId) return [];
      return workersApi.getWorkRecords(organizationId, workerId, startDate, endDate) as Promise<WorkRecord[]>;
    },
    enabled: !!organizationId && !!workerId,
  });
};

// Create work record - now uses NestJS API
export const useCreateWorkRecord = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      workerId,
      data,
    }: {
      organizationId: string;
      workerId: string;
      data: Omit<WorkRecord, 'id' | 'created_at' | 'created_by' | 'worker_id'>;
    }) => {
      return workersApi.createWorkRecord(organizationId, workerId, data) as Promise<WorkRecord>;
    },
    onSuccess: (_, variables) => {
      trackEntityCreate('worker');
      queryClient.invalidateQueries({ queryKey: ['work-records', variables.organizationId, variables.workerId] });
      queryClient.invalidateQueries({ queryKey: ['worker', variables.organizationId, variables.workerId] });
    },
  });
};

// Update work record - now uses NestJS API
export const useUpdateWorkRecord = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      workerId,
      recordId,
      data,
    }: {
      organizationId: string;
      workerId: string;
      recordId: string;
      data: Partial<WorkRecord>;
    }) => {
      return workersApi.updateWorkRecord(organizationId, workerId, recordId, data) as Promise<WorkRecord>;
    },
    onSuccess: (_, variables) => {
      trackEntityUpdate('worker');
      queryClient.invalidateQueries({ queryKey: ['work-records', variables.organizationId, variables.workerId] });
    },
  });
};

// Fetch métayage settlements - now uses NestJS API
export const useMetayageSettlements = (organizationId: string | null, workerId: string | null) => {
  return useQuery({
    queryKey: ['metayage-settlements', organizationId, workerId],
    queryFn: async () => {
      if (!organizationId || !workerId) return [];
      return workersApi.getMetayageSettlements(organizationId, workerId) as Promise<MetayageSettlement[]>;
    },
    enabled: !!organizationId && !!workerId,
  });
};

// Create métayage settlement - now uses NestJS API
export const useCreateMetayageSettlement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      workerId,
      data,
    }: {
      organizationId: string;
      workerId: string;
      data: Omit<MetayageSettlement, 'id' | 'net_revenue' | 'created_at' | 'created_by' | 'worker_id'>;
    }) => {
      return workersApi.createMetayageSettlement(organizationId, workerId, data) as Promise<MetayageSettlement>;
    },
    onSuccess: (_, variables) => {
      trackEntityCreate('worker');
      queryClient.invalidateQueries({ queryKey: ['metayage-settlements', variables.organizationId, variables.workerId] });
    },
  });
};

// Calculate métayage share - now uses NestJS API
export const useCalculateMetayageShare = () => {
  return useMutation({
    mutationFn: async ({
      organizationId,
      workerId,
      grossRevenue,
      totalCharges = 0,
    }: {
      organizationId: string;
      workerId: string;
      grossRevenue: number;
      totalCharges?: number;
    }) => {
      const result = await workersApi.calculateMetayageShare(organizationId, workerId, grossRevenue, totalCharges);
      return result.share;
    },
  });
};

// Get worker statistics
export const useWorkerStats = (organizationId: string | null, workerId: string | null) => {
  return useQuery({
    queryKey: ['worker-stats', organizationId, workerId],
    queryFn: async () => {
      if (!organizationId || !workerId) return null;
      return workersApi.getStats(organizationId, workerId);
    },
    enabled: !!organizationId && !!workerId,
  });
};
