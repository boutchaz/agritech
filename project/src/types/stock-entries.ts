/**
 * Stock Entry System Types
 * Comprehensive types for stock transactions (Receipt, Issue, Transfer, Reconciliation)
 */

export type StockEntryType =
  | 'Material Receipt'
  | 'Material Issue'
  | 'Stock Transfer'
  | 'Stock Reconciliation';

export type StockEntryStatus = 'Draft' | 'Submitted' | 'Posted' | 'Cancelled';

export type StockMovementType = 'IN' | 'OUT' | 'TRANSFER';

export type ReferenceType =
  | 'Purchase Order'
  | 'Sales Order'
  | 'Task'
  | 'Manual'
  | null;

// =====================================================
// Stock Entry (Header)
// =====================================================
export interface StockEntry {
  id: string;
  organization_id: string;

  // Entry Identification
  entry_number: string; // SE-2025-0001
  entry_type: StockEntryType;
  entry_date: string; // ISO date string

  // Warehouse Information
  from_warehouse_id: string | null;
  to_warehouse_id: string | null;

  // Reference Information
  reference_type: ReferenceType;
  reference_id: string | null;
  reference_number: string | null;

  // Status and Workflow
  status: StockEntryStatus;

  // Additional Information
  purpose: string | null;
  notes: string | null;

  // Posting Information
  posted_at: string | null; // ISO datetime
  posted_by: string | null;

  // Audit Fields
  created_at: string; // ISO datetime
  created_by: string | null;
  updated_at: string; // ISO datetime
  updated_by: string | null;
}

// =====================================================
// Stock Entry Item (Line Item)
// =====================================================
export interface StockEntryItem {
  id: string;
  stock_entry_id: string;
  line_number: number;

  // Item Information
  item_id: string;
  item_name: string;

  // Quantity Information
  quantity: number;
  unit: string;

  // Warehouse Information (line-level)
  source_warehouse_id: string | null;
  target_warehouse_id: string | null;

  // Batch/Serial Tracking
  batch_number: string | null;
  serial_number: string | null;
  expiry_date: string | null; // ISO date

  // Cost Information
  cost_per_unit: number | null;
  total_cost: number | null; // Computed: quantity * cost_per_unit

  // Reconciliation Fields
  system_quantity: number | null; // For reconciliation
  physical_quantity: number | null; // For reconciliation
  variance: number | null; // Computed: physical - system

  // Additional Information
  notes: string | null;

  // Audit
  created_at: string;
}

// =====================================================
// Stock Entry with Items (Joined)
// =====================================================
export interface StockEntryWithItems extends StockEntry {
  items: StockEntryItem[];
  from_warehouse?: {
    id: string;
    name: string;
  };
  to_warehouse?: {
    id: string;
    name: string;
  };
}

// =====================================================
// Stock Movement (Ledger Entry)
// =====================================================
export interface StockMovement {
  id: string;
  organization_id: string;

  // Movement Details
  movement_type: StockMovementType;
  movement_date: string; // ISO datetime

  // Item and Warehouse
  item_id: string;
  warehouse_id: string;

  // Quantity
  quantity: number; // Positive for IN, negative for OUT
  unit: string;

  // Balance After Movement
  balance_quantity: number;

  // Cost Information
  cost_per_unit: number | null;
  total_cost: number | null;

  // Reference to Stock Entry
  stock_entry_id: string | null;
  stock_entry_item_id: string | null;

  // Batch/Serial
  batch_number: string | null;
  serial_number: string | null;

  // Audit
  created_at: string;
  created_by: string | null;
}

// =====================================================
// Stock Movement with Related Data (Joined)
// =====================================================
export interface StockMovementWithDetails extends StockMovement {
  item: {
    id: string;
    name: string;
    sku: string | null;
  };
  warehouse: {
    id: string;
    name: string;
  };
  stock_entry?: {
    id: string;
    entry_number: string;
    entry_type: StockEntryType;
  };
}

// =====================================================
// Form Input Types
// =====================================================

// Create Stock Entry Input
export interface CreateStockEntryInput {
  organization_id: string;
  entry_type: StockEntryType;
  entry_date: string;
  from_warehouse_id?: string;
  to_warehouse_id?: string;
  reference_type?: ReferenceType;
  reference_id?: string;
  reference_number?: string;
  purpose?: string;
  notes?: string;
  items: CreateStockEntryItemInput[];
}

