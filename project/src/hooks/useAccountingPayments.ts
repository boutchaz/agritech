import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/MultiTenantAuthProvider';

export interface Payment {
  id: string;
  organization_id: string;
  payment_number: string;
  payment_type: 'received' | 'paid';
  party_type: 'Customer' | 'Supplier' | null;
  party_id: string | null;
  party_name: string;
  payment_date: string;
  amount: number;
  unallocated_amount: number;
  payment_method: string;
  bank_account_id: string | null;
  reference_number: string | null;
  status: 'draft' | 'submitted' | 'cancelled';
  journal_entry_id: string | null;
  remarks: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentAllocation {
  id: string;
  payment_id: string;
  invoice_id: string;
  allocated_amount: number;
}

export interface PaymentWithAllocations extends Payment {
  allocations?: PaymentAllocation[];
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
        .from('payments')
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
        .from('payments')
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
    },
  });
}
