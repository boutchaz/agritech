// Workforce Hooks for Mobile App
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workersApi } from '@/lib/api/workers';
import { useAuthStore } from '@/stores/authStore';
import type {
  WorkerFilters,
  TimeLogFilters,
  PaymentFilters,
  CreateWorkerInput,
  UpdateWorkerInput,
  ClockInInput,
  ClockOutInput,
} from '@/types/workforce';

// Query Keys
export const workforceKeys = {
  all: ['workforce'] as const,
  workers: (filters?: WorkerFilters) => [...workforceKeys.all, 'workers', filters] as const,
  worker: (id: string) => [...workforceKeys.all, 'worker', id] as const,
  timeLogs: (filters?: TimeLogFilters) => [...workforceKeys.all, 'time-logs', filters] as const,
  payments: (filters?: PaymentFilters) => [...workforceKeys.all, 'payments', filters] as const,
};

// Workers
export function useWorkers(filters?: WorkerFilters) {
  const orgId = useAuthStore((s) => s.currentOrganization?.id);

  return useQuery({
    queryKey: workforceKeys.workers(filters),
    queryFn: () => workersApi.getWorkers(filters),
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useWorker(workerId: string) {
  return useQuery({
    queryKey: workforceKeys.worker(workerId),
    queryFn: () => workersApi.getWorker(workerId),
    enabled: !!workerId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateWorker() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWorkerInput) => workersApi.createWorker(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workforceKeys.workers() });
    },
  });
}

export function useUpdateWorker(workerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateWorkerInput) => workersApi.updateWorker(workerId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workforceKeys.worker(workerId) });
      queryClient.invalidateQueries({ queryKey: workforceKeys.workers() });
    },
  });
}

export function useDeleteWorker() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (workerId: string) => workersApi.deleteWorker(workerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workforceKeys.workers() });
    },
  });
}

// Grant Platform Access
export function useGrantPlatformAccess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workerId, data }: { workerId: string; data: { email: string; firstName: string; lastName: string } }) =>
      workersApi.grantPlatformAccess(workerId, data),
    onSuccess: (_, { workerId }) => {
      queryClient.invalidateQueries({ queryKey: workforceKeys.worker(workerId) });
      queryClient.invalidateQueries({ queryKey: workforceKeys.workers() });
    },
  });
}

// Time Logs (requires current user to be a worker — returns empty on failure)
export function useTimeLogs(filters?: TimeLogFilters) {
  const orgId = useAuthStore((s) => s.currentOrganization?.id);

  return useQuery({
    queryKey: workforceKeys.timeLogs(filters),
    queryFn: async () => {
      try {
        return await workersApi.getTimeLogs(filters);
      } catch {
        // User may not be a worker — return empty
        return { data: [], total: 0 };
      }
    },
    enabled: !!orgId,
    staleTime: 1 * 60 * 1000,
  });
}

export function useClockIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ClockInInput) => workersApi.clockIn(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workforceKeys.timeLogs() });
    },
  });
}

export function useClockOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ timeLogId, data }: { timeLogId: string; data: ClockOutInput }) =>
      workersApi.clockOut(timeLogId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workforceKeys.timeLogs() });
    },
  });
}

// Payments
export function usePayments(filters?: PaymentFilters) {
  return useQuery({
    queryKey: workforceKeys.payments(filters),
    queryFn: () => workersApi.getPayments(filters),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<import('@/types/workforce').WorkerPayment>) =>
      workersApi.createPayment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workforceKeys.payments() });
    },
  });
}
