import { apiClient } from '../api-client';
import type {
  StockEntry,
  StockEntryWithItems,
  StockMovementWithDetails,
  CreateStockEntryInput,
  UpdateStockEntryInput,
  StockEntryFilters,
  StockMovementFilters,
} from '../../types/stock-entries';

const BASE_URL = '/api/v1/stock-entries';

// =====================================================
// Response types for Sprint 5-7 endpoints
// =====================================================

export interface StockDashboardData {
  totalStockValue: number;
  lowStockAlertsCount: number;
  pendingEntriesCount: number;
  recentMovementsCount: number;
  warehouseCount: number;
}

export interface BatchData {
  id: string;
  batchNumber: string;
  itemId: string;
  warehouseId: string;
  itemName: string;
  warehouseName: string;
  remainingQuantity: number;
  unit: string;
  costPerUnit: number;
  totalValue: number;
  expiryDate: string | null;
  receivedDate: string;
  valuationDate: string;
}

export interface ExpiryAlertData {
  id: string;
  itemName: string;
  batchNumber: string;
  warehouseName: string;
  expiryDate: string;
  daysUntilExpiry: number;
  quantity: number;
  unit: string;
  urgency: 'expired' | 'critical' | 'warning' | 'attention';
}

export interface ReorderSuggestionData {
  itemId: string;
  itemCode: string;
  itemName: string;
  currentStock: number;
  reorderPoint: number;
  shortfall: number;
  suggestedOrderQty: number;
  unit: string;
}

export interface ApprovalData {
  id: string;
  entryId: string;
  entryNumber: string;
  entryType: string;
  entryDate: string;
  requestedByName: string;
  warehouseName: string;
  totalItems: number;
  totalValue: number;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
}

