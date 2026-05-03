import { apiClient } from '../api-client';
import { requireOrganizationId } from './createCrudApi';

export type EquipmentCategory = 'tractor' | 'harvester' | 'sprayer' | 'utility_vehicle' | 'pump' | 'small_tool' | 'other';
export type EquipmentFuelType = 'diesel' | 'petrol' | 'electric' | 'other';
export type EquipmentStatus = 'available' | 'in_use' | 'maintenance' | 'out_of_service';

export interface EquipmentAsset {
  id: string;
  organization_id: string;
  farm_id?: string;
  name: string;
  category: EquipmentCategory;
  brand?: string;
  model?: string;
  serial_number?: string;
  license_plate?: string;
  purchase_date?: string;
  purchase_price?: number;
  current_value?: number;
  hour_meter_reading?: number;
  hour_meter_date?: string;
  fuel_type: EquipmentFuelType;
  status: EquipmentStatus;
  assigned_to?: string;
  insurance_expiry?: string;
  registration_expiry?: string;
  notes?: string;
  photos?: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  farm?: { id: string; name: string };
  assigned_user?: { id: string; email: string };
}

export interface CreateEquipmentInput {
  name: string;
  category: EquipmentCategory;
  brand?: string;
  model?: string;
  serial_number?: string;
  license_plate?: string;
  purchase_date?: string;
  purchase_price?: number;
  current_value?: number;
  hour_meter_reading?: number;
  hour_meter_date?: string;
  fuel_type: EquipmentFuelType;
  status: EquipmentStatus;
  assigned_to?: string;
  insurance_expiry?: string;
  registration_expiry?: string;
  farm_id?: string;
  notes?: string;
  photos?: string[];
  is_active?: boolean;
}

export interface UpdateEquipmentInput {
  name?: string;
  category?: EquipmentCategory;
  brand?: string;
  model?: string;
  serial_number?: string;
  license_plate?: string;
  purchase_date?: string;
  purchase_price?: number;
  current_value?: number;
  hour_meter_reading?: number;
  hour_meter_date?: string;
  fuel_type?: EquipmentFuelType;
  status?: EquipmentStatus;
  assigned_to?: string;
  insurance_expiry?: string;
  registration_expiry?: string;
  farm_id?: string;
  notes?: string;
  photos?: string[];
  is_active?: boolean;
}

export interface EquipmentFilters {
  farm_id?: string;
  category?: EquipmentCategory;
  status?: EquipmentStatus;
}

export type MaintenanceType = 'oil_change' | 'repair' | 'inspection' | 'tire_replacement' | 'battery' | 'filter' | 'fuel_fill' | 'registration' | 'insurance' | 'other';

export interface EquipmentMaintenance {
  id: string;
  organization_id: string;
  equipment_id: string;
  type: MaintenanceType;
  description?: string;
  cost: number;
  maintenance_date: string;
  hour_meter_reading?: number;
  next_service_date?: string;
  next_service_hours?: number;
  vendor?: string;
  vendor_invoice_number?: string;
  cost_center_id?: string;
  journal_entry_id?: string;
  performed_by_user_id?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateMaintenanceInput {
  type: MaintenanceType;
  description?: string;
  cost: number;
  maintenance_date: string;
  hour_meter_reading?: number;
  next_service_date?: string;
  next_service_hours?: number;
  vendor?: string;
  vendor_invoice_number?: string;
  cost_center_id?: string;
  notes?: string;
}

export interface UpdateMaintenanceInput {
  type?: MaintenanceType;
  description?: string;
  cost?: number;
  maintenance_date?: string;
  hour_meter_reading?: number;
  next_service_date?: string;
  next_service_hours?: number;
  vendor?: string;
  vendor_invoice_number?: string;
  cost_center_id?: string;
  notes?: string;
}

const getBaseUrl = (organizationId: string) =>
  `/api/v1/organizations/${organizationId}/equipment`;

export const equipmentApi = {
  async getAll(filters?: EquipmentFilters, organizationId?: string): Promise<EquipmentAsset[]> {
    if (!organizationId) throw new Error('organizationId is required');
    const params: Record<string, string> = {};
    if (filters?.farm_id) params.farm_id = filters.farm_id;
    if (filters?.category) params.category = filters.category;
    if (filters?.status) params.status = filters.status;
    const res = await apiClient.get<
      | EquipmentAsset[]
      | { data: EquipmentAsset[]; total: number; page: number; pageSize: number; totalPages: number }
    >(getBaseUrl(organizationId), params, organizationId);
    return Array.isArray(res) ? res : res.data ?? [];
  },

  async getOne(id: string, organizationId?: string): Promise<EquipmentAsset> {
    if (!organizationId) throw new Error('organizationId is required');
    return apiClient.get<EquipmentAsset>(`${getBaseUrl(organizationId)}/${id}`, {}, organizationId);
  },

  async create(data: CreateEquipmentInput, organizationId?: string): Promise<EquipmentAsset> {
    requireOrganizationId(organizationId, 'equipmentApi.create');
    return apiClient.post<EquipmentAsset>(getBaseUrl(organizationId!), data, {}, organizationId);
  },

  async update(id: string, data: UpdateEquipmentInput, organizationId?: string): Promise<EquipmentAsset> {
    requireOrganizationId(organizationId, 'equipmentApi.update');
    return apiClient.patch<EquipmentAsset>(`${getBaseUrl(organizationId!)}/${id}`, data, {}, organizationId);
  },

  async delete(id: string, organizationId?: string): Promise<{ message: string }> {
    requireOrganizationId(organizationId, 'equipmentApi.delete');
    return apiClient.delete<{ message: string }>(`${getBaseUrl(organizationId!)}/${id}`, {}, organizationId);
  },

  async getMaintenance(equipmentId: string, organizationId?: string): Promise<EquipmentMaintenance[]> {
    if (!organizationId) throw new Error('organizationId is required');
    return apiClient.get<EquipmentMaintenance[]>(
      `${getBaseUrl(organizationId)}/${equipmentId}/maintenance`,
      {},
      organizationId,
    );
  },

  async createMaintenance(
    equipmentId: string,
    data: CreateMaintenanceInput,
    organizationId?: string,
  ): Promise<EquipmentMaintenance> {
    requireOrganizationId(organizationId, 'equipmentApi.createMaintenance');
    return apiClient.post<EquipmentMaintenance>(
      `${getBaseUrl(organizationId!)}/${equipmentId}/maintenance`,
      data,
      {},
      organizationId,
    );
  },

  async updateMaintenance(
    maintenanceId: string,
    data: UpdateMaintenanceInput,
    organizationId?: string,
  ): Promise<EquipmentMaintenance> {
    requireOrganizationId(organizationId, 'equipmentApi.updateMaintenance');
    return apiClient.patch<EquipmentMaintenance>(
      `${getBaseUrl(organizationId!)}/maintenance/${maintenanceId}`,
      data,
      {},
      organizationId,
    );
  },

  async deleteMaintenance(maintenanceId: string, organizationId?: string): Promise<{ message: string }> {
    requireOrganizationId(organizationId, 'equipmentApi.deleteMaintenance');
    return apiClient.delete<{ message: string }>(
      `${getBaseUrl(organizationId!)}/maintenance/${maintenanceId}`,
      {},
      organizationId,
    );
  },
};
