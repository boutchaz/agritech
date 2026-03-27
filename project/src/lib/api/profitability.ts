import { apiClient } from '../api-client';

const BASE_URL = '/api/v1/profitability';

export enum CostType {
  MATERIALS = 'materials',
  LABOR = 'labor',
  UTILITIES = 'utilities',
  EQUIPMENT = 'equipment',
  OTHER = 'other',
}

export enum RevenueType {
  HARVEST = 'harvest',
  SUBSIDY = 'subsidy',
  OTHER = 'other',
}

export interface Cost {
  id: string;
  organization_id: string;
  parcel_id: string;
  crop_cycle_id?: string;
  cost_type: CostType;
  amount: number;
  date: string;
  description?: string;
  notes?: string;
  currency?: string;
  category_id?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  parcel?: {
    id: string;
    name: string;
  };
  category?: {
    name: string;
    type: string;
  };
  crop_cycle?: {
    id: string;
    cycle_code: string;
    cycle_name?: string;
    crop_type: string;
  };
}

export interface Revenue {
  id: string;
  organization_id: string;
  parcel_id: string;
  crop_cycle_id?: string;
  revenue_type: RevenueType;
  amount: number;
  date: string;
  crop_type?: string;
  quantity?: number;
  unit?: string;
  price_per_unit?: number;
  description?: string;
  notes?: string;
  currency?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  parcel?: {
    id: string;
    name: string;
  };
  crop_cycle?: {
    id: string;
    cycle_code: string;
    cycle_name?: string;
    crop_type: string;
  };
}

export interface CreateCostDto {
  parcel_id: string;
  crop_cycle_id?: string;
  cost_type: CostType;
  amount: number;
  date: string;
  description?: string;
  notes?: string;
  currency?: string;
  category_id?: string;
}

export interface CreateRevenueDto {
  parcel_id: string;
  crop_cycle_id?: string;
  revenue_type: RevenueType;
  amount: number;
  date: string;
  crop_type?: string;
  quantity?: number;
  unit?: string;
  price_per_unit?: number;
  description?: string;
  notes?: string;
  currency?: string;
}

export interface ProfitabilityFilters {
  start_date?: string;
  end_date?: string;
  parcel_id?: string;
}

export interface ProfitabilityData {
  totalCosts: number;
  totalRevenue: number;
  netProfit: number;
  profitMargin: number;
  costBreakdown: Record<string, number>;
  revenueBreakdown: Record<string, number>;
  byParcel: Array<{
    parcel_id: string | null;
    parcel_name: string;
    total_costs: number;
    total_revenue: number;
    net_profit: number;
    profit_margin?: number;
    cost_breakdown: Record<string, number>;
    revenue_breakdown: Record<string, number>;
  }>;
}

export interface ParcelProfitabilityData {
  // Grand totals (accounting + operational)
  totalCosts: number;
  totalRevenue: number;
  netProfit: number;
  profitMargin: number;
  // Accounting sub-totals only
  accountingCosts?: number;
  accountingRevenue?: number;
  // Legacy data
  costs: Cost[];
  revenues: Revenue[];
  categoryBreakdown: Array<{
    category_id: string | null;
    category_name: string;
    cost_type: string;
    total_amount: number;
    transaction_count: number;
  }>;
  costTypeBreakdown: Array<{
    cost_type: string;
    total_amount: number;
    transaction_count: number;
  }>;
  revenueTypeBreakdown: Array<{
    revenue_type: string;
    total_amount: number;
    transaction_count: number;
  }>;
  monthlyData: Array<{
    month: string;
    costs: number;
    revenue: number;
    profit: number;
  }>;
  // Ledger data from journal entries
  ledgerExpenses: Array<{
    id: string;
    debit: number;
    credit: number;
    account_code: string;
    account_name: string;
    account_type: string;
    entry_date: string;
    entry_number: string;
    cost_center_name?: string;
    parcel_name?: string;
    description?: string;
  }>;
  ledgerRevenues: Array<{
    id: string;
    debit: number;
    credit: number;
    account_code: string;
    account_name: string;
    account_type: string;
    entry_date: string;
    entry_number: string;
    cost_center_name?: string;
    parcel_name?: string;
    description?: string;
  }>;
  ledgerExpenseTotal?: number;
  ledgerRevenueTotal?: number;
  accountBreakdown: Array<{
    account_code: string;
    account_name: string;
    account_type: string;
    total_debit: number;
    total_credit: number;
    net_amount: number;
  }>;
  costCenterBreakdown: Array<{
    cost_center_name: string;
    expense_amount: number;
    revenue_amount: number;
    net_amount: number;
  }>;
  // Operational data
  taskLaborCosts?: Array<{
    id: string;
    work_date: string;
    total_payment: number;
    hours_worked?: number;
    hourly_rate?: number;
    payment_status: string;
    task_description: string;
    task_id: string;
    task_title: string;
    worker_type?: string;
  }>;
  taskLaborTotal?: number;
  materialCosts?: Array<{
    id: string;
    application_date: string;
    quantity_used: number;
    cost: number;
    currency?: string;
    task_id?: string;
    task_title?: string;
    item_name?: string;
  }>;
  materialCostTotal?: number;
  harvestRevenues?: Array<{
    id: string;
    harvest_date: string;
    quantity: number;
    unit?: string;
    expected_price_per_unit?: number;
    estimated_revenue: number;
    lot_number?: string;
    crop_type?: string;
  }>;
  harvestRevenueTotal?: number;
  metayageSettlements?: Array<{
    id: string;
    payment_date?: string;
    gross_revenue: number;
    net_revenue: number;
    total_charges?: number;
    worker_share_amount?: number;
    worker_percentage?: number;
    payment_status: string;
  }>;
  metayageTotal?: number;
}