export const stockEntriesApi = {
  /**
   * Get all stock entries with optional filters
   */
  async getAll(filters?: StockEntryFilters, organizationId?: string): Promise<StockEntry[]> {
    const params = new URLSearchParams();

    if (filters?.entry_type) params.append('entry_type', filters.entry_type);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.from_date) params.append('from_date', filters.from_date);
    if (filters?.to_date) params.append('to_date', filters.to_date);
    if (filters?.warehouse_id) params.append('warehouse_id', filters.warehouse_id);
    if (filters?.reference_type) params.append('reference_type', filters.reference_type);
    if (filters?.crop_cycle_id) params.append('crop_cycle_id', filters.crop_cycle_id);
    if (filters?.search) params.append('search', filters.search);

    const url = `${BASE_URL}${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await apiClient.get<{ data: StockEntry[] }>(url, {}, organizationId);
    return res.data || [];
  },

  /**
   * Get a single stock entry with items
   */
  async getOne(id: string, organizationId?: string): Promise<StockEntryWithItems> {
    return apiClient.get<StockEntryWithItems>(`${BASE_URL}/${id}`, {}, organizationId);
  },

  /**
   * Create a new stock entry
   */
  async create(data: CreateStockEntryInput, organizationId?: string): Promise<StockEntry> {
    return apiClient.post<StockEntry>(BASE_URL, data, {}, organizationId);
  },

  /**
   * Update a draft stock entry
   */
  async update(id: string, data: UpdateStockEntryInput, organizationId?: string): Promise<StockEntry> {
    return apiClient.patch<StockEntry>(`${BASE_URL}/${id}`, data, {}, organizationId);
  },

  /**
   * Post/finalize a stock entry
   */
  async post(id: string, organizationId?: string): Promise<{ message: string }> {
    return apiClient.patch<{ message: string }>(`${BASE_URL}/${id}/post`, {}, {}, organizationId);
  },

  /**
   * Cancel a stock entry
   */
    async cancel(id: string, organizationId?: string): Promise<StockEntry> {
     return apiClient.patch<StockEntry>(`${BASE_URL}/${id}/cancel`, {}, {}, organizationId);
   },

   async reverse(id: string, reason: string, organizationId?: string): Promise<{
     original_entry_id: string;
     reversal_entry_id: string;
     reversal_number: string;
     message: string;
   }> {
     return apiClient.post(`${BASE_URL}/${id}/reverse`, { reason }, {}, organizationId);
   },

  /**
   * Delete a draft stock entry
   */
  async delete(id: string, organizationId?: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`${BASE_URL}/${id}`, {}, organizationId);
  },

  /**
   * Get stock movements with filters
   */
  async getMovements(filters?: StockMovementFilters, organizationId?: string): Promise<StockMovementWithDetails[]> {
    const params = new URLSearchParams();

    if (filters?.item_id) params.append('item_id', filters.item_id);
    if (filters?.warehouse_id) params.append('warehouse_id', filters.warehouse_id);
    if (filters?.movement_type) params.append('movement_type', filters.movement_type);
    if (filters?.from_date) params.append('from_date', filters.from_date);
    if (filters?.to_date) params.append('to_date', filters.to_date);
    if (filters?.stock_entry_id) params.append('stock_entry_id', filters.stock_entry_id);
    if (filters?.crop_cycle_id) params.append('crop_cycle_id', filters.crop_cycle_id);

    const url = `${BASE_URL}/movements/list${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await apiClient.get<{ data: StockMovementWithDetails[]; total: number }>(url, {}, organizationId);
    return Array.isArray(response) ? response : (response.data || []);
  },

  async getDashboard(organizationId?: string): Promise<StockDashboardData> {
    return apiClient.get<StockDashboardData>(`${BASE_URL}/dashboard`, {}, organizationId);
  },

  async getBatches(filters?: Record<string, unknown>, organizationId?: string): Promise<BatchData[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const url = `${BASE_URL}/batches${params.toString() ? `?${params.toString()}` : ''}`;
    return apiClient.get<BatchData[]>(url, {}, organizationId);
  },

  async getExpiryAlerts(daysThreshold?: number, organizationId?: string): Promise<ExpiryAlertData[]> {
    const params = new URLSearchParams();
    if (daysThreshold) params.append('days_threshold', String(daysThreshold));
    const url = `${BASE_URL}/expiry-alerts${params.toString() ? `?${params.toString()}` : ''}`;
    return apiClient.get<ExpiryAlertData[]>(url, {}, organizationId);
  },

  async getFEFOSuggestion(
    itemId: string,
    warehouseId: string,
    variantId?: string,
    organizationId?: string,
  ): Promise<BatchData[]> {
    const params = new URLSearchParams();
    params.append('item_id', itemId);
    params.append('warehouse_id', warehouseId);
    if (variantId) params.append('variant_id', variantId);
    return apiClient.get<BatchData[]>(`${BASE_URL}/fefo-suggestion?${params.toString()}`, {}, organizationId);
  },

  async getReorderSuggestions(organizationId?: string): Promise<ReorderSuggestionData[]> {
    return apiClient.get<ReorderSuggestionData[]>(`${BASE_URL}/reorder-suggestions`, {}, organizationId);
  },

  async getSystemQuantity(
    itemId: string,
    warehouseId: string,
    variantId?: string,
    organizationId?: string,
  ): Promise<{ quantity: number; unit: string }> {
    const params = new URLSearchParams();
    params.append('item_id', itemId);
    params.append('warehouse_id', warehouseId);
    if (variantId) params.append('variant_id', variantId);
    return apiClient.get<{ quantity: number; unit: string }>(`${BASE_URL}/system-quantity?${params.toString()}`, {}, organizationId);
  },

  async requestApproval(entryId: string, organizationId?: string): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>(`${BASE_URL}/${entryId}/request-approval`, {}, {}, organizationId);
  },

  async approveEntry(approvalId: string, organizationId?: string): Promise<{ message: string }> {
    return apiClient.patch<{ message: string }>(`${BASE_URL}/approvals/${approvalId}/approve`, {}, {}, organizationId);
  },

  async rejectEntry(approvalId: string, reason: string, organizationId?: string): Promise<{ message: string }> {
    return apiClient.patch<{ message: string }>(`${BASE_URL}/approvals/${approvalId}/reject`, { reason }, {}, organizationId);
  },

  async getPendingApprovals(organizationId?: string): Promise<ApprovalData[]> {
    return apiClient.get<ApprovalData[]>(`${BASE_URL}/approvals/pending`, {}, organizationId);
  },
};
