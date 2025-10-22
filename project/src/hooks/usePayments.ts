import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type {
  PaymentRecord,
  PaymentSummary,
  PaymentFilters,
  CreatePaymentRecordRequest,
  ApprovePaymentRequest,
  ProcessPaymentRequest,
  PaymentAdvance,
  RequestAdvanceRequest,
  ApproveAdvanceRequest,
  PaymentStatistics,
  WorkerPaymentHistory,
  CalculatePaymentRequest,
  CalculatePaymentResponse,
} from '../types/payments';

// =====================================================
// PAYMENT QUERIES
// =====================================================

export function usePayments(organizationId: string, filters?: PaymentFilters) {
  return useQuery({
    queryKey: ['payments', organizationId, filters],
    queryFn: async () => {
      let query = supabase
        .from('payment_summary')
        .select('*')
        .eq('organization_id', organizationId);

      if (filters?.status) {
        const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
        query = query.in('status', statuses);
      }

      if (filters?.payment_type) {
        const types = Array.isArray(filters.payment_type) ? filters.payment_type : [filters.payment_type];
        query = query.in('payment_type', types);
      }

      if (filters?.worker_id) {
        query = query.eq('worker_id', filters.worker_id);
      }

      if (filters?.farm_id) {
        query = query.eq('farm_id', filters.farm_id);
      }

      if (filters?.period_start) {
        query = query.gte('period_start', filters.period_start);
      }

      if (filters?.period_end) {
        query = query.lte('period_end', filters.period_end);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as PaymentSummary[];
    },
    enabled: !!organizationId,
  });
}

export function usePayment(paymentId: string | null) {
  return useQuery({
    queryKey: ['payment', paymentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_summary')
        .select('*')
        .eq('id', paymentId!)
        .single();

      if (error) throw error;

      // Fetch deductions and bonuses
      const [deductionsResult, bonusesResult] = await Promise.all([
        supabase.from('payment_deductions').select('*').eq('payment_record_id', paymentId!),
        supabase.from('payment_bonuses').select('*').eq('payment_record_id', paymentId!),
      ]);

      return {
        ...data,
        deductions_list: deductionsResult.data || [],
        bonuses_list: bonusesResult.data || [],
      } as PaymentSummary;
    },
    enabled: !!paymentId,
  });
}

export function useWorkerPayments(workerId: string | null) {
  return useQuery({
    queryKey: ['worker-payments', workerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_records')
        .select('*')
        .eq('worker_id', workerId!)
        .order('period_end', { ascending: false });

      if (error) throw error;
      return (data || []) as PaymentRecord[];
    },
    enabled: !!workerId,
  });
}

export function useWorkerPaymentHistory(workerId: string | null) {
  return useQuery({
    queryKey: ['worker-payment-history', workerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('worker_payment_history')
        .select('*')
        .eq('worker_id', workerId!)
        .single();

      if (error) throw error;
      return data as WorkerPaymentHistory;
    },
    enabled: !!workerId,
  });
}

export function usePaymentAdvances(organizationId: string, filters?: { worker_id?: string; status?: string }) {
  return useQuery({
    queryKey: ['payment-advances', organizationId, filters],
    queryFn: async () => {
      let query = supabase
        .from('payment_advances')
        .select(`
          *,
          worker:worker_id(first_name, last_name),
          approved_by_user:approved_by(email)
        `)
        .eq('organization_id', organizationId);

      if (filters?.worker_id) {
        query = query.eq('worker_id', filters.worker_id);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      query = query.order('requested_date', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(advance => ({
        ...advance,
        worker_name: advance.worker
          ? `${advance.worker.first_name} ${advance.worker.last_name}`
          : undefined,
        approved_by_name: advance.approved_by_user?.email,
      })) as PaymentAdvance[];
    },
    enabled: !!organizationId,
  });
}

export function usePaymentStatistics(organizationId: string) {
  return useQuery({
    queryKey: ['payment-statistics', organizationId],
    queryFn: async () => {
      const { data: payments, error } = await supabase
        .from('payment_records')
        .select('*')
        .eq('organization_id', organizationId);

      if (error) throw error;

      // Calculate statistics
      const total_paid = payments?.filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + p.net_amount, 0) || 0;
      const total_pending = payments?.filter(p => p.status === 'pending')
        .reduce((sum, p) => sum + p.net_amount, 0) || 0;
      const total_approved = payments?.filter(p => p.status === 'approved')
        .reduce((sum, p) => sum + p.net_amount, 0) || 0;

      const stats: PaymentStatistics = {
        total_paid,
        total_pending,
        total_approved,
        payment_count: payments?.length || 0,
        average_payment: payments && payments.length > 0 
          ? payments.reduce((sum, p) => sum + p.net_amount, 0) / payments.length 
          : 0,
        by_worker_type: {},
        by_payment_type: {} as any,
        by_month: [],
        top_paid_workers: [],
      };

      return stats;
    },
    enabled: !!organizationId,
  });
}

// =====================================================
// PAYMENT CALCULATION
// =====================================================

export function useCalculatePayment() {
  return useMutation({
    mutationFn: async (request: CalculatePaymentRequest) => {
      // Get worker info
      const { data: worker, error: workerError } = await supabase
        .from('workers')
        .select('*')
        .eq('id', request.worker_id)
        .single();

      if (workerError) throw workerError;

      let calculationResult;

      // Calculate based on worker type
      if (worker.worker_type === 'daily_worker') {
        const { data, error } = await supabase
          .rpc('calculate_daily_worker_payment', {
            p_worker_id: request.worker_id,
            p_period_start: request.period_start,
            p_period_end: request.period_end,
          });

        if (error) throw error;
        calculationResult = data;
      } else if (worker.worker_type === 'fixed_salary') {
        const { data, error } = await supabase
          .rpc('calculate_fixed_salary_payment', {
            p_worker_id: request.worker_id,
            p_period_start: request.period_start,
            p_period_end: request.period_end,
          });

        if (error) throw error;
        calculationResult = data;
      }

      // Get advance deductions if requested
      let advance_deductions = 0;
      if (request.include_advances) {
        const { data, error } = await supabase
          .rpc('get_worker_advance_deductions', {
            p_worker_id: request.worker_id,
            p_payment_date: request.period_end,
          });

        if (!error && data) {
          advance_deductions = data;
        }
      }

      const response: CalculatePaymentResponse = {
        worker_id: request.worker_id,
        worker_name: `${worker.first_name} ${worker.last_name}`,
        worker_type: worker.worker_type,
        period_start: request.period_start,
        period_end: request.period_end,
        base_amount: calculationResult?.base_amount || 0,
        days_worked: calculationResult?.days_worked || 0,
        hours_worked: calculationResult?.hours_worked || 0,
        tasks_completed: calculationResult?.tasks_completed || 0,
        overtime_amount: calculationResult?.overtime_amount || 0,
        bonuses: [],
        deductions: [],
        advance_deductions,
        gross_amount: (calculationResult?.base_amount || 0) + (calculationResult?.overtime_amount || 0),
        total_deductions: advance_deductions,
        net_amount: (calculationResult?.base_amount || 0) + (calculationResult?.overtime_amount || 0) - advance_deductions,
      };

      return response;
    },
  });
}

// =====================================================
// PAYMENT MUTATIONS
// =====================================================

export function useCreatePaymentRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreatePaymentRecordRequest & { organization_id: string }) => {
      const { data: payment, error: paymentError } = await supabase
        .from('payment_records')
        .insert({
          ...request,
          calculated_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Insert bonuses if provided
      if (request.bonuses && request.bonuses.length > 0) {
        const bonusInserts = request.bonuses.map(bonus => ({
          payment_record_id: payment.id,
          ...bonus,
        }));

        const { error: bonusError } = await supabase
          .from('payment_bonuses')
          .insert(bonusInserts);

        if (bonusError) throw bonusError;
      }

      // Insert deductions if provided
      if (request.deductions && request.deductions.length > 0) {
        const deductionInserts = request.deductions.map(deduction => ({
          payment_record_id: payment.id,
          ...deduction,
        }));

        const { error: deductionError } = await supabase
          .from('payment_deductions')
          .insert(deductionInserts);

        if (deductionError) throw deductionError;
      }

      return payment as PaymentRecord;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['payments', data.organization_id] });
      queryClient.invalidateQueries({ queryKey: ['worker-payments', data.worker_id] });
      queryClient.invalidateQueries({ queryKey: ['payment-statistics', data.organization_id] });
    },
  });
}

