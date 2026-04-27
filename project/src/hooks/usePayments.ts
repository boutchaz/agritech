import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import { trackEntityCreate, trackEntityUpdate } from '../lib/analytics';
import {
  paymentRecordsApi,
  type PaginatedPaymentRecordsQuery,
} from '../lib/api/payment-records';
import { useAuth } from '../hooks/useAuth';
import type { PaginatedResponse } from '../lib/api/types';
import type {
  PaymentFilters,
  CreatePaymentRecordRequest,
  ProcessPaymentRequest,
  RequestAdvanceRequest,
  ApproveAdvanceRequest,
  CalculatePaymentRequest,
  PaymentSummary,
} from '../types/payments';

export type { PaginatedPaymentRecordsQuery };

// =====================================================
// PAYMENT QUERIES
// =====================================================

export function usePayments(organizationId: string, filters?: PaymentFilters) {
  return useQuery({
    queryKey: ['payments', organizationId, filters],
    queryFn: async () => {
      if (!organizationId) return [];
      return paymentRecordsApi.getAll(filters, organizationId);
    },
    enabled: !!organizationId,
  });
}

export function usePaginatedPaymentRecords(
  organizationId: string,
  query: PaginatedPaymentRecordsQuery,
) {
  const queryKey = JSON.stringify(query);

  return useQuery({
    queryKey: ['payments', 'paginated', organizationId, queryKey],
    queryFn: async (): Promise<PaginatedResponse<PaymentSummary>> => {
      if (!organizationId) {
        return { data: [], total: 0, page: 1, pageSize: 10, totalPages: 0 };
      }

      return paymentRecordsApi.getPaginated(organizationId, query);
    },
    enabled: !!organizationId,
    placeholderData: keepPreviousData,
  });
}

export function usePayment(organizationId: string, paymentId: string | null) {
  return useQuery({
    queryKey: ['payment', paymentId],
    queryFn: async () => {
      if (!paymentId || !organizationId) return null;
      return paymentRecordsApi.getById(organizationId, paymentId);
    },
    enabled: !!paymentId && !!organizationId,
  });
}

export function useWorkerPayments(organizationId: string, workerId: string | null) {
  return useQuery({
    queryKey: ['worker-payments', workerId],
    queryFn: async () => {
      if (!workerId || !organizationId) return [];
      return paymentRecordsApi.getByWorkerId(organizationId, workerId);
    },
    enabled: !!workerId && !!organizationId,
  });
}

export function useWorkerPaymentHistory(organizationId: string, workerId: string | null) {
  return useQuery({
    queryKey: ['worker-payment-history', workerId],
    queryFn: async () => {
      if (!workerId || !organizationId) return null;
      return paymentRecordsApi.getWorkerPaymentHistory(organizationId, workerId);
    },
    enabled: !!workerId && !!organizationId,
  });
}

export function usePaymentAdvances(organizationId: string, filters?: { worker_id?: string; status?: string }) {
  return useQuery({
    queryKey: ['payment-advances', organizationId, filters],
    queryFn: async () => {
      if (!organizationId) return [];
      return paymentRecordsApi.getAdvances(organizationId, filters);
    },
    enabled: !!organizationId,
  });
}

export function usePaymentStatistics(organizationId: string) {
  return useQuery({
    queryKey: ['payment-statistics', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      return paymentRecordsApi.getStatistics(organizationId);
    },
    enabled: !!organizationId,
  });
}

// =====================================================
// PAYMENT CALCULATION
// =====================================================

export function useCalculatePayment() {
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (request: CalculatePaymentRequest) => {
      if (!currentOrganization) {
        throw new Error('No organization selected');
      }
      return paymentRecordsApi.calculatePayment(currentOrganization.id, request);
    },
  });
}

// =====================================================
// PAYMENT MUTATIONS
// =====================================================

export function useCreatePaymentRecord() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (request: CreatePaymentRecordRequest) => {
      if (!currentOrganization) {
        throw new Error('No organization selected');
      }
      return paymentRecordsApi.create(currentOrganization.id, request);
    },
    onSuccess: (data, variables) => {
      trackEntityCreate('payment');
      const workerId = data?.worker_id || variables.worker_id;
      const orgId = currentOrganization?.id;
      
      // Invalidate all payment-related queries
      queryClient.invalidateQueries({ queryKey: ['payments', orgId] });
      queryClient.invalidateQueries({ queryKey: ['payment-statistics', orgId] });
      
      // Invalidate worker-specific queries
      if (workerId) {
        queryClient.invalidateQueries({ queryKey: ['worker-payments', workerId] });
        queryClient.invalidateQueries({ queryKey: ['worker-payment-history', workerId] });
        queryClient.invalidateQueries({ queryKey: ['worker-stats', orgId, workerId] });
      }
      
      // Invalidate all worker-payments queries (in case workerId is not in response)
      queryClient.invalidateQueries({ queryKey: ['worker-payments'] });
    },
  });
}

export function useApprovePayment() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async ({ payment_id, notes }: { payment_id: string; notes?: string }) => {
      if (!currentOrganization) {
        throw new Error('No organization selected');
      }
      return paymentRecordsApi.approve(currentOrganization.id, payment_id, { notes });
    },
    onSuccess: (data) => {
      trackEntityUpdate('payment');
      queryClient.invalidateQueries({ queryKey: ['payment', data.id] });
      queryClient.invalidateQueries({ queryKey: ['payments', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['payment-statistics', currentOrganization?.id] });
    },
  });
}

export function useProcessPayment() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (request: ProcessPaymentRequest) => {
      if (!currentOrganization) {
        throw new Error('No organization selected');
      }
      const { payment_id, ...processData } = request;
      return paymentRecordsApi.process(currentOrganization.id, payment_id, processData);
    },
    onSuccess: (data) => {
      trackEntityUpdate('payment');
      queryClient.invalidateQueries({ queryKey: ['payment', data.id] });
      queryClient.invalidateQueries({ queryKey: ['payments', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['worker-payments', data.worker_id] });
      queryClient.invalidateQueries({ queryKey: ['payment-statistics', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['payment-advances', currentOrganization?.id] });
    },
  });
}

export function useRequestAdvance() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (request: RequestAdvanceRequest) => {
      if (!currentOrganization) {
        throw new Error('No organization selected');
      }
      return paymentRecordsApi.requestAdvance(currentOrganization.id, request);
    },
    onSuccess: () => {
      trackEntityCreate('payment');
      queryClient.invalidateQueries({ queryKey: ['payment-advances', currentOrganization?.id] });
    },
  });
}

export function useApproveAdvance() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (request: ApproveAdvanceRequest) => {
      if (!currentOrganization) {
        throw new Error('No organization selected');
      }
      const { advance_id, ...approvalData } = request;
      return paymentRecordsApi.approveAdvance(currentOrganization.id, advance_id, approvalData);
    },
    onSuccess: () => {
      trackEntityUpdate('payment');
      queryClient.invalidateQueries({ queryKey: ['payment-advances', currentOrganization?.id] });
    },
  });
}

export function usePayAdvance() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async ({ advanceId, paymentMethod }: { advanceId: string; paymentMethod: string }) => {
      if (!currentOrganization) {
        throw new Error('No organization selected');
      }
      return paymentRecordsApi.payAdvance(currentOrganization.id, advanceId, paymentMethod);
    },
    onSuccess: () => {
      trackEntityUpdate('payment');
      queryClient.invalidateQueries({ queryKey: ['payment-advances', currentOrganization?.id] });
    },
  });
}
