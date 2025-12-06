import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase'; // TODO: Remove when work_records and metayage_settlements APIs are added
import { workersApi } from '../lib/api/workers';
import type { WorkerFormData, WorkRecord, MetayageSettlement } from '../types/workers';

// Fetch workers for an organization
export const useWorkers = (organizationId: string | null, farmId?: string | null) => {
  return useQuery({
    queryKey: ['workers', organizationId, farmId],
    queryFn: async () => {
      if (!organizationId) return [];
      return workersApi.getAll(organizationId, farmId || undefined);
    },
    enabled: !!organizationId,
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
      return workersApi.create(organization_id, workerData);
    },
    onSuccess: (worker) => {
      queryClient.invalidateQueries({ queryKey: ['workers', worker.organization_id] });
      queryClient.invalidateQueries({ queryKey: ['active-workers', worker.organization_id] });
    },
  });
};

// Update worker
export const useUpdateWorker = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, organizationId, data }: { id: string; organizationId: string; data: Partial<WorkerFormData> }) => {
      return workersApi.update(organizationId, id, data);
    },
    onSuccess: (worker) => {
      queryClient.invalidateQueries({ queryKey: ['workers', worker.organization_id] });
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
      return workersApi.delete(organizationId, workerId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workers', variables.organizationId] });
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
      queryClient.invalidateQueries({ queryKey: ['workers', worker.organization_id] });
      queryClient.invalidateQueries({ queryKey: ['worker', worker.organization_id, worker.id] });
      queryClient.invalidateQueries({ queryKey: ['active-workers', worker.organization_id] });
    },
  });
};

// Fetch work records
export const useWorkRecords = (workerId: string | null, startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ['work-records', workerId, startDate, endDate],
    queryFn: async () => {
      if (!workerId) return [];

      let query = supabase
        .from('work_records')
        .select(`
          *,
          workers!inner(first_name, last_name),
          farms(name),
          parcels(name)
        `)
        .eq('worker_id', workerId)
        .order('work_date', { ascending: false });

      if (startDate) {
        query = query.gte('work_date', startDate);
      }
      if (endDate) {
        query = query.lte('work_date', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(record => ({
        ...record,
        worker: record.workers,
        farm_name: record.farms?.name,
        parcel_name: record.parcels?.name,
      })) as WorkRecord[];
    },
    enabled: !!workerId,
  });
};

// Create work record
export const useCreateWorkRecord = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<WorkRecord, 'id' | 'created_at' | 'created_by'>) => {
      const { data: record, error } = await supabase
        .from('work_records')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return record as WorkRecord;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['work-records', variables.worker_id] });
      queryClient.invalidateQueries({ queryKey: ['worker', variables.worker_id] });
    },
  });
};

// Update work record
export const useUpdateWorkRecord = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<WorkRecord> }) => {
      const { data: record, error } = await supabase
        .from('work_records')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return record as WorkRecord;
    },
    onSuccess: (record) => {
      queryClient.invalidateQueries({ queryKey: ['work-records', record.worker_id] });
    },
  });
};

// Fetch métayage settlements
export const useMetayageSettlements = (workerId: string | null) => {
  return useQuery({
    queryKey: ['metayage-settlements', workerId],
    queryFn: async () => {
      if (!workerId) return [];

      const { data, error } = await supabase
        .from('metayage_settlements')
        .select(`
          *,
          workers!inner(first_name, last_name, metayage_type),
          farms(name),
          parcels(name)
        `)
        .eq('worker_id', workerId)
        .order('period_start', { ascending: false });

      if (error) throw error;

      return (data || []).map(settlement => ({
        ...settlement,
        worker: settlement.workers,
        farm_name: settlement.farms?.name,
        parcel_name: settlement.parcels?.name,
      })) as MetayageSettlement[];
    },
    enabled: !!workerId,
  });
};

// Create métayage settlement
export const useCreateMetayageSettlement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<MetayageSettlement, 'id' | 'net_revenue' | 'created_at' | 'created_by'>) => {
      const { data: settlement, error } = await supabase
        .from('metayage_settlements')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return settlement as MetayageSettlement;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['metayage-settlements', variables.worker_id] });
    },
  });
};

// Calculate métayage share using DB function
export const useCalculateMetayageShare = () => {
  return useMutation({
    mutationFn: async ({
      workerId,
      grossRevenue,
      totalCharges = 0,
    }: {
      workerId: string;
      grossRevenue: number;
      totalCharges?: number;
    }) => {
      const { data, error } = await supabase.rpc('calculate_metayage_share', {
        p_worker_id: workerId,
        p_gross_revenue: grossRevenue,
        p_total_charges: totalCharges,
      });

      if (error) throw error;
      return data as number;
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
