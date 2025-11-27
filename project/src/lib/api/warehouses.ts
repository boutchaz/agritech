import { apiClient } from '../api-client';

const BASE_URL = '/api/v1/warehouses';

export interface Warehouse {
  id: string;
  organization_id: string;
  name: string;
  code?: string;
  location?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: string;
  organization_id: string;
  item_id: string;
  warehouse_id: string;
  quantity: number;
  item?: {
    id: string;
    item_code: string;
    item_name: string;
    default_unit: string;
  };
  warehouse?: {
    id: string;
    name: string;
  };
}

export const warehousesApi = {
  /**
   * Get all active warehouses
   */
  async getAll(organizationId?: string): Promise<Warehouse[]> {
    return apiClient.get<Warehouse[]>(BASE_URL, {}, organizationId);
  },

  /**
   * Get inventory with optional filters
   */
  async getInventory(filters?: {
    warehouse_id?: string;
    item_id?: string;
  }, organizationId?: string): Promise<InventoryItem[]> {
    const params = new URLSearchParams();

    if (filters?.warehouse_id) params.append('warehouse_id', filters.warehouse_id);
    if (filters?.item_id) params.append('item_id', filters.item_id);

    const url = `${BASE_URL}/inventory${params.toString() ? `?${params.toString()}` : ''}`;
    return apiClient.get<InventoryItem[]>(url, {}, organizationId);
  },
};
