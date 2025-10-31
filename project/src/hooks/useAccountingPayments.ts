import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/MultiTenantAuthProvider';
import type { Database } from '../types/database.types';

type AccountingPayment = Database['public']['Tables']['accounting_payments']['Row'];
type AccountingPaymentInsert = Database['public']['Tables']['accounting_payments']['Insert'];
type AccountingPaymentUpdate = Database['public']['Tables']['accounting_payments']['Update'];

export interface Payment extends AccountingPayment {}

export interface PaymentAllocation {
  id: string;
  payment_id: string;
  invoice_id: string;
  allocated_amount: number;
}

export interface PaymentWithAllocations extends Payment {
  allocations?: PaymentAllocation[];
}

export interface CreatePaymentInput {
  payment_type: 'received' | 'paid';
  party_type?: 'Customer' | 'Supplier' | null;
  party_id?: string | null;
  party_name: string;
  payment_date: string;
  amount: number;
  payment_method: 'cash' | 'bank_transfer' | 'check' | 'mobile_money';
  bank_account_id?: string | null;
  reference_number?: string | null;
  status?: 'draft' | 'submitted' | 'cancelled';
  remarks?: string | null;
  currency_code?: string;
  exchange_rate?: number | null;
}

/**
 * Hook to fetch all payments for the current organization
 */
export function useAccountingPayments() {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['accounting_payments', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      const { data, error } = await supabase
        .from('accounting_payments')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      return data as Payment[];
    },
    enabled: !!currentOrganization?.id,
  });
}

/**
 * Hook to fetch payments by type
 */
export function usePaymentsByType(type: 'received' | 'paid') {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['accounting_payments', currentOrganization?.id, type],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      const { data, error } = await supabase
        .from('accounting_payments')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .eq('payment_type', type)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      return data as Payment[];
    },
    enabled: !!currentOrganization?.id,
  });
}

/**
 * Hook to calculate payment statistics
 */
export function usePaymentStats() {
  const { data: payments } = useAccountingPayments();

  const stats = {
    total: payments?.length || 0,
    received: payments?.filter(p => p.payment_type === 'received').length || 0,
    paid: payments?.filter(p => p.payment_type === 'paid').length || 0,
    draft: payments?.filter(p => p.status === 'draft').length || 0,
    submitted: payments?.filter(p => p.status === 'submitted').length || 0,
    cancelled: payments?.filter(p => p.status === 'cancelled').length || 0,
    totalReceived: payments
      ?.filter(p => p.payment_type === 'received')
      ?.reduce((sum, p) => sum + Number(p.amount), 0) || 0,
    totalPaid: payments
      ?.filter(p => p.payment_type === 'paid')
      ?.reduce((sum, p) => sum + Number(p.amount), 0) || 0,
  };

  return stats;
}

/**
 * Hook to create a new payment
 */
export function useCreatePayment() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (input: CreatePaymentInput) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      const { data: user } = await supabase.auth.getUser();

      // Generate payment number
      const { data: lastPayment } = await supabase
        .from('accounting_payments')
        .select('payment_number')
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      let nextNumber = 1;
      if (lastPayment?.payment_number) {
        const match = lastPayment.payment_number.match(/PAY-(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }

      const payment_number = `PAY-${String(nextNumber).padStart(5, '0')}`;

      const { data, error } = await supabase
        .from('accounting_payments')
        .insert({
          organization_id: currentOrganization.id,
          payment_number,
          payment_type: input.payment_type,
          party_type: input.party_type || null,
          party_id: input.party_id || null,
          party_name: input.party_name,
          payment_date: input.payment_date,
          amount: input.amount,
          payment_method: input.payment_method,
          bank_account_id: input.bank_account_id || null,
          reference_number: input.reference_number || null,
          status: input.status || 'draft',
          remarks: input.remarks || null,
          currency_code: input.currency_code || currentOrganization.currency || 'MAD',
          exchange_rate: input.exchange_rate || 1,
          created_by: user.user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Payment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting_payments', currentOrganization?.id] });
    },
  });
}

/**
 * Hook to update a payment
 */
export function useUpdatePayment() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Payment> & { id: string }) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      const { data, error } = await supabase
        .from('accounting_payments')
        .update(updates)
        .eq('id', id)
        .eq('organization_id', currentOrganization.id)
        .select()
        .single();

      if (error) throw error;
      return data as Payment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting_payments', currentOrganization?.id] });
    },
  });
}

/**
 * Hook to delete a payment
 */
export function useDeletePayment() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      const { error } = await supabase
        .from('accounting_payments')
        .delete()
        .eq('id', id)
        .eq('organization_id', currentOrganization.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting_payments', currentOrganization?.id] });
    },
  });
}

/**
 * Hook to submit a payment (change status from draft to submitted)
 */
export function useSubmitPayment() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      const { data, error } = await supabase
        .from('accounting_payments')
        .update({ status: 'submitted' })
        .eq('id', id)
        .eq('organization_id', currentOrganization.id)
        .select()
        .single();

      if (error) throw error;
      return data as Payment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting_payments', currentOrganization?.id] });
    },
  });
}

/**
 * Hook to allocate payment using Edge Function
 */
export function useAllocatePayment() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      payment_id: string;
      allocations: { invoice_id: string; allocated_amount: number }[];
    }) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/allocate-payment`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'x-organization-id': currentOrganization.id,
          },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to allocate payment');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting_payments', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['invoices', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['journal_entries'] });
    },
  });
}
