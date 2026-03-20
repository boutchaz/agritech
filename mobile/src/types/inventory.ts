// Inventory Types for Mobile App

// Stock Item
export interface StockItem {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  category: string;
  unit: string;
  current_stock: number;
  minimum_stock: number;
  unit_cost: number | null;
  location: string | null;
  supplier: string | null;
  sku: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Stock Entry (Movement)
export interface StockEntry {
  id: string;
  organization_id: string;
  item_id: string;
  entry_type: 'in' | 'out' | 'adjustment';
  quantity: number;
  unit_cost: number | null;
  total_cost: number | null;
  reference_type: 'purchase' | 'application' | 'harvest' | 'adjustment' | 'transfer' | null;
  reference_id: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  item?: StockItem;
}

// Warehouse
export interface Warehouse {
  id: string;
  organization_id: string;
  name: string;
  location: string | null;
  capacity: number | null;
  capacity_unit: string | null;
  manager: string | null;
  is_active: boolean;
  created_at: string;
}

// Low Stock Alert
export interface LowStockAlert {
  id: string;
  item_id: string;
  item_name: string;
  current_stock: number;
  minimum_stock: number;
  shortage_amount: number;
  created_at: string;
}

// Filters
export interface StockItemFilters {
  category?: string;
  is_active?: boolean;
  search?: string;
  low_stock?: boolean;
}

export interface StockEntryFilters {
  item_id?: string;
  entry_type?: 'in' | 'out' | 'adjustment';
  date_from?: string;
  date_to?: string;
}

// Input Types
export interface CreateStockItemInput {
  name: string;
  description?: string;
  category: string;
  unit: string;
  minimum_stock?: number;
  unit_cost?: number;
  location?: string;
  supplier?: string;
  sku?: string;
}

export interface UpdateStockItemInput {
  name?: string;
  description?: string;
  category?: string;
  unit?: string;
  minimum_stock?: number;
  unit_cost?: number;
  location?: string;
  supplier?: string;
  sku?: string;
  is_active?: boolean;
}

export interface CreateStockEntryInput {
  item_id: string;
  entry_type: 'in' | 'out' | 'adjustment';
  quantity: number;
  unit_cost?: number;
  reference_type?: 'purchase' | 'application' | 'harvest' | 'adjustment' | 'transfer';
  reference_id?: string;
  notes?: string;
}

// API Response Types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page?: number;
  limit?: number;
}
