import { apiClient } from '../api-client';

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

/**
 * Tree categories API
 */
export const treeCategoriesApi = {
  getAll: (organizationId: string) =>
    apiClient.get<TreeCategoryWithTrees[]>(
      `/api/v1/organizations/${organizationId}/tree-management/categories`,
      {},
      organizationId,
    ),

  create: (data: CreateTreeCategoryDto, organizationId: string) =>
    apiClient.post<TreeCategory>(
      `/api/v1/organizations/${organizationId}/tree-management/categories`,
      data,
      {},
      organizationId,
    ),

  update: (categoryId: string, data: UpdateTreeCategoryDto, organizationId: string) =>
    apiClient.patch<TreeCategory>(
      `/api/v1/organizations/${organizationId}/tree-management/categories/${categoryId}`,
      data,
      {},
      organizationId,
    ),

  delete: (categoryId: string, organizationId: string) =>
    apiClient.delete<void>(
      `/api/v1/organizations/${organizationId}/tree-management/categories/${categoryId}`,
      {},
      organizationId,
    ),
};

/**
 * Trees API
 */
export const treesApi = {
  getAll: (categoryId: string, organizationId: string) =>
    apiClient.get<Tree[]>(
      `/api/v1/organizations/${organizationId}/tree-management/categories/${categoryId}/trees`,
      {},
      organizationId,
    ),

  create: (data: CreateTreeDto, organizationId: string) =>
    apiClient.post<Tree>(
      `/api/v1/organizations/${organizationId}/tree-management/trees`,
      data,
      {},
      organizationId,
    ),

  update: (treeId: string, data: UpdateTreeDto, organizationId: string) =>
    apiClient.patch<Tree>(
      `/api/v1/organizations/${organizationId}/tree-management/trees/${treeId}`,
      data,
      {},
      organizationId,
    ),

  delete: (treeId: string, organizationId: string) =>
    apiClient.delete<void>(
      `/api/v1/organizations/${organizationId}/tree-management/trees/${treeId}`,
      {},
      organizationId,
    ),
};

/**
 * Plantation types API
 */
export const plantationTypesApi = {
  getAll: (organizationId: string) =>
    apiClient.get<PlantationType[]>(
      `/api/v1/organizations/${organizationId}/tree-management/plantation-types`,
      {},
      organizationId,
    ),

  create: (data: CreatePlantationTypeDto, organizationId: string) =>
    apiClient.post<PlantationType>(
      `/api/v1/organizations/${organizationId}/tree-management/plantation-types`,
      data,
      {},
      organizationId,
    ),

  update: (typeId: string, data: UpdatePlantationTypeDto, organizationId: string) =>
    apiClient.patch<PlantationType>(
      `/api/v1/organizations/${organizationId}/tree-management/plantation-types/${typeId}`,
      data,
      {},
      organizationId,
    ),

  delete: (typeId: string, organizationId: string) =>
    apiClient.delete<void>(
      `/api/v1/organizations/${organizationId}/tree-management/plantation-types/${typeId}`,
      {},
      organizationId,
    ),
};
