import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import {
  treeManagementApi,
  type TreeCategoryWithTrees,
  type TreeCategory,
  type Tree,
  type PlantationType,
} from '@/lib/api/tree-management';

export type { TreeCategoryWithTrees, TreeCategory, Tree, PlantationType };

export function useTreeCategories(organizationId: string | null) {
  const queryClient = useQueryClient();

  const {
    data: categories = [],
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['tree-categories', organizationId],
    queryFn: () => treeManagementApi.getCategories(organizationId!),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });

  const addCategoryMutation = useMutation({
    mutationFn: (categoryName: string) =>
      treeManagementApi.createCategory({ category: categoryName }, organizationId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tree-categories', organizationId] });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ categoryId, categoryName }: { categoryId: string; categoryName: string }) =>
      treeManagementApi.updateCategory(categoryId, { category: categoryName }, organizationId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tree-categories', organizationId] });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (categoryId: string) =>
      treeManagementApi.deleteCategory(categoryId, organizationId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tree-categories', organizationId] });
    },
  });

  const addTreeMutation = useMutation({
    mutationFn: ({ categoryId, treeName }: { categoryId: string; treeName: string }) =>
      treeManagementApi.createTree({ category_id: categoryId, name: treeName }, organizationId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tree-categories', organizationId] });
    },
  });

  const updateTreeMutation = useMutation({
    mutationFn: ({ treeId, treeName }: { treeId: string; treeName: string }) =>
      treeManagementApi.updateTree(treeId, { name: treeName }, organizationId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tree-categories', organizationId] });
    },
  });

  const deleteTreeMutation = useMutation({
    mutationFn: (treeId: string) =>
      treeManagementApi.deleteTree(treeId, organizationId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tree-categories', organizationId] });
    },
  });

  const error = queryError?.message || null;

  const addCategory = async (categoryName: string) => {
    if (!organizationId) throw new Error('Organization ID is required');
    return addCategoryMutation.mutateAsync(categoryName);
  };

  const updateCategory = async (categoryId: string, categoryName: string) => {
    return updateCategoryMutation.mutateAsync({ categoryId, categoryName });
  };

  const deleteCategory = async (categoryId: string) => {
    return deleteCategoryMutation.mutateAsync(categoryId);
  };

  const addTree = async (categoryId: string, treeName: string) => {
    return addTreeMutation.mutateAsync({ categoryId, treeName });
  };

  const updateTree = async (treeId: string, treeName: string) => {
    return updateTreeMutation.mutateAsync({ treeId, treeName });
  };

  const deleteTree = async (treeId: string) => {
    return deleteTreeMutation.mutateAsync(treeId);
  };

  return {
    categories,
    loading,
    error,
    refetch,
    addCategory,
    updateCategory,
    deleteCategory,
    addTree,
    updateTree,
    deleteTree,
  };
}

export function usePlantationTypes(organizationId: string | null) {
  const queryClient = useQueryClient();

  const {
    data: plantationTypes = [],
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['plantation-types', organizationId],
    queryFn: () => treeManagementApi.getPlantationTypes(organizationId!),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });

  const addPlantationTypeMutation = useMutation({
    mutationFn: ({ type, spacing, treesPerHa }: { type: string; spacing: string; treesPerHa: number }) =>
      treeManagementApi.createPlantationType(
        { type, spacing, trees_per_ha: treesPerHa },
        organizationId!,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plantation-types', organizationId] });
    },
  });

  const updatePlantationTypeMutation = useMutation({
    mutationFn: ({ id, type, spacing, treesPerHa }: { id: string; type: string; spacing: string; treesPerHa: number }) =>
      treeManagementApi.updatePlantationType(
        id,
        { type, spacing, trees_per_ha: treesPerHa },
        organizationId!,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plantation-types', organizationId] });
    },
  });

  const deletePlantationTypeMutation = useMutation({
    mutationFn: (id: string) =>
      treeManagementApi.deletePlantationType(id, organizationId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plantation-types', organizationId] });
    },
  });

  const error = queryError?.message || null;

  const addPlantationType = async (type: string, spacing: string, treesPerHa: number) => {
    if (!organizationId) throw new Error('Organization ID is required');
    return addPlantationTypeMutation.mutateAsync({ type, spacing, treesPerHa });
  };

  const updatePlantationType = async (
    id: string,
    type: string,
    spacing: string,
    treesPerHa: number,
  ) => {
    return updatePlantationTypeMutation.mutateAsync({ id, type, spacing, treesPerHa });
  };

  const deletePlantationType = async (id: string) => {
    return deletePlantationTypeMutation.mutateAsync(id);
  };

  return {
    plantationTypes,
    loading,
    error,
    refetch,
    addPlantationType,
    updatePlantationType,
    deletePlantationType,
  };
}
