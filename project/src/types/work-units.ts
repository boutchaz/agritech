/**
 * Work Units & Piece-Work System Types
 *
 * Types for managing work units (Arbre, Caisse, Kg, Litre, etc.)
 * and piece-work payment tracking
 */

// =====================================================
// WORK UNITS
// =====================================================

export type UnitCategory = 'count' | 'weight' | 'volume' | 'area' | 'length';

export interface WorkUnit {
  id: string;
  organization_id: string;

  // Unit Definition
  code: string; // e.g., 'TREE', 'BOX', 'KG', 'L'
  name: string; // e.g., 'Arbre', 'Caisse', 'Kilogramme', 'Litre'
  name_ar?: string; // Arabic name
  name_fr?: string; // French name

  // Unit Type
  unit_category: UnitCategory;

  // Conversion (for standardization)
  base_unit?: string; // e.g., 'kg' for weight, 'liter' for volume
  conversion_factor?: number; // How many base units = 1 of this unit

  // Configuration
  is_active: boolean;
  allow_decimal: boolean; // Can fractional units be entered?

  // Usage tracking
  usage_count: number; // How many times this unit has been used

  // Audit
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface WorkUnitInsertDto {
  organization_id: string;
  code: string;
  name: string;
  name_ar?: string;
  name_fr?: string;
  unit_category: UnitCategory;
  base_unit?: string;
  conversion_factor?: number;
  is_active?: boolean;
  allow_decimal?: boolean;
  created_by?: string;
}

export interface WorkUnitUpdateDto {
  name?: string;
  name_ar?: string;
  name_fr?: string;
  unit_category?: UnitCategory;
  base_unit?: string;
  conversion_factor?: number;
  is_active?: boolean;
  allow_decimal?: boolean;
}

// =====================================================
// PIECE-WORK RECORDS
// =====================================================

export type PieceWorkPaymentStatus = 'pending' | 'approved' | 'paid' | 'disputed' | 'cancelled';

export interface PieceWorkRecord {
  id: string;
  organization_id: string;
  farm_id: string;

  // Worker
  worker_id: string;

  // Work Details
  work_date: string; // ISO date string
  task_id?: string;
  parcel_id?: string;

  // Unit-based tracking
  work_unit_id: string;
  units_completed: number;
  rate_per_unit: number;

  // Calculated
  total_amount: number; // Generated: units_completed * rate_per_unit

  // Quality & Verification
  quality_rating?: number; // 1-5
  verified_by?: string;
  verified_at?: string;

  // Payment linkage
  payment_record_id?: string;
  payment_status: PieceWorkPaymentStatus;

  // Time tracking (optional - for productivity analysis)
  start_time?: string;
  end_time?: string;
  break_duration?: number; // in minutes

  // Notes & Attachments
  notes?: string;
  attachments?: Array<{
    url: string;
    filename: string;
    size?: number;
    type?: string;
  }>;

  // Audit
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface PieceWorkRecordInsertDto {
  organization_id: string;
  farm_id: string;
  worker_id: string;
  work_date?: string; // Default: today
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
  attachments?: any;
  created_by?: string;
}

export interface PieceWorkRecordUpdateDto {
  work_date?: string;
  task_id?: string;
  parcel_id?: string;
  work_unit_id?: string;
  units_completed?: number;
  rate_per_unit?: number;
  quality_rating?: number;
  verified_by?: string;
  verified_at?: string;
  payment_record_id?: string;
  payment_status?: PieceWorkPaymentStatus;
  start_time?: string;
  end_time?: string;
  break_duration?: number;
  notes?: string;
  attachments?: any;
}

// =====================================================
// WORKER EXTENSIONS
// =====================================================

export interface WorkerWithUnitPayment {
  id: string;
  first_name: string;
  last_name: string;
  worker_type: 'fixed_salary' | 'daily_worker' | 'metayage';
  payment_frequency: 'monthly' | 'daily' | 'per_task' | 'harvest_share' | 'per_unit';

  // Traditional rates
  daily_rate?: number;
  monthly_salary?: number;

  // Unit-based payment
  default_work_unit_id?: string;
  rate_per_unit?: number;

  // Relations
  default_work_unit?: WorkUnit;
}

// =====================================================
// PAYMENT RECORD EXTENSIONS
// =====================================================

export interface PaymentRecordWithPieceWork {
  id: string;
  organization_id: string;
  farm_id: string;
  worker_id: string;

  payment_type: 'daily_wage' | 'monthly_salary' | 'piece_work' | 'metayage_share' | 'bonus' | 'overtime' | 'advance';

  // Traditional payment fields
  base_amount: number;
  days_worked?: number;
  hours_worked?: number;
  tasks_completed?: number;
  tasks_completed_ids?: string[];

  // Piece-work fields
  units_completed?: number;
  unit_rate?: number;
  piece_work_ids?: string[];

  // Calculated
  net_amount: number;

  status: 'pending' | 'approved' | 'paid' | 'disputed' | 'cancelled';
  payment_method: 'cash' | 'bank_transfer' | 'check' | 'mobile_money';
  payment_date?: string;

