import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from './useAuth';
import { OrganizationRequiredError } from '@/lib/errors';
import {
  treeCategoriesApi,
  treesApi,
  plantationTypesApi,
  type TreeCategoryWithTrees,
  type TreeCategory,
  type Tree,
  type PlantationType,
} from '@/lib/api/tree-management';
import { localizeItems, localizeItem } from '@/lib/utils/localization';

export type { TreeCategoryWithTrees, TreeCategory, Tree, PlantationType };

export function useTreeCategories(organizationId: string | null) {
  const queryClient = useQueryClient();
  const { i18n } = useTranslation();
  const locale = i18n.language;

  const {
    data: categories = [],
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['tree-categories', organizationId, locale],
    queryFn: () => treeCategoriesApi.getAll(organizationId!),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
    select: (data) => data.map((category: TreeCategoryWithTrees) => ({
      ...localizeItem(category, locale),
      trees: localizeItems(category.trees || [], locale),
    })),
  });

  const addCategoryMutation = useMutation({
    mutationFn: (categoryName: string) =>
      treeCategoriesApi.create({ category: categoryName }, organizationId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tree-categories', organizationId] });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ categoryId, categoryName }: { categoryId: string; categoryName: string }) =>
      treeCategoriesApi.update(categoryId, { category: categoryName }, organizationId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tree-categories', organizationId] });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (categoryId: string) =>
      treeCategoriesApi.delete(categoryId, organizationId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tree-categories', organizationId] });
    },
  });

  const addTreeMutation = useMutation({
    mutationFn: ({ categoryId, treeName }: { categoryId: string; treeName: string }) =>
      treesApi.create({ category_id: categoryId, name: treeName }, organizationId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tree-categories', organizationId] });
    },
  });

  const updateTreeMutation = useMutation({
    mutationFn: ({ treeId, treeName }: { treeId: string; treeName: string }) =>
      treesApi.update(treeId, { name: treeName }, organizationId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tree-categories', organizationId] });
    },
  });

  const deleteTreeMutation = useMutation({
    mutationFn: (treeId: string) =>
      treesApi.delete(treeId, organizationId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tree-categories', organizationId] });
    },
  });

  const error = queryError?.message || null;

  const addCategory = async (categoryName: string) => {
    if (!organizationId) throw new OrganizationRequiredError();
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
  const { i18n } = useTranslation();
  const locale = i18n.language;

  const {
    data: plantationTypes = [],
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['plantation-types', organizationId, locale],
    queryFn: () => plantationTypesApi.getAll(organizationId!),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
    select: (data) => localizeItems(data, locale),
  });

  const addPlantationTypeMutation = useMutation({
    mutationFn: ({ type, spacing, treesPerHa }: { type: string; spacing: string; treesPerHa: number }) =>
      plantationTypesApi.create(
        { type, spacing, trees_per_ha: treesPerHa },
        organizationId!,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plantation-types', organizationId] });
    },
  });

  const updatePlantationTypeMutation = useMutation({
    mutationFn: ({ id, type, spacing, treesPerHa }: { id: string; type: string; spacing: string; treesPerHa: number }) =>
      plantationTypesApi.update(
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
      plantationTypesApi.delete(id, organizationId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plantation-types', organizationId] });
    },
  });

  const error = queryError?.message || null;

  const addPlantationType = async (type: string, spacing: string, treesPerHa: number) => {
    if (!organizationId) throw new OrganizationRequiredError();
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