export function useApprovePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: ApprovePaymentRequest) => {
      const user = (await supabase.auth.getUser()).data.user;

      const { data, error } = await supabase
        .from('payment_records')
        .update({
          status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          notes: request.notes || null,
        })
        .eq('id', request.payment_id)
        .select()
        .single();

      if (error) throw error;
      return data as PaymentRecord;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['payment', data.id] });
      queryClient.invalidateQueries({ queryKey: ['payments', data.organization_id] });
      queryClient.invalidateQueries({ queryKey: ['payment-statistics', data.organization_id] });
    },
  });
}

export function useProcessPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: ProcessPaymentRequest) => {
      const user = (await supabase.auth.getUser()).data.user;

      const { data, error } = await supabase
        .from('payment_records')
        .update({
          status: 'paid',
          payment_method: request.payment_method,
          payment_reference: request.payment_reference,
          payment_date: new Date().toISOString().split('T')[0],
          paid_by: user?.id,
          paid_at: new Date().toISOString(),
          notes: request.notes || null,
        })
        .eq('id', request.payment_id)
        .select()
        .single();

      if (error) throw error;
      return data as PaymentRecord;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['payment', data.id] });
      queryClient.invalidateQueries({ queryKey: ['payments', data.organization_id] });
      queryClient.invalidateQueries({ queryKey: ['worker-payments', data.worker_id] });
      queryClient.invalidateQueries({ queryKey: ['payment-statistics', data.organization_id] });
      queryClient.invalidateQueries({ queryKey: ['payment-advances', data.organization_id] });
    },
  });
}

