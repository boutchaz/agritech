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

const BASE_URL = '/workers';

export const workersApi = {
  // Workers
  async getWorkers(filters?: WorkerFilters): Promise<PaginatedResponse<Worker>> {
    const params = new URLSearchParams();
    if (filters?.worker_type) params.append('worker_type', filters.worker_type);
    if (filters?.is_active !== undefined) params.append('is_active', String(filters.is_active));
    if (filters?.farm_id) params.append('farm_id', filters.farm_id);
    if (filters?.search) params.append('search', filters.search);
    const query = params.toString();
    const res = await api.get<PaginatedResponse<Worker>>(`${BASE_URL}${query ? `?${query}` : ''}`);
    return res || { data: [], total: 0 };
  },

  async getWorker(workerId: string): Promise<Worker> {
    return api.get<Worker>(`${BASE_URL}/${workerId}`);
  },

  async createWorker(data: CreateWorkerInput): Promise<Worker> {
    return api.post<Worker>(BASE_URL, data);
  },

  async updateWorker(workerId: string, data: UpdateWorkerInput): Promise<Worker> {
    return api.patch<Worker>(`${BASE_URL}/${workerId}`, data);
  },

  async deleteWorker(workerId: string): Promise<{ message: string }> {
    return api.delete<{ message: string }>(`${BASE_URL}/${workerId}`);
  },

  // Time Logs
  async getTimeLogs(filters?: TimeLogFilters): Promise<PaginatedResponse<TimeLog>> {
    const params = new URLSearchParams();
    if (filters?.worker_id) params.append('worker_id', filters.worker_id);
    if (filters?.task_id) params.append('task_id', filters.task_id);
    if (filters?.date_from) params.append('date_from', filters.date_from);
    if (filters?.date_to) params.append('date_to', filters.date_to);
    const query = params.toString();
    const res = await api.get<PaginatedResponse<TimeLog>>(`${BASE_URL}/time-logs${query ? `?${query}` : ''}`);
    return res || { data: [], total: 0 };
  },

  async clockIn(data: ClockInInput): Promise<TimeLog> {
    return api.post<TimeLog>(`${BASE_URL}/clock-in`, data);
  },

  async clockOut(timeLogId: string, data: ClockOutInput): Promise<TimeLog> {
    return api.patch<TimeLog>(`${BASE_URL}/time-logs/${timeLogId}/clock-out`, data);
  },

  // Payments
  async getPayments(filters?: PaymentFilters): Promise<PaginatedResponse<WorkerPayment>> {
    const params = new URLSearchParams();
    if (filters?.worker_id) params.append('worker_id', filters.worker_id);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.date_from) params.append('date_from', filters.date_from);
    if (filters?.date_to) params.append('date_to', filters.date_to);
    const query = params.toString();
    const res = await api.get<PaginatedResponse<WorkerPayment>>(`${BASE_URL}/payments${query ? `?${query}` : ''}`);
    return res || { data: [], total: 0 };
  },

  async createPayment(data: Partial<WorkerPayment>): Promise<WorkerPayment> {
    return api.post<WorkerPayment>(`${BASE_URL}/payments`, data);
  },

  async updatePaymentStatus(paymentId: string, status: string): Promise<WorkerPayment> {
    return api.patch<WorkerPayment>(`${BASE_URL}/payments/${paymentId}`, { status });
  },
};
