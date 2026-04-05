/**
 * Item Master System Types
 * Comprehensive types for ERPNext-style item management
 */

// =====================================================
// Enums
// =====================================================

export type ValuationMethod = 'FIFO' | 'Moving Average' | 'LIFO';
export type PriceListType = 'selling' | 'buying';
export type Seasonality = 'spring' | 'summer' | 'autumn' | 'winter' | 'year-round';

// =====================================================
// Item Group
// =====================================================

export interface ItemGroup {
  id: string;
  organization_id: string;
  
  // Basic Information
  name: string;
  code?: string;
  description?: string;
  
  // Hierarchy
  parent_group_id?: string;
  path?: string; // Materialized path: 'Agriculture/Crops/Fruits/Olives'
  
  // Defaults
  default_sales_account_id?: string;
  default_expense_account_id?: string;
  default_cost_center_id?: string;
  default_tax_id?: string;
  default_warehouse_id?: string;
  
  // Display
  image_url?: string;
  sort_order?: number;
  
  // Status
  is_active: boolean;
  
  // Audit
  created_at: string;
  created_by?: string;
  updated_at: string;
  updated_by?: string;
  
  // Joined data
  parent_group?: ItemGroup;
  children?: ItemGroup[];
  items_count?: number;
}

export interface ItemGroupWithChildren extends ItemGroup {
  children: ItemGroup[];
  items_count: number;
}

// =====================================================
// Item
// =====================================================

export interface Item {
  id: string;
  organization_id: string;
  
  // Identification
  item_code: string; // Unique SKU: "OLIV-FRUIT-001"
  item_name: string; // Display name: "Olives - Picholine"
  description?: string;
  
  // Categorization
  item_group_id: string;
  brand?: string;
  
  // Status Flags
  is_active: boolean;
  is_sales_item: boolean;
  is_purchase_item: boolean;
  is_stock_item: boolean;
  
  // Units of Measure
  default_unit: string; // Primary UoM: "kg"
  stock_uom: string; // Stock keeping unit
  
  // Inventory Settings
  maintain_stock: boolean;
  has_batch_no: boolean;
  has_serial_no: boolean;
  has_expiry_date: boolean;
  minimum_stock_level?: number; // Minimum stock level for low stock alerts
  
  // Valuation
  valuation_method: ValuationMethod;
  
  // Defaults
  default_sales_account_id?: string;
  default_expense_account_id?: string;
  default_cost_center_id?: string;
  default_warehouse_id?: string;
  
  // Pricing
  standard_rate?: number;
  last_purchase_rate?: number;
  last_sales_rate?: number;
  
  // Dimensions & Weight
  weight_per_unit?: number;
  weight_uom?: string;
  length?: number;
  width?: number;
  height?: number;
  volume?: number;
  
  // Barcode & External IDs
  barcode?: string;
  manufacturer_code?: string;
  supplier_part_number?: string;
  
  // Tax Settings
  item_tax_template_id?: string;
  
  // Quality & Inspection
  inspection_required_before_purchase: boolean;
  inspection_required_before_delivery: boolean;
  
  // Agricultural Specific
  crop_type?: string; // 'olive', 'citrus', 'grape', etc.
  variety?: string; // 'Picholine', 'Manzanilla', etc.
  seasonality?: Seasonality;
  shelf_life_days?: number;
  
  // Website/Portal
  show_in_website: boolean;
  website_image_url?: string;
  website_description?: string;
  marketplace_category_slug?: string; // Strapi marketplace category slug

  // Images & Media
  image_url?: string;
  images?: string[];
  
  // Notes
  notes?: string;
  
  // Audit
  created_at: string;
  created_by?: string;
  updated_at: string;
  updated_by?: string;
  
  // Joined data
  item_group?: ItemGroup;
  variants?: ItemVariant[];
  product_variants?: ProductVariant[];
  unit_conversions?: ItemUnitConversion[];
  supplier_details?: ItemSupplierDetail[];
  customer_details?: ItemCustomerDetail[];
  prices?: ItemPrice[];
}

export interface ItemWithDetails extends Item {
  item_group: ItemGroup;
  variants: ItemVariant[];
  unit_conversions: ItemUnitConversion[];
  current_stock?: number;
  current_warehouse_id?: string;
}

// =====================================================
// Item Variant
// =====================================================

export interface ItemVariant {
  id: string;
  item_id: string;
  
  variant_code: string; // e.g., "OLIV-FRUIT-001-PACK-500G"
  variant_name: string; // e.g., "Olives Picholine - 500g Package"
  
  // Attributes
  attribute_1_name?: string;
  attribute_1_value?: string;
  attribute_2_name?: string;
  attribute_2_value?: string;
  attribute_3_name?: string;
  attribute_3_value?: string;
  
