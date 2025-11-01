/**
 * Reception Center & Batch Types
 *
 * Defines TypeScript interfaces for harvest reception workflow:
 * - Reception batches (quality control, weighing, decision-making)
 * - Extended warehouse properties for reception centers
 */

export type ReceptionType =
  | 'general'
  | 'olivier'
  | 'viticole'
  | 'laitier'
  | 'fruiter'
  | 'legumier';

export type QualityGrade =
  | 'A'
  | 'B'
  | 'C'
  | 'Extra'
  | 'First'
  | 'Second'
  | 'Third';

export type ReceptionDecision =
  | 'pending'
  | 'direct_sale'
  | 'storage'
  | 'transformation'
  | 'rejected';

export type ReceptionBatchStatus =
  | 'received'
  | 'quality_checked'
  | 'decision_made'
  | 'processed'
  | 'cancelled';

/**
 * Extended warehouse properties for reception centers
 */
export interface WarehouseReceptionExtensions {
  is_reception_center?: boolean;
  reception_type?: ReceptionType;
  has_weighing_station?: boolean;
  has_quality_lab?: boolean;
}

/**
 * Reception Batch - tracks harvest reception through quality control to decision
 */
export interface ReceptionBatch {
  id: string;
  organization_id: string;
  warehouse_id: string;

  // Source Information
  harvest_id?: string | null;
  parcel_id: string;
  crop_id?: string | null;
  culture_type?: string | null;

  // Batch Identification
  batch_code: string;
  reception_date: string; // ISO date string
  reception_time?: string | null;

  // Weight & Quantity
  weight: number;
  weight_unit: string;
  quantity?: number | null;
  quantity_unit?: string | null;

  // Quality Control
  quality_grade?: QualityGrade | null;
  quality_score?: number | null; // 1-10
  quality_notes?: string | null;
  humidity_percentage?: number | null;
  maturity_level?: string | null;
  temperature?: number | null;
  moisture_content?: number | null;
  defects?: Record<string, any> | null; // JSONB
  photos?: string[] | null; // Array of URLs

  // Personnel
  received_by?: string | null;
  quality_checked_by?: string | null;

  // Decision Point
  decision: ReceptionDecision;
  decision_notes?: string | null;
  decision_date?: string | null;
  decision_by?: string | null;

  // Decision Links
  destination_warehouse_id?: string | null;
  sales_order_id?: string | null;
  stock_entry_id?: string | null;

  // Supplier/Producer Info
  producer_name?: string | null;
  supplier_id?: string | null;

  // Status workflow
  status: ReceptionBatchStatus;

  // Timestamps
  created_at?: string;
  updated_at?: string;

  // Relations (populated via joins)
  warehouse?: {
    id: string;
    name: string;
    location?: string | null;
  };
  parcel?: {
    id: string;
    name: string;
    farm?: {
      id: string;
      name: string;
    };
  };
  crop?: {
    id: string;
    name: string;
  };
  harvest?: {
    id: string;
    harvest_date: string;
    quantity: number;
  };
  destination_warehouse?: {
    id: string;
    name: string;
    location?: string | null;
  };
}

/**
 * DTO for creating a new reception batch
 */
export interface CreateReceptionBatchDto {
  warehouse_id: string;
  harvest_id?: string;
  parcel_id: string;
  crop_id?: string;
  culture_type?: string;

  reception_date: string;
  reception_time?: string;

  weight: number;
  weight_unit: string;
  quantity?: number;
  quantity_unit?: string;

  quality_grade?: QualityGrade;
  quality_score?: number;
  quality_notes?: string;
  humidity_percentage?: number;
  maturity_level?: string;
  temperature?: number;
  moisture_content?: number;
  defects?: Record<string, any>;
  photos?: string[];

  received_by?: string;
  producer_name?: string;
  supplier_id?: string;
}

/**
 * DTO for updating quality control information
 */
export interface UpdateQualityControlDto {
  quality_grade?: QualityGrade;
  quality_score?: number;
  quality_notes?: string;
  humidity_percentage?: number;
  maturity_level?: string;
  temperature?: number;
  moisture_content?: number;
  defects?: Record<string, any>;
  photos?: string[];
  quality_checked_by?: string;
}

/**
 * DTO for making decision on reception batch
 */
export interface MakeReceptionDecisionDto {
  decision: Exclude<ReceptionDecision, 'pending'>;
  decision_notes?: string;
  destination_warehouse_id?: string; // Required for 'storage' decision
  item_id?: string; // Required for creating stock entry
}

/**
 * Filters for querying reception batches
 */
export interface ReceptionBatchFilters {
  warehouse_id?: string;
  parcel_id?: string;
  status?: ReceptionBatchStatus;
  decision?: ReceptionDecision;
  from_date?: string;
  to_date?: string;
  quality_grade?: QualityGrade;
  crop_id?: string;
}

/**
 * Statistics for reception batches
 */
export interface ReceptionBatchStats {
  total_batches: number;
  total_weight: number;
  average_quality_score?: number;
  by_decision: Record<ReceptionDecision, number>;
  by_quality_grade: Record<QualityGrade, number>;
  by_status: Record<ReceptionBatchStatus, number>;
}

/**
 * Reception batch with computed fields
 */
export interface ReceptionBatchWithStats extends ReceptionBatch {
  days_since_reception: number;
  is_overdue: boolean; // If in 'received' status for too long
}
