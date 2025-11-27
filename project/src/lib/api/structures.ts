import { apiClient } from '../api-client';

export interface Structure {
  id: string;
  organization_id: string;
  farm_id?: string;
  name: string;
  type: 'stable' | 'technical_room' | 'basin' | 'well';
  location?: {
    lat: number;
    lng: number;
  };
  installation_date: string;
  condition?: 'excellent' | 'good' | 'fair' | 'poor' | 'needs_repair';
  usage?: string;
  structure_details?: Record<string, unknown>;
  notes?: string;
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
  type: 'stable' | 'technical_room' | 'basin' | 'well';
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
  is_active?: boolean;
}

export interface UpdateStructureInput {
  name?: string;
  type?: 'stable' | 'technical_room' | 'basin' | 'well';
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
  is_active?: boolean;
}

const getBaseUrl = (organizationId: string) =>
  `/api/v1/organizations/${organizationId}/structures`;

export const structuresApi = {
  /**
   * Get all structures for an organization
   */
  async getAll(organizationId: string): Promise<Structure[]> {
    return apiClient.get<Structure[]>(getBaseUrl(organizationId));
  },

  /**
   * Get a single structure by ID
   */
  async getOne(organizationId: string, id: string): Promise<Structure> {
    return apiClient.get<Structure>(`${getBaseUrl(organizationId)}/${id}`);
  },

  /**
   * Create a new structure
   */
  async create(organizationId: string, data: CreateStructureInput): Promise<Structure> {
    return apiClient.post<Structure>(getBaseUrl(organizationId), data);
  },

  /**
   * Update a structure
   */
  async update(
    organizationId: string,
    id: string,
    data: UpdateStructureInput,
  ): Promise<Structure> {
    return apiClient.patch<Structure>(`${getBaseUrl(organizationId)}/${id}`, data);
  },

  /**
   * Delete a structure (soft delete)
   */
  async delete(organizationId: string, id: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`${getBaseUrl(organizationId)}/${id}`);
  },
};
