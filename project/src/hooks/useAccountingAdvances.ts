import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import {
  paymentsApi,
  type AdvancePayment,
  type ApplyAdvanceInput,
  type CreateAdvanceInput,
} from '../lib/api/payments';

/**
 * Hooks for accounting advances (customer prepayments + supplier advances).
 * Distinct from worker payment advances (those use usePayments / payment-records).
 */

export function useOpenAdvances(params?: { party_id?: string; party_type?: 'customer' | 'supplier' }) {
  const { currentOrganization } = useAuth();
  return useQuery<AdvancePayment[]>({
    queryKey: ['accounting-advances', currentOrganization?.id, params?.party_id, params?.party_type],
    queryFn: () => {
      if (!currentOrganization?.id) throw new Error('No organization selected');
      return paymentsApi.listOpenAdvances(currentOrganization.id, params);
    },
    enabled: !!currentOrganization?.id,
    staleTime: 30 * 1000,
  });
}

export function useCreateAdvance() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateAdvanceInput) => {
      if (!currentOrganization?.id) throw new Error('No organization selected');
      return paymentsApi.createAdvance(data, currentOrganization.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting-advances'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-payments'] });
      queryClient.invalidateQueries({ queryKey: ['journal_entries'] });
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
    },
  });
}

export function useApplyAdvance() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async ({ advanceId, data }: { advanceId: string; data: ApplyAdvanceInput }) => {
      if (!currentOrganization?.id) throw new Error('No organization selected');
      return paymentsApi.applyAdvance(advanceId, data, currentOrganization.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting-advances'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice'] });
      queryClient.invalidateQueries({ queryKey: ['journal_entries'] });
      queryClient.invalidateQueries({ queryKey: ['aged-receivables'] });
      queryClient.invalidateQueries({ queryKey: ['aged-payables'] });
    },
  });
}