export interface Parcel {
  id: string;
  name: string;
}

export const profitabilityApi = {
  /**
   * Get parcels for profitability analysis
   */
  async getParcels(organizationId?: string): Promise<Parcel[]> {
    return apiClient.get<Parcel[]>(`${BASE_URL}/parcels`, {}, organizationId);
  },

  /**
   * Get costs with filters
   */
  async getCosts(filters: ProfitabilityFilters, organizationId?: string): Promise<Cost[]> {
    const params = new URLSearchParams();
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    if (filters.parcel_id) params.append('parcel_id', filters.parcel_id);

    const queryString = params.toString();
    const url = `${BASE_URL}/costs${queryString ? `?${queryString}` : ''}`;
    return apiClient.get<Cost[]>(url, {}, organizationId);
  },

  /**
   * Get revenues with filters
   */
  async getRevenues(filters: ProfitabilityFilters, organizationId?: string): Promise<Revenue[]> {
    const params = new URLSearchParams();
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    if (filters.parcel_id) params.append('parcel_id', filters.parcel_id);

    const queryString = params.toString();
    const url = `${BASE_URL}/revenues${queryString ? `?${queryString}` : ''}`;
    return apiClient.get<Revenue[]>(url, {}, organizationId);
  },

  /**
   * Get profitability analytics
   */
  async getProfitability(
    filters: ProfitabilityFilters,
    organizationId?: string,
  ): Promise<ProfitabilityData> {
    const params = new URLSearchParams();
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    if (filters.parcel_id) params.append('parcel_id', filters.parcel_id);

    const queryString = params.toString();
    const url = `${BASE_URL}/analytics${queryString ? `?${queryString}` : ''}`;
    return apiClient.get<ProfitabilityData>(url, {}, organizationId);
  },

  /**
   * Create a new cost
   */
  async createCost(data: CreateCostDto, organizationId?: string): Promise<Cost> {
    return apiClient.post<Cost>(`${BASE_URL}/costs`, data, {}, organizationId);
  },

  /**
   * Create a new revenue
   */
  async createRevenue(data: CreateRevenueDto, organizationId?: string): Promise<Revenue> {
    return apiClient.post<Revenue>(`${BASE_URL}/revenues`, data, {}, organizationId);
  },

  /**
   * Get comprehensive profitability data for a parcel
   */
  async getParcelProfitability(
    parcelId: string,
    startDate: string,
    endDate: string,
    organizationId?: string,
  ): Promise<ParcelProfitabilityData> {
    const params = new URLSearchParams();
    params.append('start_date', startDate);
    params.append('end_date', endDate);

    const queryString = params.toString();
    const url = `${BASE_URL}/parcel/${parcelId}?${queryString}`;
    return apiClient.get<ParcelProfitabilityData>(url, {}, organizationId);
  },

  /**
   * Get journal entries for a parcel
   */
  async getJournalEntriesForParcel(
    parcelId: string,
    startDate: string,
    endDate: string,
    organizationId?: string,
  ): Promise<any[]> {
    const params = new URLSearchParams();
    params.append('start_date', startDate);
    params.append('end_date', endDate);

    const queryString = params.toString();
    const url = `${BASE_URL}/parcel/${parcelId}/journal-entries?${queryString}`;
    return apiClient.get<any[]>(url, {}, organizationId);
  },

  /**
   * Get account mappings for profitability journal entries
   * Returns mapped accounts for expense types, revenue types, and cash
   */
  async getAccountMappings(organizationId?: string): Promise<AccountMappings> {
    return apiClient.get<AccountMappings>(`${BASE_URL}/account-mappings`, {}, organizationId);
  },
};

export interface AccountMappings {
  expense: Record<string, { id: string; code: string; name: string }>;
  revenue: Record<string, { id: string; code: string; name: string }>;
  cash: { id: string; code: string; name: string } | null;
  defaultExpense: { id: string; code: string; name: string } | null;
  defaultRevenue: { id: string; code: string; name: string } | null;
}
