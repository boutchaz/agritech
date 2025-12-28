import { apiClient } from '../api-client';

const BASE_URL = '/api/v1/organizations';

export interface Tree {
  id: string;
  category_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface TreeCategory {
  id: string;
  organization_id: string;
  category: string;
  created_at: string;
  updated_at: string;
}

export interface TreeCategoryWithTrees extends TreeCategory {
  trees: Tree[];
}

export interface PlantationType {
  id: string;
  organization_id: string;
  type: string;
  spacing: string;
  trees_per_ha: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTreeCategoryDto {
  category: string;
}

export interface UpdateTreeCategoryDto {
  category: string;
}

export interface CreateTreeDto {
  category_id: string;
  name: string;
}

export interface UpdateTreeDto {
  name: string;
}

export interface CreatePlantationTypeDto {
  type: string;
  spacing: string;
  trees_per_ha: number;
}

export interface UpdatePlantationTypeDto {
  type?: string;
  spacing?: string;
  trees_per_ha?: number;
}

export const treeManagementApi = {
  async getCategories(organizationId?: string): Promise<TreeCategoryWithTrees[]> {
    return apiClient.get<TreeCategoryWithTrees[]>(
      `${BASE_URL}/${organizationId}/tree-management/categories`,
      {},
      organizationId,
    );
  },

  async createCategory(
    data: CreateTreeCategoryDto,
    organizationId?: string,
  ): Promise<TreeCategory> {
    return apiClient.post<TreeCategory>(
      `${BASE_URL}/${organizationId}/tree-management/categories`,
      data,
      {},
      organizationId,
    );
  },

  async updateCategory(
    categoryId: string,
    data: UpdateTreeCategoryDto,
    organizationId?: string,
  ): Promise<TreeCategory> {
    return apiClient.patch<TreeCategory>(
      `${BASE_URL}/${organizationId}/tree-management/categories/${categoryId}`,
      data,
      {},
      organizationId,
    );
  },

  async deleteCategory(
    categoryId: string,
    organizationId?: string,
  ): Promise<void> {
    return apiClient.delete<void>(
      `${BASE_URL}/${organizationId}/tree-management/categories/${categoryId}`,
      {},
      organizationId,
    );
  },

  async createTree(
    data: CreateTreeDto,
    organizationId?: string,
  ): Promise<Tree> {
    return apiClient.post<Tree>(
      `${BASE_URL}/${organizationId}/tree-management/trees`,
      data,
      {},
      organizationId,
    );
  },

  async updateTree(
    treeId: string,
    data: UpdateTreeDto,
    organizationId?: string,
  ): Promise<Tree> {
    return apiClient.patch<Tree>(
      `${BASE_URL}/${organizationId}/tree-management/trees/${treeId}`,
      data,
      {},
      organizationId,
    );
  },

  async deleteTree(
    treeId: string,
    organizationId?: string,
  ): Promise<void> {
    return apiClient.delete<void>(
      `${BASE_URL}/${organizationId}/tree-management/trees/${treeId}`,
      {},
      organizationId,
    );
  },

  async getPlantationTypes(organizationId?: string): Promise<PlantationType[]> {
    return apiClient.get<PlantationType[]>(
      `${BASE_URL}/${organizationId}/tree-management/plantation-types`,
      {},
      organizationId,
    );
  },

  async createPlantationType(
    data: CreatePlantationTypeDto,
    organizationId?: string,
  ): Promise<PlantationType> {
    return apiClient.post<PlantationType>(
      `${BASE_URL}/${organizationId}/tree-management/plantation-types`,
      data,
      {},
      organizationId,
    );
  },

  async updatePlantationType(
    typeId: string,
    data: UpdatePlantationTypeDto,
    organizationId?: string,
  ): Promise<PlantationType> {
    return apiClient.patch<PlantationType>(
      `${BASE_URL}/${organizationId}/tree-management/plantation-types/${typeId}`,
      data,
      {},
      organizationId,
    );
  },

  async deletePlantationType(
    typeId: string,
    organizationId?: string,
  ): Promise<void> {
    return apiClient.delete<void>(
      `${BASE_URL}/${organizationId}/tree-management/plantation-types/${typeId}`,
      {},
      organizationId,
    );
  },
};