// Create Stock Entry Item Input
export interface CreateStockEntryItemInput {
  item_id: string;
  item_name: string;
  quantity: number;
  unit: string;
  source_warehouse_id?: string;
  target_warehouse_id?: string;
  batch_number?: string;
  serial_number?: string;
  expiry_date?: string;
  cost_per_unit?: number;
  system_quantity?: number; // For reconciliation
  physical_quantity?: number; // For reconciliation
  notes?: string;
}

// Update Stock Entry Input
export interface UpdateStockEntryInput {
  entry_date?: string;
  from_warehouse_id?: string;
  to_warehouse_id?: string;
  purpose?: string;
  notes?: string;
  status?: StockEntryStatus;
}

// =====================================================
// Filter and Search Types
// =====================================================
export interface StockEntryFilters {
  entry_type?: StockEntryType;
  status?: StockEntryStatus;
  from_date?: string;
  to_date?: string;
  warehouse_id?: string; // Either from or to warehouse
  reference_type?: ReferenceType;
  search?: string; // Search by entry number or notes
}

export interface StockMovementFilters {
  item_id?: string;
  warehouse_id?: string;
  movement_type?: StockMovementType;
  from_date?: string;
  to_date?: string;
  stock_entry_id?: string;
}

// =====================================================
// Summary and Analytics Types
// =====================================================
export interface StockEntrySummary {
  total_entries: number;
  by_type: Record<StockEntryType, number>;
  by_status: Record<StockEntryStatus, number>;
  recent_entries: StockEntry[];
}

export interface StockMovementSummary {
  item_id: string;
  item_name: string;
  total_in: number;
  total_out: number;
  net_movement: number; // total_in - total_out
  final_balance: number;
  movements_count: number;
}

// =====================================================
// UI Helper Types
// =====================================================
export interface StockEntryTypeConfig {
  type: StockEntryType;
  label: string;
  description: string;
  icon: string; // Lucide icon name
  color: string; // Tailwind color class
  requiresFromWarehouse: boolean;
  requiresToWarehouse: boolean;
  allowsReference: boolean;
  showReconciliationFields: boolean;
}

export const STOCK_ENTRY_TYPES: Record<StockEntryType, StockEntryTypeConfig> = {
  'Material Receipt': {
    type: 'Material Receipt',
    label: 'Material Receipt',
    description: 'Receive stock from purchases or production',
    icon: 'PackagePlus',
    color: 'green',
    requiresFromWarehouse: false,
    requiresToWarehouse: true,
    allowsReference: true,
    showReconciliationFields: false,
  },
  'Material Issue': {
    type: 'Material Issue',
    label: 'Material Issue',
    description: 'Issue stock for consumption or usage',
    icon: 'PackageMinus',
    color: 'orange',
    requiresFromWarehouse: true,
    requiresToWarehouse: false,
    allowsReference: true,
    showReconciliationFields: false,
  },
  'Stock Transfer': {
    type: 'Stock Transfer',
    label: 'Stock Transfer',
    description: 'Transfer stock between warehouses',
    icon: 'ArrowRightLeft',
    color: 'blue',
    requiresFromWarehouse: true,
    requiresToWarehouse: true,
    allowsReference: false,
    showReconciliationFields: false,
  },
  'Stock Reconciliation': {
    type: 'Stock Reconciliation',
    label: 'Stock Reconciliation',
    description: 'Adjust stock after physical count',
    icon: 'ClipboardCheck',
    color: 'purple',
    requiresFromWarehouse: false,
    requiresToWarehouse: true,
    allowsReference: false,
    showReconciliationFields: true,
  },
};

// Status badge colors
export const STOCK_ENTRY_STATUS_COLORS: Record<StockEntryStatus, string> = {
  Draft: 'bg-gray-100 text-gray-800',
  Submitted: 'bg-blue-100 text-blue-800',
  Posted: 'bg-green-100 text-green-800',
  Cancelled: 'bg-red-100 text-red-800',
};

// Movement type colors
export const MOVEMENT_TYPE_COLORS: Record<StockMovementType, string> = {
  IN: 'bg-green-100 text-green-800',
  OUT: 'bg-red-100 text-red-800',
  TRANSFER: 'bg-blue-100 text-blue-800',
};
