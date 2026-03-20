// Inventory API Client for Mobile App
import { api } from '../api';
import type {
  StockItem,
  StockEntry,
  Warehouse,
  LowStockAlert,
  StockItemFilters,
  StockEntryFilters,
  CreateStockItemInput,
  UpdateStockItemInput,
  CreateStockEntryInput,
  PaginatedResponse,
} from '@/types/inventory';

const BASE_URL = '/inventory';

export const inventoryApi = {
  // Stock Items
  async getItems(filters?: StockItemFilters): Promise<PaginatedResponse<StockItem>> {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.is_active !== undefined) params.append('is_active', String(filters.is_active));
    if (filters?.search) params.append('search', filters.search);
    if (filters?.low_stock) params.append('low_stock', 'true');
    const query = params.toString();
    const res = await api.get<PaginatedResponse<StockItem>>(`${BASE_URL}/items${query ? `?${query}` : ''}`);
    return res || { data: [], total: 0 };
  },

  async getItem(itemId: string): Promise<StockItem> {
    return api.get<StockItem>(`${BASE_URL}/items/${itemId}`);
  },

  async createItem(data: CreateStockItemInput): Promise<StockItem> {
    return api.post<StockItem>(`${BASE_URL}/items`, data);
  },

  async updateItem(itemId: string, data: UpdateStockItemInput): Promise<StockItem> {
    return api.patch<StockItem>(`${BASE_URL}/items/${itemId}`, data);
  },

  async deleteItem(itemId: string): Promise<{ message: string }> {
    return api.delete<{ message: string }>(`${BASE_URL}/items/${itemId}`);
  },

  // Stock Entries
  async getEntries(filters?: StockEntryFilters): Promise<PaginatedResponse<StockEntry>> {
    const params = new URLSearchParams();
    if (filters?.item_id) params.append('item_id', filters.item_id);
    if (filters?.entry_type) params.append('entry_type', filters.entry_type);
    if (filters?.date_from) params.append('date_from', filters.date_from);
    if (filters?.date_to) params.append('date_to', filters.date_to);
    const query = params.toString();
    const res = await api.get<PaginatedResponse<StockEntry>>(`${BASE_URL}/entries${query ? `?${query}` : ''}`);
    return res || { data: [], total: 0 };
  },

  async createEntry(data: CreateStockEntryInput): Promise<StockEntry> {
    return api.post<StockEntry>(`${BASE_URL}/entries`, data);
  },

  // Warehouses
  async getWarehouses(): Promise<Warehouse[]> {
    const res = await api.get<{ data: Warehouse[] }>(`${BASE_URL}/warehouses`);
    return res?.data || [];
  },

  async createWarehouse(data: Partial<Warehouse>): Promise<Warehouse> {
    return api.post<Warehouse>(`${BASE_URL}/warehouses`, data);
  },

  // Alerts
  async getLowStockAlerts(): Promise<LowStockAlert[]> {
    const res = await api.get<{ data: LowStockAlert[] }>(`${BASE_URL}/alerts/low-stock`);
    return res?.data || [];
  },

  // Categories
  async getCategories(): Promise<string[]> {
    const res = await api.get<{ categories: string[] }>(`${BASE_URL}/categories`);
    return res?.categories || [];
  },
};