  // Relations
  piece_work_records?: PieceWorkRecord[];
}

// =====================================================
// PAYMENT CALCULATION RESULTS
// =====================================================

export interface PaymentCalculationResult {
  payment_type: 'daily_wage' | 'monthly_salary' | 'piece_work' | 'other';
  base_amount: number;
  days_worked: number;
  hours_worked: number;
  units_completed: number;
  tasks_completed: number;
  overtime_amount: number;
  piece_work_ids: string[];
  tasks_completed_ids: string[];
}

// =====================================================
// VIEWS & SUMMARIES
// =====================================================

export interface WorkerPaymentSummary {
  worker_id: string;
  first_name: string;
  last_name: string;
  organization_id: string;
  worker_type: 'fixed_salary' | 'daily_worker' | 'metayage';
  payment_frequency: string;
  daily_rate?: number;
  rate_per_unit?: number;
  default_unit_name?: string;

  // Piece-work stats
  total_piece_work_entries: number;
  total_units_completed: number;
  total_piece_work_earnings: number;

  // Payment stats
  total_payments: number;
  total_paid_amount: number;
  pending_amount: number;
}

// =====================================================
// FORM VALIDATION SCHEMAS (for use with Zod)
// =====================================================

export interface WorkUnitFormData {
  code: string;
  name: string;
  name_ar?: string;
  name_fr?: string;
  unit_category: UnitCategory;
  base_unit?: string;
  conversion_factor?: number;
  allow_decimal?: boolean;
  is_active?: boolean;
}

export interface PieceWorkFormData {
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

// =====================================================
// CONSTANTS
// =====================================================

export const UNIT_CATEGORIES: Array<{ value: UnitCategory; label: string }> = [
  { value: 'count', label: 'Count (units, trees, boxes)' },
  { value: 'weight', label: 'Weight (kg, tons)' },
  { value: 'volume', label: 'Volume (liters, m³)' },
  { value: 'area', label: 'Area (hectares, m²)' },
  { value: 'length', label: 'Length (meters, km)' },
];

export const DEFAULT_WORK_UNITS = [
  // Count-based
  { code: 'TREE', name: 'Tree', name_fr: 'Arbre', name_ar: 'شجرة', unit_category: 'count' as UnitCategory },
  { code: 'PLANT', name: 'Plant', name_fr: 'Plante', name_ar: 'نبتة', unit_category: 'count' as UnitCategory },
  { code: 'UNIT', name: 'Unit', name_fr: 'Unité', name_ar: 'وحدة', unit_category: 'count' as UnitCategory },
  { code: 'BOX', name: 'Box', name_fr: 'Caisse', name_ar: 'صندوق', unit_category: 'count' as UnitCategory },
  { code: 'CRATE', name: 'Crate', name_fr: 'Caisse', name_ar: 'قفص', unit_category: 'count' as UnitCategory },
  { code: 'BAG', name: 'Bag', name_fr: 'Sac', name_ar: 'كيس', unit_category: 'count' as UnitCategory },

  // Weight
  { code: 'KG', name: 'Kilogram', name_fr: 'Kilogramme', name_ar: 'كيلوغرام', unit_category: 'weight' as UnitCategory },
  { code: 'TON', name: 'Ton', name_fr: 'Tonne', name_ar: 'طن', unit_category: 'weight' as UnitCategory },
  { code: 'QUINTAL', name: 'Quintal', name_fr: 'Quintal', name_ar: 'قنطار', unit_category: 'weight' as UnitCategory },

  // Volume
  { code: 'LITER', name: 'Liter', name_fr: 'Litre', name_ar: 'لتر', unit_category: 'volume' as UnitCategory },
  { code: 'M3', name: 'Cubic meter', name_fr: 'Mètre cube', name_ar: 'متر مكعب', unit_category: 'volume' as UnitCategory },

  // Area
  { code: 'HA', name: 'Hectare', name_fr: 'Hectare', name_ar: 'هكتار', unit_category: 'area' as UnitCategory },
  { code: 'M2', name: 'Square meter', name_fr: 'Mètre carré', name_ar: 'متر مربع', unit_category: 'area' as UnitCategory },

  // Length
  { code: 'M', name: 'Meter', name_fr: 'Mètre', name_ar: 'متر', unit_category: 'length' as UnitCategory },
  { code: 'KM', name: 'Kilometer', name_fr: 'Kilomètre', name_ar: 'كيلومتر', unit_category: 'length' as UnitCategory },
];

export const QUALITY_RATINGS = [
  { value: 1, label: 'Very Poor', icon: '😞' },
  { value: 2, label: 'Poor', icon: '😕' },
  { value: 3, label: 'Average', icon: '😐' },
  { value: 4, label: 'Good', icon: '🙂' },
  { value: 5, label: 'Excellent', icon: '😃' },
];

export const PIECE_WORK_PAYMENT_STATUSES: Array<{ value: PieceWorkPaymentStatus; label: string; color: string }> = [
  { value: 'pending', label: 'Pending', color: 'yellow' },
  { value: 'approved', label: 'Approved', color: 'blue' },
  { value: 'paid', label: 'Paid', color: 'green' },
  { value: 'disputed', label: 'Disputed', color: 'red' },
  { value: 'cancelled', label: 'Cancelled', color: 'gray' },
];