  // Overrides
  standard_rate?: number;
  weight_per_unit?: number;
  
  // Status
  is_active: boolean;
  
  // Audit
  created_at: string;
  updated_at: string;
  
  // Joined data
  item?: Item;
}

// =====================================================
// Product Variant (Stock Dimensions)
// =====================================================

export interface ProductVariant {
  id: string;
  organization_id: string;
  item_id: string;
  variant_name: string;
  variant_sku?: string | null;
  quantity?: number | null;
  unit_id?: string | null; // Reference to work_units table
  min_stock_level?: number | null;
  standard_rate?: number | null;
  last_purchase_rate?: number | null;
  barcode?: string | null;
  is_active: boolean;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateProductVariantInput {
  organization_id: string;
  item_id: string;
  variant_name: string;
  variant_sku?: string;
  unit_id?: string; // Reference to work_units table
  min_stock_level?: number;
  standard_rate?: number;
  last_purchase_rate?: number;
  barcode?: string;
  is_active?: boolean;
  notes?: string;
}

export interface UpdateProductVariantInput {
  variant_name?: string;
  variant_sku?: string | null;
  unit_id?: string | null; // Reference to work_units table
  min_stock_level?: number | null;
  standard_rate?: number | null;
  last_purchase_rate?: number | null;
  barcode?: string | null;
  is_active?: boolean;
  notes?: string | null;
}

// =====================================================
// Item Unit Conversion
// =====================================================

export interface ItemUnitConversion {
  id: string;
  item_id: string;
  
  from_unit: string;
  to_unit: string;
  conversion_factor: number; // e.g., 1 box = 10 kg, factor = 10
  
  created_at: string;
  
  // Joined data
  item?: Item;
}

// =====================================================
// Item Supplier Detail
// =====================================================

export interface ItemSupplierDetail {
  id: string;
  item_id: string;
  supplier_id: string;
  
  supplier_part_number?: string;
  supplier_item_name?: string;
  
  // Procurement
  lead_time_days?: number;
  last_purchase_rate?: number;
  minimum_order_quantity?: number;
  
  // Status
  is_active: boolean;
  
  // Audit
  created_at: string;
  updated_at: string;
  
  // Joined data
  item?: Item;
  supplier?: {
    id: string;
    name: string;
  };
}

// =====================================================
// Item Customer Detail
// =====================================================

export interface ItemCustomerDetail {
  id: string;
  item_id: string;
  customer_id: string;
  
  ref_code?: string;
  customer_item_name?: string;
  max_discount_percent?: number;
  
  created_at: string;
  updated_at: string;
  
  // Joined data
  item?: Item;
  customer?: {
    id: string;
    name: string;
  };
}

// =====================================================
// Item Price
// =====================================================

export interface ItemPrice {
  id: string;
  organization_id: string;
  item_id: string;
  
  price_list_name: string; // e.g., "Standard", "Wholesale", "Retail"
  price_list_type: PriceListType;
  
  unit: string;
  rate: number;
  
  // Validity
  valid_from?: string;
  valid_upto?: string;
  
  // Customer/Supplier specific
  customer_id?: string;
  supplier_id?: string;
  
  // Status
  is_active: boolean;
  
  // Audit
  created_at: string;
  updated_at: string;
  
