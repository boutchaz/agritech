// Workers API Client for Mobile App
import { api } from '../api';
import type {
  Worker,
  TimeLog,
  WorkerPayment,
  WorkerFilters,
  TimeLogFilters,
  PaymentFilters,
  CreateWorkerInput,
  UpdateWorkerInput,
  ClockInInput,
  ClockOutInput,
  PaginatedResponse,
} from '@/types/workforce';

function orgBase() {
  const orgId = api.getOrganizationId();
  if (!orgId) {
    throw new Error('Organization ID not set');
  }
  return `/organizations/${orgId}/workers`;
}

export const workersApi = {
  // Workers (scoped to organization)
  async getWorkers(filters?: WorkerFilters): Promise<PaginatedResponse<Worker>> {
    try {
      const params = new URLSearchParams();
      if (filters?.worker_type) params.append('worker_type', filters.worker_type);
      if (filters?.is_active !== undefined) params.append('is_active', String(filters.is_active));
      if (filters?.farm_id) params.append('farm_id', filters.farm_id);
      if (filters?.search) params.append('search', filters.search);
      const query = params.toString();
      const res = await api.get<PaginatedResponse<Worker>>(`${orgBase()}${query ? `?${query}` : ''}`);
      return res || { data: [], total: 0 };
    } catch {
      return { data: [], total: 0 };
    }
  },

  async getWorker(workerId: string): Promise<Worker> {
    return api.get<Worker>(`${orgBase()}/${workerId}`);
  },

  async createWorker(data: CreateWorkerInput): Promise<Worker> {
    return api.post<Worker>(orgBase(), data);
  },

  async updateWorker(workerId: string, data: UpdateWorkerInput): Promise<Worker> {
    return api.patch<Worker>(`${orgBase()}/${workerId}`, data);
  },

  async deleteWorker(workerId: string): Promise<{ message: string }> {
    return api.delete<{ message: string }>(`${orgBase()}/${workerId}`);
  },

  // Grant Platform Access
  async grantPlatformAccess(workerId: string, data: { email: string; firstName: string; lastName: string }): Promise<any> {
    return api.post(`${orgBase()}/${workerId}/grant-platform-access`, data);
  },

  // Time Logs — uses /workers/me/time-logs for current user's logs
  async getTimeLogs(filters?: TimeLogFilters): Promise<PaginatedResponse<TimeLog>> {
    const params = new URLSearchParams();
    if (filters?.date_from) params.append('startDate', filters.date_from);
    if (filters?.date_to) params.append('endDate', filters.date_to);
    const query = params.toString();
    const res = await api.get<PaginatedResponse<TimeLog>>(`/workers/me/time-logs${query ? `?${query}` : ''}`);
    return res || { data: [], total: 0 };
  },

  // Clock in/out — uses /tasks endpoints
  async clockIn(data: ClockInInput): Promise<TimeLog> {
    if (!data.task_id) {
      throw new Error('task_id is required for clock-in');
    }
    return api.post<TimeLog>(`/tasks/${data.task_id}/clock-in`, {
      location: data.location,
    });
  },

  async clockOut(timeLogId: string, data: ClockOutInput): Promise<TimeLog> {
    return api.patch<TimeLog>(`/tasks/time-logs/${timeLogId}/clock-out`, data);
  },

  // Payments — uses /organizations/:orgId/payment-records
  async getPayments(filters?: PaymentFilters): Promise<PaginatedResponse<WorkerPayment>> {
    const orgId = api.getOrganizationId();
    const params = new URLSearchParams();
    if (filters?.worker_id) params.append('worker_id', filters.worker_id);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.date_from) params.append('period_start', filters.date_from);
    if (filters?.date_to) params.append('period_end', filters.date_to);
    const query = params.toString();
    const res = await api.get<PaginatedResponse<WorkerPayment>>(
      `/organizations/${orgId}/payment-records${query ? `?${query}` : ''}`
    );
    return res || { data: [], total: 0 };
  },

  async createPayment(data: Partial<WorkerPayment>): Promise<WorkerPayment> {
    return api.post<WorkerPayment>('/payments', data);
  },

  async updatePaymentStatus(paymentId: string, status: string): Promise<WorkerPayment> {
    return api.patch<WorkerPayment>(`/payments/${paymentId}`, { status });
  },
};
