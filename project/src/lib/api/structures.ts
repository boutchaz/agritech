import { apiClient } from '../api-client';
import { requireOrganizationId } from './createCrudApi';

export interface Structure {
  id: string;
  organization_id: string;
  farm_id?: string;
  name: string;
  type: 'stable' | 'technical_room' | 'basin' | 'well' | 'other';
  location?: {
    lat: number;
    lng: number;
  };
  installation_date: string;
  condition?: 'excellent' | 'good' | 'fair' | 'poor' | 'needs_repair';
  usage?: string;
  structure_details?: Record<string, unknown>;
  notes?: string;
  photos?: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  farm?: {
    id: string;
    name: string;
  };
}

export interface CreateStructureInput {
  name: string;
  type: 'stable' | 'technical_room' | 'basin' | 'well' | 'other';
  farm_id?: string;
  location?: {
    lat: number;
    lng: number;
  };
  installation_date: string;
  condition?: 'excellent' | 'good' | 'fair' | 'poor' | 'needs_repair';
  usage?: string;
  structure_details?: Record<string, unknown>;
  notes?: string;
  photos?: string[];
  is_active?: boolean;
}

export interface UpdateStructureInput {
  name?: string;
  type?: 'stable' | 'technical_room' | 'basin' | 'well' | 'other';
  farm_id?: string;
  location?: {
    lat: number;
    lng: number;
  };
  installation_date?: string;
  condition?: 'excellent' | 'good' | 'fair' | 'poor' | 'needs_repair';
  usage?: string;
  structure_details?: Record<string, unknown>;
  notes?: string;
  photos?: string[];
  is_active?: boolean;
}

const getBaseUrl = (organizationId: string) =>
  `/api/v1/organizations/${organizationId}/structures`;

export const structuresApi = {
  /**
   * Get all structures for an organization
   */
  async getAll(filters?: undefined, organizationId?: string): Promise<Structure[]> {
    if (!organizationId) throw new Error('organizationId is required');
    return apiClient.get<Structure[]>(getBaseUrl(organizationId), {}, organizationId);
  },

  /**
   * Get a single structure by ID
   */
  async getOne(id: string, organizationId?: string): Promise<Structure> {
    if (!organizationId) throw new Error('organizationId is required');
    return apiClient.get<Structure>(`${getBaseUrl(organizationId)}/${id}`, {}, organizationId);
  },

  /**
   * Create a new structure
   */
  async create(data: CreateStructureInput, organizationId?: string): Promise<Structure> {
    requireOrganizationId(organizationId, 'structuresApi.create');
    return apiClient.post<Structure>(getBaseUrl(organizationId!), data, {}, organizationId);
  },

  /**
   * Update a structure
   */
  async update(
    id: string,
    data: UpdateStructureInput,
    organizationId?: string,
  ): Promise<Structure> {
    requireOrganizationId(organizationId, 'structuresApi.update');
    return apiClient.patch<Structure>(`${getBaseUrl(organizationId!)}/${id}`, data, {}, organizationId);
  },

  /**
   * Delete a structure (soft delete)
   */
  async delete(id: string, organizationId?: string): Promise<{ message: string }> {
    requireOrganizationId(organizationId, 'structuresApi.delete');
    return apiClient.delete<{ message: string }>(`${getBaseUrl(organizationId!)}/${id}`, {}, organizationId);
  },
};
