// =====================================================
// PAYMENT MANAGEMENT TYPES
// =====================================================

export type PaymentType = 
  | 'daily_wage' 
  | 'monthly_salary' 
  | 'metayage_share' 
  | 'bonus' 
  | 'overtime' 
  | 'advance';

export type PaymentStatus = 'pending' | 'approved' | 'paid' | 'disputed' | 'cancelled';

export type PaymentMethod = 'cash' | 'bank_transfer' | 'check' | 'mobile_money';

export type DeductionType = 
  | 'cnss' 
  | 'tax' 
  | 'advance_repayment' 
  | 'equipment_damage' 
  | 'other';

export type BonusType = 
  | 'performance' 
  | 'attendance' 
  | 'quality' 
  | 'productivity' 
  | 'other';

export type AdvanceStatus = 'pending' | 'approved' | 'paid' | 'rejected' | 'cancelled';

// =====================================================
// PAYMENT RECORD
// =====================================================
export interface PaymentRecord {
  id: string;
  organization_id: string;
  farm_id: string;
  worker_id: string;
  
  // Payment Details
  payment_type: PaymentType;
  period_start: string;
  period_end: string;
  
  // Calculation Details
  base_amount: number;
  bonuses: number;
  deductions: number;
  overtime_amount: number;
  advance_deduction: number;
  net_amount: number; // calculated
  
  // Work Summary
  days_worked: number;
  hours_worked: number;
  tasks_completed: number;
  tasks_completed_ids?: string[];
  
  // Métayage specific
  harvest_amount?: number;
  gross_revenue?: number;
  total_charges?: number;
  metayage_percentage?: number;
  
  // Payment Status
  status: PaymentStatus;
  payment_method?: PaymentMethod;
  payment_date?: string;
  payment_reference?: string;
  
  // Approvals
  calculated_by?: string;
  calculated_at: string;
  approved_by?: string;
  approved_at?: string;
  paid_by?: string;
  paid_at?: string;
  
  // Additional Info
  notes?: string;
  attachments?: PaymentAttachment[];
  created_at: string;
  updated_at: string;
  
  // Joined data
  worker_name?: string;
  farm_name?: string;
  calculated_by_email?: string;
  approved_by_email?: string;
  paid_by_email?: string;
}

export interface PaymentAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  uploaded_at: string;
}

// =====================================================
// PAYMENT ADVANCE
// =====================================================
export interface PaymentAdvance {
  id: string;
  organization_id: string;
  worker_id: string;
  farm_id?: string;
  
  amount: number;
  requested_date: string;
  approved_by?: string;
  approved_date?: string;
  reason?: string;
  
  status: AdvanceStatus;
  
  // Deduction Plan
  deduction_plan?: DeductionPlan;
  remaining_balance?: number;
  
  // Payment info
  paid_by?: string;
  paid_date?: string;
  payment_method?: PaymentMethod;
  
  notes?: string;
  created_at: string;
  updated_at: string;
  
  // Joined data
  worker_name?: string;
  approved_by_name?: string;
}

export interface DeductionPlan {
  installments: number;
  amount_per_installment: number;
}

// =====================================================
// PAYMENT DEDUCTION
// =====================================================
export interface PaymentDeduction {
  id: string;
  payment_record_id: string;
  deduction_type: DeductionType;
  amount: number;
  description?: string;
  reference?: string;
  created_at: string;
}

// =====================================================
// PAYMENT BONUS
// =====================================================
export interface PaymentBonus {
  id: string;
  payment_record_id: string;
  bonus_type: BonusType;
  amount: number;
  description?: string;
  created_at: string;
}

// =====================================================
// API REQUEST/RESPONSE TYPES
// =====================================================

export interface PaymentFilters {
  status?: PaymentStatus | PaymentStatus[];
  payment_type?: PaymentType | PaymentType[];
  worker_id?: string;
  farm_id?: string;
  period_start?: string;
  period_end?: string;
  payment_date_from?: string;
  payment_date_to?: string;
}

export interface CalculatePaymentRequest {
  worker_id: string;
  period_start: string;
  period_end: string;
  include_advances?: boolean;
}

export interface CalculatePaymentResponse {
  worker_id: string;
  worker_name: string;
  worker_type: string;
  period_start: string;
  period_end: string;
  
  base_amount: number;
  days_worked: number;
  hours_worked: number;
  tasks_completed: number;
  overtime_amount: number;
  
  bonuses: PaymentBonus[];
  deductions: PaymentDeduction[];
  advance_deductions: number;
  
  gross_amount: number;
  total_deductions: number;
  net_amount: number;
  
  // Métayage specific
  harvest_amount?: number;
  gross_revenue?: number;
  metayage_percentage?: number;
}

export interface CreatePaymentRecordRequest {
  worker_id: string;
  farm_id: string;
  payment_type: PaymentType;
  period_start: string;
  period_end: string;
  
  base_amount: number;
  days_worked?: number;
  hours_worked?: number;
  tasks_completed?: number;
  tasks_completed_ids?: string[];
  
  bonuses?: Array<{
    bonus_type: BonusType;
    amount: number;
    description?: string;
  }>;
  
  deductions?: Array<{
    deduction_type: DeductionType;
    amount: number;
    description?: string;
    reference?: string;
  }>;
  
  overtime_amount?: number;
  
  // Métayage
  harvest_amount?: number;
  gross_revenue?: number;
  total_charges?: number;
  metayage_percentage?: number;
  