  // Joined data
  item?: Item;
  customer?: {
    id: string;
    name: string;
  };
  supplier?: {
    id: string;
    name: string;
  };
}

// =====================================================
// Form Input Types
// =====================================================

export interface CreateItemGroupInput {
  organization_id: string;
  name: string;
  code?: string;
  description?: string;
  parent_group_id?: string;
  default_sales_account_id?: string;
  default_expense_account_id?: string;
  default_cost_center_id?: string;
  default_tax_id?: string;
  default_warehouse_id?: string;
  image_url?: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface UpdateItemGroupInput {
  name?: string;
  code?: string;
  description?: string;
  parent_group_id?: string;
  default_sales_account_id?: string;
  default_expense_account_id?: string;
  default_cost_center_id?: string;
  default_tax_id?: string;
  default_warehouse_id?: string;
  image_url?: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface CreateItemInput {
  organization_id: string;
  item_code?: string; // Auto-generated if not provided
  item_name: string;
  description?: string;
  item_group_id: string;
  brand?: string;
  is_active?: boolean;
  is_sales_item?: boolean;
  is_purchase_item?: boolean;
  is_stock_item?: boolean;
  default_unit: string;
  stock_uom?: string;
  maintain_stock?: boolean;
  has_batch_no?: boolean;
  has_serial_no?: boolean;
  has_expiry_date?: boolean;
  minimum_stock_level?: number;
  valuation_method?: ValuationMethod;
  default_sales_account_id?: string;
  default_expense_account_id?: string;
  default_cost_center_id?: string;
  default_warehouse_id?: string;
  standard_rate?: number;
  weight_per_unit?: number;
  weight_uom?: string;
  barcode?: string;
  manufacturer_code?: string;
  supplier_part_number?: string;
  item_tax_template_id?: string;
  inspection_required_before_purchase?: boolean;
  inspection_required_before_delivery?: boolean;
  crop_type?: string;
  variety?: string;
  seasonality?: Seasonality;
  shelf_life_days?: number;
  show_in_website?: boolean;
  website_image_url?: string;
  website_description?: string;
  marketplace_category_slug?: string;
  image_url?: string;
  images?: string[];
  notes?: string;
}

export interface UpdateItemInput {
  item_name?: string;
  description?: string;
  item_group_id?: string;
  brand?: string;
  is_active?: boolean;
  is_sales_item?: boolean;
  is_purchase_item?: boolean;
  is_stock_item?: boolean;
  default_unit?: string;
  stock_uom?: string;
  maintain_stock?: boolean;
  has_batch_no?: boolean;
  has_serial_no?: boolean;
  has_expiry_date?: boolean;
  minimum_stock_level?: number;
  valuation_method?: ValuationMethod;
  default_sales_account_id?: string;
  default_expense_account_id?: string;
  default_cost_center_id?: string;
  default_warehouse_id?: string;
  standard_rate?: number;
  weight_per_unit?: number;
  weight_uom?: string;
  barcode?: string;
  manufacturer_code?: string;
  supplier_part_number?: string;
  item_tax_template_id?: string;
  inspection_required_before_purchase?: boolean;
  inspection_required_before_delivery?: boolean;
  crop_type?: string;
  variety?: string;
  seasonality?: Seasonality;
  shelf_life_days?: number;
  show_in_website?: boolean;
  website_image_url?: string;
  website_description?: string;
  marketplace_category_slug?: string;
  image_url?: string;
  images?: string[];
  notes?: string;
}

// =====================================================
// Filter and Search Types
// =====================================================

export interface ItemGroupFilters {
  parent_group_id?: string;
  is_active?: boolean;
  search?: string;
}

export interface ItemFilters {
  item_group_id?: string;
  is_active?: boolean;
  is_sales_item?: boolean;
  is_purchase_item?: boolean;
  is_stock_item?: boolean;
  crop_type?: string;
  variety?: string;
  search?: string; // Search by item_code, item_name, or barcode
  farm_id?: string; // Filter by farm (via warehouses)
  low_stock_only?: boolean; // Show only items with low stock
}

// =====================================================
// Summary and Analytics Types
// =====================================================

export interface ItemSummary {
  total_items: number;
  active_items: number;
  sales_items: number;
  purchase_items: number;
  stock_items: number;
  by_group: Record<string, number>;
  recent_items: Item[];
}

export interface ItemPriceSummary {
  item_id: string;
  item_name: string;
  item_code: string;
  standard_rate?: number;
  last_purchase_rate?: number;
  last_sales_rate?: number;
  price_lists: ItemPrice[];
}

// =====================================================
// UI Helper Types
// =====================================================

export interface ItemGroupTree {
  id: string;
  name: string;
  path: string;
  children: ItemGroupTree[];
  items_count: number;
  level: number;
}

export interface ItemSelectionOption {
  id: string;
  item_code: string;
  item_name: string;
  default_unit: string;
  standard_rate?: number;
  item_group?: {
    id: string;
    name: string;
  };
}

export interface FarmStockLevel {
  farm_id: string | null;
  farm_name: string | null;
  warehouse_id: string;
  warehouse_name: string;
  item_id: string;
  total_quantity: number;
  total_value: number;
  is_low_stock: boolean;
  minimum_stock_level?: number;
}

export interface FarmStockLevelsByItem {
  item_id: string;
  item_code: string;
  item_name: string;
  default_unit: string;
  minimum_stock_level?: number;
  total_quantity: number;
  total_value: number;
  is_low_stock: boolean;
  by_farm: FarmStockLevel[];
}

export interface ItemFarmUsage {
  farm_id: string;
  farm_name: string;
  parcel_id?: string;
  parcel_name?: string;
  usage_count: number;
  last_used_date?: string;
  total_quantity_used: number;
  task_ids: string[];
  tasks?: { id: string; title: string }[];
  parcels?: ItemFarmUsage[];
}

export interface ItemUsageSummary {
  item_id: string;
  total_usage_count: number;
  last_used_date?: string;
  total_quantity_used: number;
  by_farm: ItemFarmUsage[];
}
