import { createCrudApi, buildQueryUrl } from './createCrudApi';
import { apiClient } from '../api-client';

const BASE_URL = '/api/v1/warehouses';

export interface Warehouse {
  id: string;
  organization_id: string;
  name: string;
  code?: string;
  description?: string;
  location?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  capacity?: number;
  capacity_unit?: string;
  temperature_controlled?: boolean;
  humidity_controlled?: boolean;
  security_level?: string;
  manager_name?: string;
  manager_phone?: string;
  farm_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateWarehouseInput {
  name: string;
  description?: string;
  location?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  capacity?: number;
  capacity_unit?: string;
  temperature_controlled?: boolean;
  humidity_controlled?: boolean;
  security_level?: string;
  manager_name?: string;
  manager_phone?: string;
  farm_id?: string;
  is_active?: boolean;
}

export type UpdateWarehouseInput = Partial<CreateWarehouseInput>;

export interface WarehouseFilters {
  is_active?: boolean;
  farm_id?: string;
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

// Base CRUD operations using factory
const baseCrud = createCrudApi<Warehouse, CreateWarehouseInput, WarehouseFilters, UpdateWarehouseInput>(BASE_URL);

// Extended API with additional methods
export const warehousesApi = {
  ...baseCrud,

  /**
   * Get inventory with optional filters
   */
  async getInventory(filters?: {
    warehouse_id?: string;
    item_id?: string;
  }, organizationId?: string): Promise<InventoryItem[]> {
    const url = buildQueryUrl(`${BASE_URL}/inventory`, filters);
    return apiClient.get<InventoryItem[]>(url, {}, organizationId);
  },
};
