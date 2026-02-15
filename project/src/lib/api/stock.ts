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
    return apiClient.get<StockEntry[]>(url, {}, organizationId);
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
    return apiClient.get<StockMovementWithDetails[]>(url, {}, organizationId);
  },
};
