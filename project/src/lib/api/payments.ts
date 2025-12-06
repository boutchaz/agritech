import { apiClient } from '../api-client';

const BASE_URL = '/api/v1/payments';

export interface Payment {
  id: string;
  organization_id: string;
  payment_number: string;
  payment_date: string;
  payment_type: 'receive' | 'pay';
  party_type: 'customer' | 'supplier';
  party_id: string;
  party_name?: string;
  amount: number;
  payment_method: string;
  reference_number?: string;
  status: 'draft' | 'submitted' | 'reconciled' | 'cancelled';
  notes?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreatePaymentDto {
  payment_date: string;
  payment_type: 'receive' | 'pay';
  party_type: 'customer' | 'supplier';
  party_id: string;
  party_name?: string;
  amount: number;
  payment_method: string;
  reference_number?: string;
  notes?: string;
}

export interface AllocatePaymentDto {
  allocations: Array<{
    invoice_id: string;
    amount: number;
  }>;
}

export interface AllocatePaymentResponse {
  success: boolean;
  message: string;
  data: {
    payment: Payment;
    journal_entry_id: string;
    allocated_amount: number;
  };
}

export interface UpdatePaymentStatusDto {
  status: 'draft' | 'submitted' | 'reconciled' | 'cancelled';
}

export interface PaymentFilters {
  payment_type?: 'receive' | 'pay';
  status?: 'draft' | 'submitted' | 'reconciled' | 'cancelled';
  date_from?: string;
  date_to?: string;
}

export const paymentsApi = {
  /**
   * Get all payments with optional filters
   */
  async getAll(filters?: PaymentFilters, organizationId?: string): Promise<Payment[]> {
    const params = new URLSearchParams();
    if (filters?.payment_type) params.append('payment_type', filters.payment_type);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.date_from) params.append('date_from', filters.date_from);
    if (filters?.date_to) params.append('date_to', filters.date_to);

    const queryString = params.toString();
    const url = queryString ? `${BASE_URL}?${queryString}` : BASE_URL;
    return apiClient.get(url, {}, organizationId);
  },

  /**
   * Get a single payment by ID
   */
  async getOne(id: string, organizationId?: string): Promise<Payment> {
    return apiClient.get(`${BASE_URL}/${id}`, {}, organizationId);
  },

  /**
   * Create a new payment
   */
  async create(data: CreatePaymentDto, organizationId?: string): Promise<Payment> {
    return apiClient.post(BASE_URL, data, organizationId);
  },

  /**
   * Allocate payment to invoices (creates journal entry)
   * Replaces Supabase Edge Function call
   */
  async allocate(id: string, data: AllocatePaymentDto, organizationId?: string): Promise<AllocatePaymentResponse> {
    return apiClient.post(`${BASE_URL}/${id}/allocate`, data, organizationId);
  },

  /**
   * Update payment status
   */
  async updateStatus(id: string, data: UpdatePaymentStatusDto, organizationId?: string): Promise<Payment> {
    return apiClient.patch(`${BASE_URL}/${id}/status`, data, organizationId);
  },

  /**
   * Delete a payment (only drafts without allocations)
   */
  async delete(id: string, organizationId?: string): Promise<void> {
    return apiClient.delete(`${BASE_URL}/${id}`, {}, organizationId);
  },
};
