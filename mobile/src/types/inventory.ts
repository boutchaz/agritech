// Inventory Types for Mobile App
// Aligned with backend models: /items, /warehouses, /stock-entries

// Item (from items table)
export interface Item {
  id: string;
  organization_id: string;
  item_code: string | null;
  item_name: string;
  item_group_id: string | null;
  description: string | null;
  default_unit: string | null;
  unit_of_measure: string | null;
  is_stock_item: boolean;
  is_sales_item: boolean;
  is_purchase_item: boolean;
  is_active: boolean;
  standard_rate: number | null;
  minimum_stock_level: number | null;
  reorder_level: number | null;
  reorder_quantity: number | null;
  barcode: string | null;
  image_url: string | null;
  crop_type: string | null;
  variety: string | null;
  created_at: string;
  updated_at: string;
  item_group?: {
    id: string;
    name: string;
    code: string | null;
    path: string | null;
  } | null;
}

// Stock Entry (document-based with line items)
export interface StockEntry {
  id: string;
  organization_id: string;
  entry_number: string;
  entry_type: StockEntryType;
  entry_date: string;
  from_warehouse_id: string | null;
  to_warehouse_id: string | null;
  reference_type: string | null;
  reference_id: string | null;
  reference_number: string | null;
  status: StockEntryStatus;
  purpose: string | null;
  notes: string | null;
  created_at: string;
  created_by: string;
  from_warehouse?: { id: string; name: string } | null;
  to_warehouse?: { id: string; name: string } | null;
  items?: StockEntryItem[];
}

export interface StockEntryItem {
  id: string;
  stock_entry_id: string;
  item_id: string;
  item_name: string | null;
  quantity: number;
  unit: string;
  cost_per_unit: number | null;
  total_cost: number | null;
  batch_number: string | null;
  notes: string | null;
  item?: {
    id: string;
    item_code: string | null;
    item_name: string;
    default_unit: string | null;
  } | null;
}

export type StockEntryType =
  | 'Material Receipt'
  | 'Material Issue'
  | 'Stock Transfer'
  | 'Stock Reconciliation';

export type StockEntryStatus = 'Draft' | 'Posted' | 'Cancelled';

// Stock Movement
export interface StockMovement {
  id: string;
  movement_type: 'IN' | 'OUT' | 'TRANSFER';
  movement_date: string;
  item_id: string;
  warehouse_id: string;
  quantity: number;
  unit: string;
  balance_quantity: number;
  cost_per_unit: number | null;
  total_cost: number | null;
  stock_entry_id: string | null;
  created_at: string;
}

// Warehouse
export interface Warehouse {
  id: string;
  organization_id: string;
  name: string;
  location: string | null;
  address: string | null;
  city: string | null;
  capacity: number | null;
  capacity_unit: string | null;
  manager_id: string | null;
  farm_id: string | null;
  is_active: boolean;
  created_at: string;
}

// Filters
export interface ItemFilters {
  item_group_id?: string;
  is_active?: boolean;
  is_stock_item?: boolean;
  search?: string;
}

export interface StockEntryFilters {
  entry_type?: StockEntryType;
  status?: StockEntryStatus;
  warehouse_id?: string;
  from_date?: string;
  to_date?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface StockMovementFilters {
  item_id?: string;
  warehouse_id?: string;
  movement_type?: 'IN' | 'OUT' | 'TRANSFER';
  from_date?: string;
  to_date?: string;
}

// Input Types
export interface CreateItemInput {
  item_name: string;
  item_code?: string;
  item_group_id?: string;
  description?: string;
  default_unit?: string;
  is_stock_item?: boolean;
  standard_rate?: number;
  minimum_stock_level?: number;
  reorder_level?: number;
  barcode?: string;
}

export interface UpdateItemInput {
  item_name?: string;
  item_code?: string;
  item_group_id?: string;
  description?: string;
  default_unit?: string;
  is_stock_item?: boolean;
  is_active?: boolean;
  standard_rate?: number;
  minimum_stock_level?: number;
  reorder_level?: number;
  barcode?: string;
}

export interface CreateStockEntryInput {
  entry_type: StockEntryType;
  entry_date: string;
  from_warehouse_id?: string;
  to_warehouse_id?: string;
  reference_number?: string;
  purpose?: string;
  notes?: string;
  items: CreateStockEntryItemInput[];
}

export interface CreateStockEntryItemInput {
  item_id: string;
  quantity: number;
  unit: string;
  cost_per_unit?: number;
  batch_number?: string;
  notes?: string;
}

// API Response Types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Convenience type for backward compat in components
// Maps backend Item to the shape screens use
export interface StockItem {
  id: string;
  name: string;
  item_code: string | null;
  description: string | null;
  category: string;
  unit: string;
  current_stock: number;
  minimum_stock: number;
  unit_cost: number | null;
  is_active: boolean;
  sku: string | null;
  created_at: string;
}

// Low Stock Alert (computed from items + stock levels)
export interface LowStockAlert {
  id: string;
  item_id: string;
  item_name: string;
  current_stock: number;
  minimum_stock: number;
  shortage_amount: number;
  created_at: string;
}

// Helper to convert Item + stock level to StockItem for display
export function toStockItem(item: Item, stockQty?: number): StockItem {
  return {
    id: item.id,
    name: item.item_name,
    item_code: item.item_code,
    description: item.description,
    category: item.item_group?.name || 'Uncategorized',
    unit: item.default_unit || item.unit_of_measure || 'unit',
    current_stock: stockQty ?? 0,
    minimum_stock: item.minimum_stock_level ?? 0,
    unit_cost: item.standard_rate,
    is_active: item.is_active,
    sku: item.item_code,
    created_at: item.created_at,
  };
}
