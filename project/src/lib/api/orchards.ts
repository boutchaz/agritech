import { apiClient } from './api-client';

export interface Orchard {
  id: string;
  organization_id: string;
  farm_id: string | null;
  name: string;
  description: string | null;
  tree_type: string | null;
  total_area_hectares: number | null;
  total_trees: number | null;
  planting_year: number | null;
  soil_type: string | null;
  irrigation_type: string | null;
  spacing_method: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateOrchardDto {
  name: string;
  description?: string;
  farmId?: string;
  treeType?: string;
  totalAreaHectares?: number;
  totalTrees?: number;
  plantingYear?: number;
  soilType?: string;
  irrigationType?: string;
  spacingMethod?: string;
}

const BASE_URL = (organizationId: string) =>
  `/organizations/${organizationId}/orchards`;

export const orchardsApi = {
  async list(organizationId: string): Promise<Orchard[]> {
    return apiClient.get<Orchard[]>(BASE_URL(organizationId));
  },

  async get(organizationId: string, orchardId: string): Promise<Orchard> {
    return apiClient.get<Orchard>(`${BASE_URL(organizationId)}/${orchardId}`);
  },

  async create(organizationId: string, data: CreateOrchardDto): Promise<Orchard> {
    return apiClient.post<Orchard>(BASE_URL(organizationId), data);
  },

  async update(
    organizationId: string,
    orchardId: string,
    data: Partial<CreateOrchardDto>
  ): Promise<Orchard> {
    return apiClient.patch<Orchard>(`${BASE_URL(organizationId)}/${orchardId}`, data);
  },

  async delete(organizationId: string, orchardId: string): Promise<void> {
    return apiClient.delete(`${BASE_URL(organizationId)}/${orchardId}`);
  },

  async getStats(organizationId: string, orchardId: string) {
    return apiClient.get(`${BASE_URL(organizationId)}/${orchardId}/stats`);
  },
};
