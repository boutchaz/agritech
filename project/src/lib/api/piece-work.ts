import { apiClient } from '../api-client';

export type PieceWorkPaymentStatus = 'pending' | 'approved' | 'paid' | 'disputed' | 'cancelled';

export interface PieceWorkRecord {
  id: string;
  organization_id: string;
  farm_id: string;
  worker_id: string;
  work_date: string;
  task_id?: string;
  parcel_id?: string;
  work_unit_id: string;
  units_completed: number;
  rate_per_unit: number;
  total_amount: number;
  quality_rating?: number;
  verified_by?: string;
  verified_at?: string;
  payment_record_id?: string;
  payment_status: PieceWorkPaymentStatus;
  start_time?: string;
  end_time?: string;
  break_duration?: number;
  notes?: string;
  attachments?: unknown;
  created_at: string;
  updated_at: string;
  created_by?: string;

  // Relations
  worker?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  work_unit?: {
    id: string;
    name: string;
    code: string;
  };
  task?: {
    id: string;
    title: string;
  };
  parcel?: {
    id: string;
    name: string;
  };
}

export interface CreatePieceWorkDto {
  worker_id: string;
  work_date: string;
  task_id?: string;
  parcel_id?: string;
  work_unit_id: string;
  units_completed: number;
  rate_per_unit: number;
  quality_rating?: number;
  start_time?: string;
  end_time?: string;
  break_duration?: number;
  notes?: string;
}

export interface UpdatePieceWorkDto {
  work_date?: string;
  task_id?: string;
  parcel_id?: string;
  work_unit_id?: string;
  units_completed?: number;
  rate_per_unit?: number;
  quality_rating?: number;
  payment_status?: PieceWorkPaymentStatus;
  start_time?: string;
  end_time?: string;
  break_duration?: number;
  notes?: string;
  verified_by?: string;
  verified_at?: string;
  payment_record_id?: string;
}

export interface PieceWorkFilters {
  worker_id?: string;
  task_id?: string;
  parcel_id?: string;
  farm_id?: string;
  start_date?: string;
  end_date?: string;
  payment_status?: PieceWorkPaymentStatus;
  search?: string;
}

export const pieceWorkApi = {
  /**
   * Get all piece work records for a farm with optional filters
   */
  async getAll(
    organizationId: string,
    farmId: string,
    filters?: PieceWorkFilters
  ): Promise<PieceWorkRecord[]> {
    const params = new URLSearchParams();
    if (filters?.worker_id) params.append('worker_id', filters.worker_id);
    if (filters?.task_id) params.append('task_id', filters.task_id);
    if (filters?.parcel_id) params.append('parcel_id', filters.parcel_id);
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);
    if (filters?.payment_status) params.append('payment_status', filters.payment_status);
    if (filters?.search) params.append('search', filters.search);

    const queryString = params.toString();
    const url = `/api/v1/organizations/${organizationId}/farms/${farmId}/piece-work${queryString ? `?${queryString}` : ''}`;

    return apiClient.get<PieceWorkRecord[]>(url);
  },

  /**
   * Get a single piece work record by ID
   */
  async getById(organizationId: string, farmId: string, recordId: string): Promise<PieceWorkRecord> {
    return apiClient.get<PieceWorkRecord>(
      `/api/v1/organizations/${organizationId}/farms/${farmId}/piece-work/${recordId}`
    );
  },

  /**
   * Create a new piece work record
   */
  async create(organizationId: string, farmId: string, data: CreatePieceWorkDto): Promise<PieceWorkRecord> {
    return apiClient.post<PieceWorkRecord>(
      `/api/v1/organizations/${organizationId}/farms/${farmId}/piece-work`,
      data
    );
  },

  /**
   * Update a piece work record
   */
  async update(
    organizationId: string,
    farmId: string,
    recordId: string,
    data: UpdatePieceWorkDto
  ): Promise<PieceWorkRecord> {
    return apiClient.patch<PieceWorkRecord>(
      `/api/v1/organizations/${organizationId}/farms/${farmId}/piece-work/${recordId}`,
      data
    );
  },

  /**
   * Delete a piece work record
   */
  async delete(organizationId: string, farmId: string, recordId: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(
      `/api/v1/organizations/${organizationId}/farms/${farmId}/piece-work/${recordId}`
    );
  },

  /**
   * Verify a piece work record
   */
  async verify(organizationId: string, farmId: string, recordId: string): Promise<PieceWorkRecord> {
    return apiClient.patch<PieceWorkRecord>(
      `/api/v1/organizations/${organizationId}/farms/${farmId}/piece-work/${recordId}/verify`,
      {}
    );
  },
};
