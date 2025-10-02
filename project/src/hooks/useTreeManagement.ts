import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface TreeCategoryWithTrees {
  id: string;
  category: string;
  organization_id: string;
  trees: Tree[];
  created_at: string;
  updated_at: string;
}

export interface Tree {
  id: string;
  category_id: string;
  name: string;
  created_at: string;
  updated_at: string;
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

export function useTreeCategories(organizationId: string | null) {
  const [categories, setCategories] = useState<TreeCategoryWithTrees[]>([]);
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

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('tree_categories')
        .select('*')
        .eq('organization_id', organizationId)
        .order('category', { ascending: true });

      if (categoriesError) throw categoriesError;

      // Fetch all trees
      const { data: treesData, error: treesError } = await supabase
        .from('trees')
        .select('*')
        .in('category_id', categoriesData?.map(c => c.id) || [])
        .order('name', { ascending: true });

      if (treesError) throw treesError;

      // Combine categories with their trees
      const categoriesWithTrees = categoriesData?.map(category => ({
        ...category,
        trees: treesData?.filter(tree => tree.category_id === category.id) || []
      })) || [];

      setCategories(categoriesWithTrees);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching tree categories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [organizationId]);

  const addCategory = async (categoryName: string) => {
    if (!organizationId) throw new Error('Organization ID is required');

    const { data, error } = await supabase
      .from('tree_categories')
      .insert({ organization_id: organizationId, category: categoryName })
      .select()
      .single();

    if (error) throw error;

    await fetchCategories();
    return data;
  };

  const updateCategory = async (categoryId: string, categoryName: string) => {
    const { data, error } = await supabase
      .from('tree_categories')
      .update({ category: categoryName })
      .eq('id', categoryId)
      .select()
      .single();

    if (error) throw error;

    await fetchCategories();
    return data;
  };

  const deleteCategory = async (categoryId: string) => {
    const { error } = await supabase
      .from('tree_categories')
      .delete()
      .eq('id', categoryId);

    if (error) throw error;

    await fetchCategories();
  };

  const addTree = async (categoryId: string, treeName: string) => {
    const { data, error } = await supabase
      .from('trees')
      .insert({ category_id: categoryId, name: treeName })
      .select()
      .single();

    if (error) throw error;

    await fetchCategories();
    return data;
  };

  const updateTree = async (treeId: string, treeName: string) => {
    const { data, error } = await supabase
      .from('trees')
      .update({ name: treeName })
      .eq('id', treeId)
      .select()
      .single();

    if (error) throw error;

    await fetchCategories();
    return data;
  };

  const deleteTree = async (treeId: string) => {
    const { error } = await supabase
      .from('trees')
      .delete()
      .eq('id', treeId);

    if (error) throw error;

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

export function usePlantationTypes(organizationId: string | null) {
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

      const { data, error: fetchError } = await supabase
        .from('plantation_types')
        .select('*')
        .eq('organization_id', organizationId)
        .order('type', { ascending: true });

      if (fetchError) throw fetchError;

      setPlantationTypes(data || []);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching plantation types:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlantationTypes();
  }, [organizationId]);

  const addPlantationType = async (type: string, spacing: string, treesPerHa: number) => {
    if (!organizationId) throw new Error('Organization ID is required');

    const { data, error } = await supabase
      .from('plantation_types')
      .insert({
        organization_id: organizationId,
        type,
        spacing,
        trees_per_ha: treesPerHa
      })
      .select()
      .single();

    if (error) throw error;

    await fetchPlantationTypes();
    return data;
  };

  const updatePlantationType = async (
    id: string,
    type: string,
    spacing: string,
    treesPerHa: number
  ) => {
    const { data, error } = await supabase
      .from('plantation_types')
      .update({
        type,
        spacing,
        trees_per_ha: treesPerHa
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await fetchPlantationTypes();
    return data;
  };

  const deletePlantationType = async (id: string) => {
    const { error } = await supabase
      .from('plantation_types')
      .delete()
      .eq('id', id);

    if (error) throw error;

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
