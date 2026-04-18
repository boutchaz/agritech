// Workforce Types for Mobile App

export type WorkerType = 'fixed_salary' | 'daily_worker' | 'metayage';
export type PaymentFrequency = 'monthly' | 'daily' | 'per_task' | 'harvest_share';
export type PaymentStatus = 'pending' | 'paid' | 'cancelled';

// Worker
export interface Worker {
  id: string;
  organization_id: string;
  farm_id?: string;

  // Personal Information
  first_name: string;
  last_name: string;
  cin?: string;
  phone?: string;
  email?: string;

  // Worker Type
  worker_type: WorkerType;
  position?: string;
  hire_date: string;
  end_date?: string;
  is_active: boolean;

  // CNSS
  is_cnss_declared: boolean;
  cnss_number?: string;

  // Compensation
  monthly_salary?: number;
  daily_rate?: number;
  payment_frequency?: PaymentFrequency;

  // Skills
  specialties?: string[];
  certifications?: string[];

  // Stats
  total_days_worked: number;
  total_tasks_completed: number;

  // Metadata
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Time Log
export interface TimeLog {
  id: string;
  organization_id: string;
  task_id?: string;
  worker_id: string;
  clock_in: string;
  clock_out: string | null;
  location_in?: { lat: number; lng: number };
  location_out?: { lat: number; lng: number };
  duration_minutes: number | null;
  notes?: string;
  created_at: string;

  worker?: Worker;
  task?: { id: string; title: string };
}

// Payment
export interface WorkerPayment {
  id: string;
  organization_id: string;
  worker_id: string;
  period_start: string;
  period_end: string;
  amount: number;
  payment_method?: string;
  status: PaymentStatus;
  paid_at?: string;
  notes?: string;
  created_at: string;

  worker?: Worker;
}

// Filters
export interface WorkerFilters {
  worker_type?: WorkerType;
  is_active?: boolean;
  farm_id?: string;
  search?: string;
}

export interface TimeLogFilters {
  worker_id?: string;
  task_id?: string;
  date_from?: string;
  date_to?: string;
}

export interface PaymentFilters {
  worker_id?: string;
  status?: PaymentStatus;
  date_from?: string;
  date_to?: string;
}

// Input Types
export interface CreateWorkerInput {
  first_name: string;
  last_name: string;
  cin?: string;
  phone?: string;
  email?: string;
  worker_type: WorkerType;
  position?: string;
  hire_date: string;
  monthly_salary?: number;
  daily_rate?: number;
  payment_frequency?: PaymentFrequency;
  is_cnss_declared?: boolean;
  cnss_number?: string;
  specialties?: string[];
  notes?: string;
}

export interface UpdateWorkerInput {
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
  position?: string;
  monthly_salary?: number;
  daily_rate?: number;
  is_active?: boolean;
  end_date?: string;
  notes?: string;
}

export interface ClockInInput {
  worker_id: string;
  task_id?: string;
  location?: { lat: number; lng: number };
}

export interface ClockOutInput {
  location?: { lat: number; lng: number };
  notes?: string;
}

// API Response Types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
}