export function useRequestAdvance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: RequestAdvanceRequest & { organization_id: string }) => {
      const deduction_plan = request.installments
        ? {
            installments: request.installments,
            amount_per_installment: request.amount / request.installments,
          }
        : null;

      const { data, error } = await supabase
        .from('payment_advances')
        .insert({
          organization_id: request.organization_id,
          worker_id: request.worker_id,
          amount: request.amount,
          reason: request.reason,
          deduction_plan,
          remaining_balance: request.amount,
        })
        .select()
        .single();

      if (error) throw error;
      return data as PaymentAdvance;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['payment-advances', data.organization_id] });
    },
  });
}

export function useApproveAdvance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: ApproveAdvanceRequest) => {
      const user = (await supabase.auth.getUser()).data.user;

      const { data, error } = await supabase
        .from('payment_advances')
        .update({
          status: request.approved ? 'approved' : 'rejected',
          approved_by: user?.id,
          approved_date: new Date().toISOString().split('T')[0],
          deduction_plan: request.deduction_plan || null,
          notes: request.notes || null,
        })
        .eq('id', request.advance_id)
        .select()
        .single();

      if (error) throw error;
      return data as PaymentAdvance;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['payment-advances', data.organization_id] });
    },
  });
}

export function usePayAdvance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ advanceId, paymentMethod }: { advanceId: string; paymentMethod: string }) => {
      const user = (await supabase.auth.getUser()).data.user;

      const { data, error } = await supabase
        .from('payment_advances')
        .update({
          status: 'paid',
          paid_by: user?.id,
          paid_date: new Date().toISOString().split('T')[0],
          payment_method: paymentMethod,
        })
        .eq('id', advanceId)
        .select()
        .single();

      if (error) throw error;
      return data as PaymentAdvance;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['payment-advances', data.organization_id] });
    },
  });
}

