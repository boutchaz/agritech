import { apiClient } from '../api-client';
import { requireOrganizationId } from './createCrudApi';

export type WorkerType = 'fixed_salary' | 'daily_worker' | 'metayage';
export type PaymentFrequency = 'monthly' | 'daily' | 'per_task' | 'harvest_share';
export type MetayageType = 'khammass' | 'rebaa' | 'tholth' | 'custom';
export type CalculationBasis = 'gross_revenue' | 'net_revenue';
export type PaymentStatus = 'pending' | 'paid' | 'cancelled';

export interface MetayageContractDetails {
  charges_shared: boolean;
  owner_provides: string[];
  worker_provides: string[];
  harvest_distribution_rules?: string;
  notes?: string;
}

export interface Worker {
  id: string;
  organization_id: string;
  farm_id?: string;
  user_id?: string;

  // Personal Information
  first_name: string;
  last_name: string;
  cin?: string;
  phone?: string;
  email?: string;
  address?: string;
  date_of_birth?: string;

  // Worker Type & Employment
  worker_type: WorkerType;
  position?: string;
  hire_date: string;
  end_date?: string;
  is_active: boolean;

  // CNSS
  is_cnss_declared: boolean;
  cnss_number?: string;

  // Fixed Salary
  monthly_salary?: number;

  // Daily Worker
  daily_rate?: number;

  // Métayage
  metayage_type?: MetayageType;
  metayage_percentage?: number;
  calculation_basis?: CalculationBasis;
  metayage_contract_details?: MetayageContractDetails;

  // Skills
  specialties?: string[];
  certifications?: string[];

  // Payment
  payment_frequency?: PaymentFrequency;
  bank_account?: string;
  payment_method?: string;

  // Stats
  total_days_worked: number;
  total_tasks_completed: number;

  // Metadata
  notes?: string;
  documents?: unknown;
  created_at: string;
  updated_at: string;
  created_by?: string;

  // Joined data
  organization_name?: string;
  farm_name?: string;
}

export interface CreateWorkerInput {
  first_name: string;
  last_name: string;
  cin?: string;
  phone?: string;
  email?: string;
  address?: string;
  date_of_birth?: string;

  worker_type: WorkerType;
  position?: string;
  hire_date: string;
  farm_id?: string;

  is_cnss_declared: boolean;
  cnss_number?: string;

  monthly_salary?: number;
  daily_rate?: number;
  metayage_type?: MetayageType;
  metayage_percentage?: number;
  calculation_basis?: CalculationBasis;
  metayage_contract_details?: MetayageContractDetails;

  specialties?: string[];
  certifications?: string[];
  payment_frequency?: PaymentFrequency;
  bank_account?: string;
  payment_method?: string;
  notes?: string;
  is_active?: boolean;
}

export type UpdateWorkerInput = Partial<CreateWorkerInput>;

export interface WorkerStats {
  worker: Worker;
  totalWorkRecords: number;
  totalPaid: number;
  pendingPayments: number;
  totalDaysWorked: number;
  totalTasksCompleted: number;
}

export interface WorkerFilters {
  farmId?: string;
  is_active?: boolean;
}

