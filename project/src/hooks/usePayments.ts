import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentRecordsApi } from '../lib/api/payment-records';
import { useAuth } from '../components/MultiTenantAuthProvider';
import type {
  PaymentFilters,
  CreatePaymentRecordRequest,
  ProcessPaymentRequest,
  RequestAdvanceRequest,
  ApproveAdvanceRequest,
  CalculatePaymentRequest,
} from '../types/payments';

// =====================================================
// PAYMENT QUERIES
// =====================================================

export function usePayments(organizationId: string, filters?: PaymentFilters) {
  return useQuery({
    queryKey: ['payments', organizationId, filters],
    queryFn: async () => {
      if (!organizationId) return [];
      return paymentRecordsApi.getAll(organizationId, filters);
    },
    enabled: !!organizationId,
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['payments', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['worker-payments', data.worker_id] });
      queryClient.invalidateQueries({ queryKey: ['payment-statistics', currentOrganization?.id] });
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
      queryClient.invalidateQueries({ queryKey: ['payment-advances', currentOrganization?.id] });
    },
  });
}

