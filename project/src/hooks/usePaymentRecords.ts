import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { paymentRecordsApi } from '@/lib/api/payment-records';
import type { PaymentFilters, PaymentMethod } from '@/types/payments';
import type { CreatePaymentRecordRequest } from '@/types/payments';

export function usePaymentRecords(filters?: PaymentFilters) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['payment-records', currentOrganization?.id, filters],
    queryFn: () => paymentRecordsApi.getAll(filters, currentOrganization?.id),
    enabled: !!currentOrganization?.id,
    staleTime: 60000,
  });
}

export function usePaymentRecord(paymentId: string | null) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['payment-record', paymentId],
    queryFn: () => paymentRecordsApi.getOne(paymentId!, currentOrganization?.id),
    enabled: !!paymentId && !!currentOrganization?.id,
    staleTime: 60000,
  });
}

export function usePaymentStatistics() {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['payment-statistics', currentOrganization?.id],
    queryFn: () => paymentRecordsApi.getStatistics(currentOrganization!.id),
    enabled: !!currentOrganization?.id,
    staleTime: 60000,
  });
}

export function usePaymentAdvances(filters?: { worker_id?: string; status?: string }) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['payment-advances', currentOrganization?.id, filters],
    queryFn: () => paymentRecordsApi.getAdvances(currentOrganization!.id, filters),
    enabled: !!currentOrganization?.id,
    staleTime: 60000,
  });
}

export function useCreatePaymentRecord() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: (data: CreatePaymentRecordRequest) => {
      const orgId = currentOrganization?.id;
      if (!orgId) throw new Error('No organization selected');
      return paymentRecordsApi.create(orgId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-records'] });
    },
  });
}

export function useApprovePayment() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: ({ paymentId, notes }: { paymentId: string; notes?: string }) => {
      const orgId = currentOrganization?.id;
      if (!orgId) throw new Error('No organization selected');
      return paymentRecordsApi.approve(orgId, paymentId, { notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-records'] });
    },
  });
}

export function useProcessPayment() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: ({ paymentId, data }: { paymentId: string; data: { payment_method: PaymentMethod; payment_reference?: string; notes?: string } }) => {
      const orgId = currentOrganization?.id;
      if (!orgId) throw new Error('No organization selected');
      return paymentRecordsApi.process(orgId, paymentId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-records'] });
    },
  });
}

export function useRequestAdvance() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: (data: { worker_id: string; amount: number; reason: string; installments?: number }) => {
      const orgId = currentOrganization?.id;
      if (!orgId) throw new Error('No organization selected');
      return paymentRecordsApi.requestAdvance(orgId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-records'] });
      queryClient.invalidateQueries({ queryKey: ['payment-advances'] });
    },
  });
}
