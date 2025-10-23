import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Worker, WorkerFormData, WorkRecord, MetayageSettlement } from '../types/workers';

// Fetch workers for an organization
export const useWorkers = (organizationId: string | null, farmId?: string | null) => {
  return useQuery({
    queryKey: ['workers', organizationId, farmId],
    queryFn: async () => {
      if (!organizationId) return [];

      let query = supabase
        .from('workers')
        .select(`
          *,
          organizations!inner(name),
          farms(name)
        `)
        .eq('organization_id', organizationId)
        .order('last_name', { ascending: true });

      if (farmId) {
        query = query.eq('farm_id', farmId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(worker => ({
        ...worker,
        organization_name: worker.organizations?.name,
        farm_name: worker.farms?.name,
      })) as Worker[];
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

      const { data, error } = await supabase
        .from('active_workers_summary')
        .select('*')
        .eq('organization_id', organizationId);

      if (error) throw error;
      return (data || []) as Worker[];
    },
    enabled: !!organizationId,
  });
};

// Fetch single worker
export const useWorker = (workerId: string | null) => {
  return useQuery({
    queryKey: ['worker', workerId],
    queryFn: async () => {
      if (!workerId) return null;

      const { data, error } = await supabase
        .from('workers')
        .select(`
          *,
          organizations(name),
          farms(name)
        `)
        .eq('id', workerId)
        .single();

      if (error) throw error;

      return {
        ...data,
        organization_name: data.organizations?.name,
        farm_name: data.farms?.name,
      } as Worker;
    },
    enabled: !!workerId,
  });
};

// Create worker
export const useCreateWorker = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: WorkerFormData & { organization_id: string }) => {
      // Sanitize data: convert empty strings to null for UUID and optional fields
      const sanitizedData = {
        ...data,
        farm_id: data.farm_id || null,
        email: data.email || null,
        cin: data.cin || null,
        phone: data.phone || null,
        address: data.address || null,
        date_of_birth: data.date_of_birth || null,
        position: data.position || null,
        cnss_number: data.cnss_number || null,
        bank_account: data.bank_account || null,
        payment_method: data.payment_method || null,
        notes: data.notes || null,
        monthly_salary: data.monthly_salary || null,
        daily_rate: data.daily_rate || null,
        metayage_type: data.metayage_type || null,
        metayage_percentage: data.metayage_percentage || null,
        calculation_basis: data.calculation_basis || null,
        payment_frequency: data.payment_frequency || null,
      };

      const { data: worker, error } = await supabase
        .from('workers')
        .insert(sanitizedData)
        .select()
        .single();

      if (error) throw error;
      return worker as Worker;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workers', variables.organization_id] });
      queryClient.invalidateQueries({ queryKey: ['active-workers', variables.organization_id] });
    },
  });
};