  notes?: string;
}

export interface ApprovePaymentRequest {
  payment_id: string;
  notes?: string;
}

export interface ProcessPaymentRequest {
  payment_id: string;
  payment_method: PaymentMethod;
  payment_reference?: string;
  notes?: string;
}

export interface RequestAdvanceRequest {
  worker_id: string;
  amount: number;
  reason?: string;
  installments?: number;
}

export interface ApproveAdvanceRequest {
  advance_id: string;
  approved: boolean;
  deduction_plan?: DeductionPlan;
  notes?: string;
}

// =====================================================
// PAYMENT SUMMARY (VIEW)
// =====================================================
export interface PaymentSummary extends PaymentRecord {
  deduction_count: number;
  bonus_count: number;
  deductions_list?: PaymentDeduction[];
  bonuses_list?: PaymentBonus[];
}

// =====================================================
// WORKER PAYMENT HISTORY (VIEW)
// =====================================================
export interface WorkerPaymentHistory {
  worker_id: string;
  worker_name: string;
  worker_type: string;
  total_payments: number;
  total_paid: number;
  pending_amount: number;
  approved_amount: number;
  last_payment_date?: string;
  average_payment: number;
}

// =====================================================
// PAYMENT STATISTICS
// =====================================================
export interface PaymentStatistics {
  total_paid: number;
  total_pending: number;
  total_approved: number;
  payment_count: number;
  average_payment: number;
  
  by_worker_type: Record<string, {
    count: number;
    total: number;
    average: number;
  }>;
  
  by_payment_type: Record<PaymentType, {
    count: number;
    total: number;
  }>;
  
  by_month: Array<{
    month: string;
    total: number;
    count: number;
  }>;
  
  top_paid_workers: Array<{
    worker_id: string;
    worker_name: string;
    total: number;
    payment_count: number;
  }>;
}

// =====================================================
// LABELS & HELPERS
// =====================================================
export const PAYMENT_TYPE_LABELS: Record<PaymentType, { en: string; fr: string }> = {
  daily_wage: { en: 'Daily Wage', fr: 'Salaire journalier' },
  monthly_salary: { en: 'Monthly Salary', fr: 'Salaire mensuel' },
  metayage_share: { en: 'Harvest Share', fr: 'Part métayage' },
  bonus: { en: 'Bonus', fr: 'Prime' },
  overtime: { en: 'Overtime', fr: 'Heures supplémentaires' },
  advance: { en: 'Advance', fr: 'Avance' },
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, { en: string; fr: string }> = {
  pending: { en: 'Pending', fr: 'En attente' },
  approved: { en: 'Approved', fr: 'Approuvé' },
  paid: { en: 'Paid', fr: 'Payé' },
  disputed: { en: 'Disputed', fr: 'Contesté' },
  cancelled: { en: 'Cancelled', fr: 'Annulé' },
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, { en: string; fr: string }> = {
  cash: { en: 'Cash', fr: 'Espèces' },
  bank_transfer: { en: 'Bank Transfer', fr: 'Virement bancaire' },
  check: { en: 'Check', fr: 'Chèque' },
  mobile_money: { en: 'Mobile Money', fr: 'Mobile Money' },
};

export const DEDUCTION_TYPE_LABELS: Record<DeductionType, { en: string; fr: string }> = {
  cnss: { en: 'CNSS', fr: 'CNSS' },
  tax: { en: 'Tax', fr: 'Impôt' },
  advance_repayment: { en: 'Advance Repayment', fr: 'Remboursement avance' },
  equipment_damage: { en: 'Equipment Damage', fr: 'Dommage équipement' },
  other: { en: 'Other', fr: 'Autre' },
};

export const BONUS_TYPE_LABELS: Record<BonusType, { en: string; fr: string }> = {
  performance: { en: 'Performance', fr: 'Performance' },
  attendance: { en: 'Attendance', fr: 'Assiduité' },
  quality: { en: 'Quality', fr: 'Qualité' },
  productivity: { en: 'Productivity', fr: 'Productivité' },
  other: { en: 'Other', fr: 'Autre' },
};

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  disputed: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

// Helper functions
export function getPaymentTypeLabel(type: PaymentType, lang: 'en' | 'fr' = 'fr'): string {
  return PAYMENT_TYPE_LABELS[type][lang];
}

export function getPaymentStatusLabel(status: PaymentStatus, lang: 'en' | 'fr' = 'fr'): string {
  return PAYMENT_STATUS_LABELS[status][lang];
}

export function getPaymentMethodLabel(method: PaymentMethod, lang: 'en' | 'fr' = 'fr'): string {
  return PAYMENT_METHOD_LABELS[method][lang];
}

export function formatCurrency(amount: number, currency: string = 'MAD'): string {
  return new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function calculateNetAmount(payment: Partial<PaymentRecord>): number {
  const base = payment.base_amount || 0;
  const bonuses = payment.bonuses || 0;
  const deductions = payment.deductions || 0;
  const overtime = payment.overtime_amount || 0;
  const advances = payment.advance_deduction || 0;
  
  return base + bonuses + overtime - deductions - advances;
}

export function isPaymentEditable(payment: PaymentRecord): boolean {
  return payment.status === 'pending' || payment.status === 'disputed';
}

export function canApprovePayment(payment: PaymentRecord): boolean {
  return payment.status === 'pending';
}

export function canProcessPayment(payment: PaymentRecord): boolean {
  return payment.status === 'approved';
}

