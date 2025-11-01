// Opening Stock Balance Types

export type OpeningStockStatus = 'Draft' | 'Posted' | 'Cancelled';

export interface OpeningStockBalance {
  id: string;
  organization_id: string;
  item_id: string;
  warehouse_id: string;
  opening_date: string;
  quantity: number;
  valuation_rate: number;
  total_value?: number; // Computed field
  batch_number?: string | null;
  serial_numbers?: string[] | null;
  journal_entry_id?: string | null;
  status: OpeningStockStatus;
  posted_at?: string | null;
  posted_by?: string | null;
  notes?: string | null;
  created_at: string;
  created_by?: string | null;
  updated_at: string;

  // Expanded relations
  item?: {
    id: string;
    name: string;
    unit: string;
    category?: string | null;
  };
  warehouse?: {
    id: string;
    name: string;
  };
  journal_entry?: {
    id: string;
    entry_number?: string;
  };
}

export interface CreateOpeningStockInput {
  item_id: string;
  warehouse_id: string;
  opening_date: string;
  quantity: number;
  valuation_rate: number;
  batch_number?: string;
  serial_numbers?: string[];
  notes?: string;
}

export interface UpdateOpeningStockInput {
  item_id?: string;
  warehouse_id?: string;
  opening_date?: string;
  quantity?: number;
  valuation_rate?: number;
  batch_number?: string;
  serial_numbers?: string[];
  notes?: string;
}

export interface OpeningStockFilters {
  item_id?: string;
  warehouse_id?: string;
  status?: OpeningStockStatus;
  from_date?: string;
  to_date?: string;
}

// Stock Account Mapping Types
export type StockEntryTypeForAccounting =
  | 'Material Receipt'
  | 'Material Issue'
  | 'Stock Transfer'
  | 'Stock Reconciliation'
  | 'Opening Stock';

export interface StockAccountMapping {
  id: string;
  organization_id: string;
  entry_type: StockEntryTypeForAccounting;
  debit_account_id: string;
  credit_account_id: string;
  item_category?: string | null;
  created_at: string;
  updated_at: string;

  // Expanded relations
  debit_account?: {
    id: string;
    account_number: string;
    account_name: string;
  };
  credit_account?: {
    id: string;
    account_number: string;
    account_name: string;
  };
}

export interface CreateStockAccountMappingInput {
  entry_type: StockEntryTypeForAccounting;
  debit_account_id: string;
  credit_account_id: string;
  item_category?: string;
}

export interface UpdateStockAccountMappingInput {
  debit_account_id?: string;
  credit_account_id?: string;
  item_category?: string;
}

// UI Configuration
export const OPENING_STOCK_STATUS_COLORS: Record<OpeningStockStatus, string> = {
  Draft: 'bg-gray-100 text-gray-700 border-gray-300',
  Posted: 'bg-green-100 text-green-700 border-green-300',
  Cancelled: 'bg-red-100 text-red-700 border-red-300',
};

export const STOCK_ENTRY_TYPES_FOR_MAPPING: Array<{
  value: StockEntryTypeForAccounting;
  label: string;
  description: string;
}> = [
  {
    value: 'Opening Stock',
    label: 'Opening Stock',
    description: 'Initial inventory balance when starting the system',
  },
  {
    value: 'Material Receipt',
    label: 'Material Receipt',
    description: 'Goods received into inventory',
  },
  {
    value: 'Material Issue',
    label: 'Material Issue',
    description: 'Goods issued from inventory',
  },
  {
    value: 'Stock Transfer',
    label: 'Stock Transfer',
    description: 'Goods transferred between warehouses',
  },
  {
    value: 'Stock Reconciliation',
    label: 'Stock Reconciliation',
    description: 'Physical count adjustments',
  },
];