// Update worker
export const useUpdateWorker = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<WorkerFormData> }) => {
      // Sanitize data: convert empty strings to null for UUID and optional fields
      const sanitizedData: any = { ...data };

      if ('farm_id' in sanitizedData) sanitizedData.farm_id = sanitizedData.farm_id || null;
      if ('email' in sanitizedData) sanitizedData.email = sanitizedData.email || null;
      if ('cin' in sanitizedData) sanitizedData.cin = sanitizedData.cin || null;
      if ('phone' in sanitizedData) sanitizedData.phone = sanitizedData.phone || null;
      if ('address' in sanitizedData) sanitizedData.address = sanitizedData.address || null;
      if ('date_of_birth' in sanitizedData) sanitizedData.date_of_birth = sanitizedData.date_of_birth || null;
      if ('position' in sanitizedData) sanitizedData.position = sanitizedData.position || null;
      if ('cnss_number' in sanitizedData) sanitizedData.cnss_number = sanitizedData.cnss_number || null;
      if ('bank_account' in sanitizedData) sanitizedData.bank_account = sanitizedData.bank_account || null;
      if ('payment_method' in sanitizedData) sanitizedData.payment_method = sanitizedData.payment_method || null;
      if ('notes' in sanitizedData) sanitizedData.notes = sanitizedData.notes || null;
      if ('monthly_salary' in sanitizedData) sanitizedData.monthly_salary = sanitizedData.monthly_salary || null;
      if ('daily_rate' in sanitizedData) sanitizedData.daily_rate = sanitizedData.daily_rate || null;
      if ('metayage_type' in sanitizedData) sanitizedData.metayage_type = sanitizedData.metayage_type || null;
      if ('metayage_percentage' in sanitizedData) sanitizedData.metayage_percentage = sanitizedData.metayage_percentage || null;
      if ('calculation_basis' in sanitizedData) sanitizedData.calculation_basis = sanitizedData.calculation_basis || null;
      if ('payment_frequency' in sanitizedData) sanitizedData.payment_frequency = sanitizedData.payment_frequency || null;

      const { data: worker, error } = await supabase
        .from('workers')
        .update(sanitizedData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return worker as Worker;
    },
    onSuccess: (worker) => {
      queryClient.invalidateQueries({ queryKey: ['workers', worker.organization_id] });
      queryClient.invalidateQueries({ queryKey: ['worker', worker.id] });
      queryClient.invalidateQueries({ queryKey: ['active-workers', worker.organization_id] });
    },
  });
};

// Delete worker
export const useDeleteWorker = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workerId: string) => {
      const { error } = await supabase
        .from('workers')
        .delete()
        .eq('id', workerId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      queryClient.invalidateQueries({ queryKey: ['active-workers'] });
    },
  });
};

// Deactivate worker (soft delete)
export const useDeactivateWorker = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workerId, endDate }: { workerId: string; endDate?: string }) => {
      const { data: worker, error } = await supabase
        .from('workers')
        .update({
          is_active: false,
          end_date: endDate || new Date().toISOString().split('T')[0],
        })
        .eq('id', workerId)
        .select()
        .single();

      if (error) throw error;
      return worker as Worker;
    },
    onSuccess: (worker) => {
      queryClient.invalidateQueries({ queryKey: ['workers', worker.organization_id] });
      queryClient.invalidateQueries({ queryKey: ['worker', worker.id] });
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
export const useWorkerStats = (workerId: string | null) => {
  return useQuery({
    queryKey: ['worker-stats', workerId],
    queryFn: async () => {
      if (!workerId) return null;

      // Get worker basic info
      const { data: worker, error: workerError } = await supabase
        .from('workers')
        .select('*')
        .eq('id', workerId)
        .single();

      if (workerError) throw workerError;

      // Get work records count and total paid
      const { data: workRecords, error: recordsError } = await supabase
        .from('work_records')
        .select('amount_paid, payment_status')
        .eq('worker_id', workerId);

      if (recordsError) throw recordsError;

      const totalPaid = workRecords
        ?.filter(r => r.payment_status === 'paid')
        .reduce((sum, r) => sum + (r.amount_paid || 0), 0) || 0;

      const pendingPayments = workRecords
        ?.filter(r => r.payment_status === 'pending')
        .reduce((sum, r) => sum + (r.amount_paid || 0), 0) || 0;

      // Get métayage settlements if applicable
      let metayageTotal = 0;
      if (worker.worker_type === 'metayage') {
        const { data: settlements, error: settlementsError } = await supabase
          .from('metayage_settlements')
          .select('worker_share_amount, payment_status')
          .eq('worker_id', workerId);

        if (!settlementsError && settlements) {
          metayageTotal = settlements
            .filter(s => s.payment_status === 'paid')
            .reduce((sum, s) => sum + s.worker_share_amount, 0);
        }
      }

      return {
        worker,
        totalWorkRecords: workRecords?.length || 0,
        totalPaid: totalPaid + metayageTotal,
        pendingPayments,
        totalDaysWorked: worker.total_days_worked || 0,
        totalTasksCompleted: worker.total_tasks_completed || 0,
      };
    },
    enabled: !!workerId,
  });
};
