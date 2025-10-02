import { useState, useEffect } from 'react';
import { readItems, createItem, updateItem, deleteItem } from '@directus/sdk';
import directus from '../config';
import type { TreeCategory, Tree, PlantationType } from '../config';

export function useDirectusTreeCategories(organizationId: string | null) {
  const [categories, setCategories] = useState<TreeCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = async () => {
    if (!organizationId) {
      setCategories([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await directus.request(
        readItems('tree_categories', {
          filter: {
            organization_id: { _eq: organizationId },
            status: { _eq: 'published' }
          },
          fields: ['*', { trees: ['*'] }],
          sort: ['category']
        })
      );

      setCategories(response as TreeCategory[]);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching tree categories from Directus:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [organizationId]);

  const addCategory = async (categoryName: string) => {
    if (!organizationId) throw new Error('Organization ID is required');

    const newCategory = await directus.request(
      createItem('tree_categories', {
        category: categoryName,
        organization_id: organizationId,
        status: 'published'
      })
    );

    await fetchCategories();
    return newCategory;
  };

  const updateCategory = async (categoryId: string, categoryName: string) => {
    const updated = await directus.request(
      updateItem('tree_categories', categoryId, {
        category: categoryName
      })
    );

    await fetchCategories();
    return updated;
  };

  const deleteCategory = async (categoryId: string) => {
    await directus.request(deleteItem('tree_categories', categoryId));
    await fetchCategories();
  };

  const addTree = async (categoryId: string, treeName: string) => {
    const newTree = await directus.request(
      createItem('trees', {
        category_id: categoryId,
        name: treeName,
        status: 'published'
      })
    );

    await fetchCategories();
    return newTree;
  };

  const updateTree = async (treeId: string, treeName: string) => {
    const updated = await directus.request(
      updateItem('trees', treeId, {
        name: treeName
      })
    );

    await fetchCategories();
    return updated;
  };

  const deleteTree = async (treeId: string) => {
    await directus.request(deleteItem('trees', treeId));
    await fetchCategories();
  };

  return {
    categories,
    loading,
    error,
    refetch: fetchCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    addTree,
    updateTree,
    deleteTree
  };
}

export function useDirectusPlantationTypes(organizationId: string | null) {
  const [plantationTypes, setPlantationTypes] = useState<PlantationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlantationTypes = async () => {
    if (!organizationId) {
      setPlantationTypes([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await directus.request(
        readItems('plantation_types', {
          filter: {
            organization_id: { _eq: organizationId },
            status: { _eq: 'published' }
          },
          sort: ['type']
        })
      );

      setPlantationTypes(response as PlantationType[]);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching plantation types from Directus:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlantationTypes();
  }, [organizationId]);

  const addPlantationType = async (type: string, spacing: string, treesPerHa: number) => {
    if (!organizationId) throw new Error('Organization ID is required');

    const newType = await directus.request(
      createItem('plantation_types', {
        organization_id: organizationId,
        type,
        spacing,
        trees_per_ha: treesPerHa,
        status: 'published'
      })
    );

    await fetchPlantationTypes();
    return newType;
  };

  const updatePlantationType = async (
    id: string,
    type: string,
    spacing: string,
    treesPerHa: number
  ) => {
    const updated = await directus.request(
      updateItem('plantation_types', id, {
        type,
        spacing,
        trees_per_ha: treesPerHa
      })
    );

    await fetchPlantationTypes();
    return updated;
  };

  const deletePlantationType = async (id: string) => {
    await directus.request(deleteItem('plantation_types', id));
    await fetchPlantationTypes();
  };

  return {
    plantationTypes,
    loading,
    error,
    refetch: fetchPlantationTypes,
    addPlantationType,
    updatePlantationType,
    deletePlantationType
  };
}
