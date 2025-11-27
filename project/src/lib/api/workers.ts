import { apiClient } from '../api-client';

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

export const workersApi = {
  /**
   * Get all workers for an organization
   */
  async getAll(organizationId: string, farmId?: string): Promise<Worker[]> {
    const params = farmId ? `?farmId=${farmId}` : '';
    return apiClient.get<Worker[]>(`/api/v1/organizations/${organizationId}/workers${params}`);
  },

  /**
   * Get all active workers for an organization
   */
  async getActive(organizationId: string): Promise<Worker[]> {
    return apiClient.get<Worker[]>(`/api/v1/organizations/${organizationId}/workers/active`);
  },

  /**
   * Get a single worker by ID
   */
  async getById(organizationId: string, workerId: string): Promise<Worker> {
    return apiClient.get<Worker>(`/api/v1/organizations/${organizationId}/workers/${workerId}`);
  },

  /**
   * Get worker statistics
   */
  async getStats(organizationId: string, workerId: string): Promise<WorkerStats> {
    return apiClient.get<WorkerStats>(`/api/v1/organizations/${organizationId}/workers/${workerId}/stats`);
  },

  /**
   * Create a new worker
   */
  async create(organizationId: string, data: CreateWorkerInput): Promise<Worker> {
    return apiClient.post<Worker>(`/api/v1/organizations/${organizationId}/workers`, data);
  },

  /**
   * Update a worker
   */
  async update(organizationId: string, workerId: string, data: UpdateWorkerInput): Promise<Worker> {
    return apiClient.patch<Worker>(`/api/v1/organizations/${organizationId}/workers/${workerId}`, data);
  },

  /**
   * Deactivate a worker (soft delete)
   */
  async deactivate(organizationId: string, workerId: string, endDate?: string): Promise<Worker> {
    const params = endDate ? `?endDate=${endDate}` : '';
    return apiClient.patch<Worker>(`/api/v1/organizations/${organizationId}/workers/${workerId}/deactivate${params}`, {});
  },

  /**
   * Delete a worker (hard delete)
   */
  async delete(organizationId: string, workerId: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/api/v1/organizations/${organizationId}/workers/${workerId}`);
  },
};
