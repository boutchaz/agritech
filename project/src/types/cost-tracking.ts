export interface CostCategory {
  id: string;
  organization_id: string;
  name: string;
  type: 'labor' | 'materials' | 'utilities' | 'equipment' | 'other';
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Cost {
  id: string;
  organization_id: string;
  farm_id?: string;
  parcel_id?: string;
  category_id?: string;
  cost_type: 'labor' | 'materials' | 'utilities' | 'equipment' | 'product_application' | 'other';
  amount: number;
  currency: string;
  date: string;
  description?: string;
  reference_id?: string;
  reference_type?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  category?: CostCategory;
  parcel?: {
    id: string;
    name: string;
  };
}

export interface Revenue {
  id: string;
  organization_id: string;
  farm_id?: string;
  parcel_id?: string;
  revenue_type: 'harvest' | 'subsidy' | 'other';
  amount: number;
  currency: string;
  date: string;
  crop_type?: string;
  quantity?: number;
  unit?: string;
  price_per_unit?: number;
  description?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  parcel?: {
    id: string;
    name: string;
  };
}

export interface ProfitabilitySnapshot {
  id: string;
  organization_id: string;
  farm_id?: string;
  parcel_id?: string;
  period_start: string;
  period_end: string;
  total_costs: number;
  total_revenue: number;
  net_profit: number;
  profit_margin?: number;
  currency: string;
  cost_breakdown?: Record<string, number>;
  revenue_breakdown?: Record<string, number>;
  created_at: string;
  updated_at: string;
}

export interface ProfitabilityData {
  parcel_id?: string;
  parcel_name?: string;
  total_costs: number;
  total_revenue: number;
  net_profit: number;
  profit_margin?: number;
  cost_breakdown: Record<string, number>;
  revenue_breakdown: Record<string, number>;
}

export interface ProfitabilityFilters {
  organization_id: string;
  parcel_id?: string;
  start_date?: string;
  end_date?: string;
  farm_id?: string;
}

export interface CostFormData {
  cost_type: Cost['cost_type'];
  amount: number;
  date: string;
  parcel_id?: string;
  category_id?: string;
  description?: string;
  notes?: string;
}

export interface RevenueFormData {
  revenue_type: Revenue['revenue_type'];
  amount: number;
  date: string;
  parcel_id?: string;
  crop_type?: string;
  quantity?: number;
  unit?: string;
  price_per_unit?: number;
  description?: string;
  notes?: string;
}