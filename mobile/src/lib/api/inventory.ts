// Inventory API Client for Mobile App
// Uses the real backend endpoints: /items, /warehouses, /stock-entries
import { api } from '../api';
import type {
  Item,
  StockEntry,
  StockMovement,
  Warehouse,
  ItemFilters,
  StockEntryFilters,
  StockMovementFilters,
  CreateItemInput,
  UpdateItemInput,
  CreateStockEntryInput,
  PaginatedResponse,
} from '@/types/inventory';

export const inventoryApi = {
  // =====================================================
  // ITEMS — /items
  // =====================================================

  async getItems(filters?: ItemFilters): Promise<Item[]> {
    const params = new URLSearchParams();
    if (filters?.item_group_id) params.append('item_group_id', filters.item_group_id);
    if (filters?.is_active !== undefined) params.append('is_active', String(filters.is_active));
    if (filters?.is_stock_item !== undefined) params.append('is_stock_item', String(filters.is_stock_item));
    if (filters?.search) params.append('search', filters.search);
    const query = params.toString();
    const res = await api.get<any>(`/items${query ? `?${query}` : ''}`);
    return Array.isArray(res) ? res : (res?.data ?? []);
  },

  async getItemsForSelection(search?: string): Promise<{ id: string; item_code: string; item_name: string; default_unit: string }[]> {
    const params = new URLSearchParams();
    params.append('is_stock_item', 'true');
    if (search) params.append('search', search);
    const res = await api.get<any>(`/items/selection?${params.toString()}`);
    return Array.isArray(res) ? res : (res?.data ?? []);
  },

  async getItem(itemId: string): Promise<Item> {
    return api.get<Item>(`/items/${itemId}`);
  },

  async createItem(data: CreateItemInput): Promise<Item> {
    return api.post<Item>('/items', data);
  },

  async updateItem(itemId: string, data: UpdateItemInput): Promise<Item> {
    return api.patch<Item>(`/items/${itemId}`, data);
  },

  async deleteItem(itemId: string): Promise<{ message: string }> {
    return api.delete<{ message: string }>(`/items/${itemId}`);
  },

  async getStockLevels(itemId?: string): Promise<Record<string, { quantity: number; value: number }>> {
    const params = new URLSearchParams();
    if (itemId) params.append('item_id', itemId);
    const query = params.toString();
    const res = await api.get<any>(`/items/stock-levels${query ? `?${query}` : ''}`);
    return res || {};
  },

  // =====================================================
  // STOCK ENTRIES — /stock-entries
  // =====================================================

  async getEntries(filters?: StockEntryFilters): Promise<PaginatedResponse<StockEntry>> {
    const params = new URLSearchParams();
    if (filters?.entry_type) params.append('entry_type', filters.entry_type);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.warehouse_id) params.append('warehouse_id', filters.warehouse_id);
    if (filters?.from_date) params.append('from_date', filters.from_date);
    if (filters?.to_date) params.append('to_date', filters.to_date);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.pageSize) params.append('pageSize', String(filters.pageSize));
    const query = params.toString();
    const res = await api.get<PaginatedResponse<StockEntry>>(
      `/stock-entries${query ? `?${query}` : ''}`
    );
    return res || { data: [], total: 0, page: 1, pageSize: 50, totalPages: 0 };
  },

  async getEntry(entryId: string): Promise<StockEntry> {
    return api.get<StockEntry>(`/stock-entries/${entryId}`);
  },

  async createEntry(data: CreateStockEntryInput): Promise<StockEntry> {
    return api.post<StockEntry>('/stock-entries', data);
  },

  async postEntry(entryId: string): Promise<{ message: string }> {
    return api.patch<{ message: string }>(`/stock-entries/${entryId}/post`);
  },

  async cancelEntry(entryId: string): Promise<StockEntry> {
    return api.patch<StockEntry>(`/stock-entries/${entryId}/cancel`);
  },

  async deleteEntry(entryId: string): Promise<{ message: string }> {
    return api.delete<{ message: string }>(`/stock-entries/${entryId}`);
  },

  // =====================================================
  // STOCK MOVEMENTS — /stock-entries/movements
  // =====================================================

  async getMovements(filters?: StockMovementFilters): Promise<StockMovement[]> {
    const params = new URLSearchParams();
    if (filters?.item_id) params.append('item_id', filters.item_id);
    if (filters?.warehouse_id) params.append('warehouse_id', filters.warehouse_id);
    if (filters?.movement_type) params.append('movement_type', filters.movement_type);
    if (filters?.from_date) params.append('from_date', filters.from_date);
    if (filters?.to_date) params.append('to_date', filters.to_date);
    const query = params.toString();
    const res = await api.get<any>(
      `/stock-entries/movements/list${query ? `?${query}` : ''}`
    );
    return Array.isArray(res) ? res : (res?.data ?? []);
  },

  // =====================================================
  // WAREHOUSES — /warehouses
  // =====================================================

  async getWarehouses(): Promise<Warehouse[]> {
    const res = await api.get<any>('/warehouses');
    return Array.isArray(res) ? res : (res?.data ?? []);
  },

  async getWarehouse(warehouseId: string): Promise<Warehouse> {
    return api.get<Warehouse>(`/warehouses/${warehouseId}`);
  },

  async getWarehouseInventory(warehouseId?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (warehouseId) params.append('warehouse_id', warehouseId);
    const query = params.toString();
    const res = await api.get<any>(`/warehouses/inventory${query ? `?${query}` : ''}`);
    return Array.isArray(res) ? res : (res?.data ?? []);
  },
};
