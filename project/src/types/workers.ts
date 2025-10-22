// Unified Worker Management Types
// Supports: Fixed Employees, Daily Workers, and Métayage (Khammass/Rebâa)

export type WorkerType = 'fixed_salary' | 'daily_worker' | 'metayage';

export type PaymentFrequency = 'monthly' | 'daily' | 'per_task' | 'harvest_share';

export type MetayageType = 'khammass' | 'rebaa' | 'tholth' | 'custom';

export type CalculationBasis = 'gross_revenue' | 'net_revenue';

export type PaymentStatus = 'pending' | 'paid' | 'cancelled';

// Métayage contract details
export interface MetayageContractDetails {
  charges_shared: boolean;
  owner_provides: string[]; // e.g., ['land', 'trees', 'equipment', 'inputs']
  worker_provides: string[]; // e.g., ['labor']
  harvest_distribution_rules?: string;
  notes?: string;
}

// Main Worker interface
export interface Worker {
  id: string;
  organization_id: string;
  farm_id?: string;
  user_id?: string; // Links to platform user account for workers with system access

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
  documents?: any;
  created_at: string;
  updated_at: string;
  created_by?: string;

  // Joined data
  organization_name?: string;
  farm_name?: string;
}

// Work Record interface
export interface WorkRecord {
  id: string;
  worker_id: string;
  farm_id?: string;
  parcel_id?: string;

  // Work Details
  work_date: string;
  task_category?: string;
  task_description?: string;

  // Time
  hours_worked?: number;
  start_time?: string;
  end_time?: string;

  // Payment
  amount_paid?: number;
  payment_status: PaymentStatus;
  payment_date?: string;

  // Piece work
  units_completed?: number;
  unit_type?: string;
  rate_per_unit?: number;

  // Metadata
  notes?: string;
  supervisor_id?: string;
  created_at: string;
  created_by?: string;

  // Joined data
  worker?: Worker;
  farm_name?: string;
  parcel_name?: string;
}

// Métayage Settlement interface
export interface MetayageSettlement {
  id: string;
  worker_id: string;
  farm_id: string;
  parcel_id?: string;

  // Period
  period_start: string;
  period_end: string;
  harvest_date?: string;

  // Revenue
  gross_revenue: number;
  total_charges: number;
  net_revenue: number;

  // Worker Share
  worker_percentage: number;
  worker_share_amount: number;

  // Calculation
  calculation_basis: CalculationBasis;
  charges_breakdown?: any;

  // Payment
  payment_status: PaymentStatus;
  payment_date?: string;
  payment_method?: string;

  // Metadata
  notes?: string;
  documents?: any;
  created_at: string;
  created_by?: string;

  // Joined data
  worker?: Worker;
  farm_name?: string;
  parcel_name?: string;
}

// Form data for creating/updating workers
export interface WorkerFormData {
  // Personal
  first_name: string;
  last_name: string;
  cin?: string;
  phone?: string;
  email?: string;
  address?: string;
  date_of_birth?: string;

  // Employment
  worker_type: WorkerType;
  position?: string;
  hire_date: string;
  farm_id?: string;

  // CNSS
  is_cnss_declared: boolean;
  cnss_number?: string;

  // Compensation based on type
  monthly_salary?: number; // for fixed_salary
  daily_rate?: number; // for daily_worker
  metayage_type?: MetayageType; // for metayage
  metayage_percentage?: number; // for metayage
  calculation_basis?: CalculationBasis; // for metayage
  metayage_contract_details?: MetayageContractDetails; // for metayage

  // Additional
  specialties?: string[];
  certifications?: string[];
  payment_frequency?: PaymentFrequency;
  bank_account?: string;
  payment_method?: string;
  notes?: string;
}

// Constants for dropdown options
export const WORKER_TYPE_OPTIONS: { value: WorkerType; label: string; labelFr: string; labelAr: string }[] = [
  { value: 'fixed_salary', label: 'Fixed Employee', labelFr: 'Salarié fixe', labelAr: 'موظف ثابت' },
  { value: 'daily_worker', label: 'Daily Worker', labelFr: 'Ouvrier journalier', labelAr: 'عامل يومي' },
  { value: 'metayage', label: 'Revenue Share (Métayage)', labelFr: 'Partage de production (Khammass/Rebâa)', labelAr: 'مشاركة في الإنتاج (خماس/رباع)' },
];

export const METAYAGE_TYPE_OPTIONS: { value: MetayageType; label: string; percentage: number; description: string }[] = [
  { value: 'khammass', label: 'Khammass (1/5)', percentage: 20, description: 'Worker receives 20% of harvest/revenue' },
  { value: 'rebaa', label: 'Rebâa (1/4)', percentage: 25, description: 'Worker receives 25% of harvest/revenue' },
  { value: 'tholth', label: 'Tholth (1/3)', percentage: 33.33, description: 'Worker receives 33.33% of harvest/revenue' },
  { value: 'custom', label: 'Custom', percentage: 0, description: 'Custom percentage' },
];

export const CALCULATION_BASIS_OPTIONS: { value: CalculationBasis; label: string; labelFr: string }[] = [
  { value: 'gross_revenue', label: 'Gross Revenue', labelFr: 'Revenu brut' },
  { value: 'net_revenue', label: 'Net Revenue (after charges)', labelFr: 'Revenu net (après charges)' },
];

export const PAYMENT_FREQUENCY_OPTIONS: { value: PaymentFrequency; label: string; labelFr: string }[] = [
  { value: 'monthly', label: 'Monthly', labelFr: 'Mensuel' },
  { value: 'daily', label: 'Daily', labelFr: 'Journalier' },
  { value: 'per_task', label: 'Per Task', labelFr: 'À la tâche' },
  { value: 'harvest_share', label: 'Harvest Share', labelFr: 'Partage de récolte' },
];

// Utility functions
export const getWorkerDisplayName = (worker: Worker): string => {
  return `${worker.first_name} ${worker.last_name}`;
};

export const getWorkerTypeLabel = (type: WorkerType, lang: 'en' | 'fr' | 'ar' = 'fr'): string => {
  const option = WORKER_TYPE_OPTIONS.find(o => o.value === type);
  if (!option) return type;
  return lang === 'fr' ? option.labelFr : lang === 'ar' ? option.labelAr : option.label;
};

export const getMetayageTypeLabel = (type: MetayageType): string => {
  const option = METAYAGE_TYPE_OPTIONS.find(o => o.value === type);
  return option?.label || type;
};

export const getCompensationDisplay = (worker: Worker): string => {
  switch (worker.worker_type) {
    case 'fixed_salary':
      return worker.monthly_salary ? `${worker.monthly_salary.toFixed(2)} DH/mois` : 'N/A';
    case 'daily_worker':
      return worker.daily_rate ? `${worker.daily_rate.toFixed(2)} DH/jour` : 'N/A';
    case 'metayage': {
      const typeLabel = worker.metayage_type ? getMetayageTypeLabel(worker.metayage_type) : 'Custom';
      return worker.metayage_percentage ? `${worker.metayage_percentage}% (${typeLabel})` : 'N/A';
    }
    default:
      return 'N/A';
  }
};

export const calculateMetayageShare = (
  grossRevenue: number,
  totalCharges: number,
  percentage: number,
  basis: CalculationBasis
): number => {
  const baseAmount = basis === 'gross_revenue' ? grossRevenue : grossRevenue - totalCharges;
  return baseAmount * (percentage / 100);
};
