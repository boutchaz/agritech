import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import type { Database } from '../types/database.types';
import { syncPaymentToLedger, linkJournalEntry } from '../lib/ledger-integration';
import { paymentsApi, type PaginatedPaymentQuery, type PaginatedResponse } from '../lib/api/payments';

type AccountingPayment = Database['public']['Tables']['accounting_payments']['Row'];

export type Payment = AccountingPayment;

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
  payment_type: 'receive' | 'pay';
  party_type?: 'customer' | 'supplier' | null;
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

export function useAccountingPayments() {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['accounting_payments', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      const data = await paymentsApi.getAll({}, currentOrganization.id);
      return data as Payment[];
    },
    enabled: !!currentOrganization?.id,
  });
}

export function usePaginatedPayments(query: PaginatedPaymentQuery) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['accounting_payments', 'paginated', currentOrganization?.id, query],
    queryFn: async (): Promise<PaginatedResponse<Payment>> => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      return paymentsApi.getPaginated(query, currentOrganization.id);
    },
    enabled: !!currentOrganization?.id,
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to fetch payments by type
 * Note: Maps 'received' -> 'receive' and 'paid' -> 'pay' for API compatibility
 */
export function usePaymentsByType(type: 'received' | 'paid') {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['accounting_payments', currentOrganization?.id, type],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      // Map frontend terminology to API terminology
      const apiType = type === 'received' ? 'receive' : 'pay';
      const data = await paymentsApi.getAll(
        { payment_type: apiType as 'receive' | 'pay' },
        currentOrganization.id
      );
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
 * Note: Maps 'received' -> 'receive' and 'paid' -> 'pay' for API compatibility
 * Payment number generation is handled by the backend via SequencesService
 */
export function useCreatePayment() {
  const queryClient = useQueryClient();
  const { currentOrganization, user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreatePaymentInput) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      const partyType = input.party_type || (input.payment_type === 'receive' ? 'customer' : 'supplier');

      const data = await paymentsApi.create({
        payment_date: input.payment_date,
        payment_type: input.payment_type,
        party_type: partyType,
        party_id: input.party_id || '',
        party_name: input.party_name,
        amount: input.amount,
        payment_method: input.payment_method,
        reference_number: input.reference_number || undefined,
        notes: input.remarks || undefined,
      }, currentOrganization.id);

      // Sync to ledger (create journal entry for double-entry bookkeeping)
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ledgerResult = await syncPaymentToLedger(data as any, user?.id || '');

        if (ledgerResult.success && ledgerResult.journalEntryId) {
          // Link the journal entry to the payment
          await linkJournalEntry('accounting_payments', data.id, ledgerResult.journalEntryId);
          console.log(`✓ Payment ${data.payment_number} synced to ledger: Journal Entry ${ledgerResult.journalEntryId}`);
        } else {
          console.warn(`⚠ Payment ${data.payment_number} created but ledger sync failed: ${ledgerResult.error}`);
        }
      } catch (ledgerError) {
        console.error(`Failed to sync payment ${data.payment_number} to ledger:`, ledgerError);
        // Don't throw - payment is already created, ledger sync is supplementary
      }

      return data as Payment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting_payments', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['journal_entries'] });
    },
  });
}

/**
 * Hook to update a payment status
 * @deprecated Use useSubmitPayment for status updates. General payment updates are not supported via API for financial integrity.
 * For now, this hook only supports status updates via the API.
 */
export function useUpdatePayment() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async ({ id, status, ...updates }: Partial<Payment> & { id: string }) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      // Only status updates are supported via API
      if (status) {
        const data = await paymentsApi.updateStatus(
          id,
          { status: status as 'draft' | 'submitted' | 'reconciled' | 'cancelled' },
          currentOrganization.id
        );
        return data as Payment;
      }

      // Log warning if attempting to update other fields
      if (Object.keys(updates).length > 0) {
        console.warn('⚠️ General payment field updates are not supported via API. Only status updates are allowed for financial integrity.');
      }

      throw new Error('Only status updates are supported. Use useSubmitPayment() for status changes.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting_payments', currentOrganization?.id] });
    },
  });
}

/**
 * Hook to delete a payment (only drafts without allocations)
 */
export function useDeletePayment() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      await paymentsApi.delete(id, currentOrganization.id);
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

      const data = await paymentsApi.updateStatus(
        id,
        { status: 'submitted' },
        currentOrganization.id
      );
      return data as Payment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting_payments', currentOrganization?.id] });
    },
  });
}

/**
 * Hook to allocate payment to invoices
 * Updated to use NestJS API instead of Supabase Edge Function
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

      // Map allocated_amount to amount for API compatibility
      const allocations = data.allocations.map(alloc => ({
        invoice_id: alloc.invoice_id,
        amount: alloc.allocated_amount,
      }));

      return await paymentsApi.allocate(
        data.payment_id,
        { allocations },
        currentOrganization.id
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting_payments', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['invoices', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['journal_entries'] });
    },
  });
}
