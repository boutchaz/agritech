import { apiClient } from '../api-client';
import type {
  PaymentRecord,
  PaymentSummary,
  PaymentFilters,
  CreatePaymentRecordRequest,
  ProcessPaymentRequest,
  PaymentAdvance,
  RequestAdvanceRequest,
  ApproveAdvanceRequest,
  PaymentStatistics,
  WorkerPaymentHistory,
  CalculatePaymentRequest,
  CalculatePaymentResponse,
} from '../../types/payments';

export const paymentRecordsApi = {
  /**
   * Get all payment records for an organization
   */
  async getAll(filters?: PaymentFilters, organizationId?: string): Promise<PaymentSummary[]> {
    if (!organizationId) throw new Error('organizationId is required');
    const params = new URLSearchParams();

    if (filters?.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      params.append('status', statuses.join(','));
    }

    if (filters?.payment_type) {
      const types = Array.isArray(filters.payment_type) ? filters.payment_type : [filters.payment_type];
      params.append('payment_type', types.join(','));
    }

    if (filters?.worker_id) params.append('worker_id', filters.worker_id);
    if (filters?.farm_id) params.append('farm_id', filters.farm_id);
    if (filters?.period_start) params.append('period_start', filters.period_start);
    if (filters?.period_end) params.append('period_end', filters.period_end);

    const queryString = params.toString();
    const url = `/api/v1/organizations/${organizationId}/payment-records${queryString ? `?${queryString}` : ''}`;

    return apiClient.get<PaymentSummary[]>(url);
  },

  /**
   * Get a single payment record by ID with deductions and bonuses
   */
  async getOne(id: string, organizationId?: string): Promise<PaymentSummary> {
    if (!organizationId) throw new Error('organizationId is required');
    return apiClient.get<PaymentSummary>(
      `/api/v1/organizations/${organizationId}/payment-records/${id}`
    );
  },

  // Alias for backwards compatibility
  async getById(organizationId: string, paymentId: string): Promise<PaymentSummary> {
    return this.getOne(paymentId, organizationId);
  },

  /**
   * Get payment records for a specific worker
   */
  async getByWorkerId(organizationId: string, workerId: string): Promise<PaymentRecord[]> {
    return apiClient.get<PaymentRecord[]>(
      `/api/v1/organizations/${organizationId}/payment-records/worker/${workerId}`
    );
  },

  /**
   * Get payment history for a specific worker
   */
  async getWorkerPaymentHistory(organizationId: string, workerId: string): Promise<WorkerPaymentHistory> {
    return apiClient.get<WorkerPaymentHistory>(
      `/api/v1/organizations/${organizationId}/payment-records/worker/${workerId}/history`
    );
  },

  /**
   * Get payment advances for an organization
   */
  async getAdvances(organizationId: string, filters?: { worker_id?: string; status?: string }): Promise<PaymentAdvance[]> {
    const params = new URLSearchParams();

    if (filters?.worker_id) params.append('worker_id', filters.worker_id);
    if (filters?.status) params.append('status', filters.status);

    const queryString = params.toString();
    const url = `/api/v1/organizations/${organizationId}/payment-records/advances/list${queryString ? `?${queryString}` : ''}`;

    return apiClient.get<PaymentAdvance[]>(url);
  },

  /**
   * Get payment statistics for an organization
   */
  async getStatistics(organizationId: string): Promise<PaymentStatistics> {
    return apiClient.get<PaymentStatistics>(
      `/api/v1/organizations/${organizationId}/payment-records/statistics/summary`
    );
  },

  /**
   * Calculate payment for a worker
   */
  async calculatePayment(organizationId: string, data: CalculatePaymentRequest): Promise<CalculatePaymentResponse> {
    return apiClient.post<CalculatePaymentResponse>(
      `/api/v1/organizations/${organizationId}/payment-records/calculate`,
      data
    );
  },

  /**
   * Create a new payment record
   */
  async create(organizationId: string, data: CreatePaymentRecordRequest): Promise<PaymentRecord> {
    return apiClient.post<PaymentRecord>(
      `/api/v1/organizations/${organizationId}/payment-records`,
      data
    );
  },

  /**
   * Approve a payment record
   */
  async approve(organizationId: string, paymentId: string, data: { notes?: string }): Promise<PaymentRecord> {
    return apiClient.patch<PaymentRecord>(
      `/api/v1/organizations/${organizationId}/payment-records/${paymentId}/approve`,
      data
    );
  },

  /**
   * Process a payment (mark as paid)
   */
  async process(organizationId: string, paymentId: string, data: ProcessPaymentRequest): Promise<PaymentRecord> {
    return apiClient.patch<PaymentRecord>(
      `/api/v1/organizations/${organizationId}/payment-records/${paymentId}/process`,
      data
    );
  },

  /**
   * Request an advance
   */
  async requestAdvance(organizationId: string, data: Omit<RequestAdvanceRequest, 'organization_id'>): Promise<PaymentAdvance> {
    return apiClient.post<PaymentAdvance>(
      `/api/v1/organizations/${organizationId}/payment-records/advances`,
      data
    );
  },

  /**
   * Approve an advance
   */
  async approveAdvance(organizationId: string, advanceId: string, data: ApproveAdvanceRequest): Promise<PaymentAdvance> {
    return apiClient.patch<PaymentAdvance>(
      `/api/v1/organizations/${organizationId}/payment-records/advances/${advanceId}/approve`,
      data
    );
  },

  /**
   * Pay an advance
   */
  async payAdvance(organizationId: string, advanceId: string, paymentMethod: string): Promise<PaymentAdvance> {
    return apiClient.patch<PaymentAdvance>(
      `/api/v1/organizations/${organizationId}/payment-records/advances/${advanceId}/pay`,
      { payment_method: paymentMethod }
    );
  },
};