export const workersApi = {
  /**
   * Get all workers for an organization
   */
  async getAll(filters?: WorkerFilters, organizationId?: string): Promise<Worker[]> {
    requireOrganizationId(organizationId, 'workersApi.getAll');
    // Only include farmId param if it's a non-empty string
    const params = filters?.farmId && filters.farmId.trim() ? `?farmId=${filters.farmId}` : '';
    return apiClient.get<Worker[]>(`/api/v1/organizations/${organizationId}/workers${params}`, {}, organizationId);
  },

  /**
   * Get all active workers for an organization
   */
  async getActive(organizationId: string): Promise<Worker[]> {
    return apiClient.get<Worker[]>(`/api/v1/organizations/${organizationId}/workers/active`, {}, organizationId);
  },

  /**
   * Get a single worker by ID
   */
  async getOne(id: string, organizationId?: string): Promise<Worker> {
    requireOrganizationId(organizationId, 'workersApi.getOne');
    return apiClient.get<Worker>(`/api/v1/organizations/${organizationId}/workers/${id}`, {}, organizationId);
  },

  // Alias for backwards compatibility
  async getById(organizationId: string, workerId: string): Promise<Worker> {
    return this.getOne(workerId, organizationId);
  },

  /**
   * Get worker statistics
   */
  async getStats(organizationId: string, workerId: string): Promise<WorkerStats> {
    return apiClient.get<WorkerStats>(`/api/v1/organizations/${organizationId}/workers/${workerId}/stats`, {}, organizationId);
  },

  /**
   * Create a new worker
   */
  async create(data: CreateWorkerInput, organizationId?: string): Promise<Worker> {
    requireOrganizationId(organizationId, 'workersApi.create');
    return apiClient.post<Worker>(`/api/v1/organizations/${organizationId}/workers`, data, {}, organizationId);
  },

  /**
   * Update a worker
   */
  async update(id: string, data: UpdateWorkerInput, organizationId?: string): Promise<Worker> {
    requireOrganizationId(organizationId, 'workersApi.update');
    return apiClient.patch<Worker>(`/api/v1/organizations/${organizationId}/workers/${id}`, data, {}, organizationId);
  },

  /**
   * Deactivate a worker (soft delete)
   */
  async deactivate(organizationId: string, workerId: string, endDate?: string): Promise<Worker> {
    const params = endDate ? `?endDate=${endDate}` : '';
    return apiClient.patch<Worker>(`/api/v1/organizations/${organizationId}/workers/${workerId}/deactivate${params}`, {}, {}, organizationId);
  },

  /**
   * Delete a worker (hard delete)
   */
  async delete(id: string, organizationId?: string): Promise<{ message: string }> {
    requireOrganizationId(organizationId, 'workersApi.delete');
    return apiClient.delete<{ message: string }>(`/api/v1/organizations/${organizationId}/workers/${id}`, {}, organizationId);
  },

  /**
   * Get work records for a worker
   */
  async getWorkRecords(
    organizationId: string,
    workerId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<any[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get<any[]>(
      `/api/v1/organizations/${organizationId}/workers/${workerId}/work-records${queryString}`,
    );
  },

  /**
   * Create a work record for a worker
   */
  async createWorkRecord(organizationId: string, workerId: string, data: any): Promise<any> {
    return apiClient.post<any>(
      `/api/v1/organizations/${organizationId}/workers/${workerId}/work-records`,
      data,
    );
  },

  /**
   * Update a work record
   */
  async updateWorkRecord(
    organizationId: string,
    workerId: string,
    recordId: string,
    data: any,
  ): Promise<any> {
    return apiClient.patch<any>(
      `/api/v1/organizations/${organizationId}/workers/${workerId}/work-records/${recordId}`,
      data,
    );
  },

  /**
   * Get métayage settlements for a worker
   */
  async getMetayageSettlements(organizationId: string, workerId: string): Promise<any[]> {
    return apiClient.get<any[]>(
      `/api/v1/organizations/${organizationId}/workers/${workerId}/metayage-settlements`,
    );
  },

  /**
   * Create a métayage settlement for a worker
   */
  async createMetayageSettlement(organizationId: string, workerId: string, data: any): Promise<any> {
    return apiClient.post<any>(
      `/api/v1/organizations/${organizationId}/workers/${workerId}/metayage-settlements`,
      data,
    );
  },

  /**
   * Calculate métayage share for a worker
   */
  async calculateMetayageShare(
    organizationId: string,
    workerId: string,
    grossRevenue: number,
    totalCharges?: number,
  ): Promise<{ share: number }> {
    return apiClient.post<{ share: number }>(
      `/api/v1/organizations/${organizationId}/workers/${workerId}/calculate-metayage-share`,
      { grossRevenue, totalCharges },
    );
  },
};
