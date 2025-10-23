import { useState, useEffect, useCallback } from 'react';
import { authSupabase } from '../lib/auth-authSupabase';
import { useAuth } from '../components/MultiTenantAuthProvider';

// ============================================================================
// TYPES
// ============================================================================

interface BaseLookup {
  id: string;
  name: string;
  description: string | null;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
  is_global?: boolean;
}

type CropType = BaseLookup;

interface _CropCategory extends BaseLookup {
  type_id: string;
}

interface _CropVariety extends BaseLookup {
  category_id: string;
  days_to_maturity: number | null;
}

type ProductCategory = BaseLookup;

interface _ProductSubcategory extends BaseLookup {
  category_id: string;
}

interface TaskCategory extends BaseLookup {
  color: string;
}

interface _TaskTemplate extends BaseLookup {
  category_id: string;
  estimated_duration: number | null;
  is_recurring: boolean;
  recurrence_pattern: string | null;
}

interface TestTypeParameters {
  min_value?: number;
  max_value?: number;
  unit?: string;
  method?: string;
  [key: string]: string | number | undefined;
}

interface TestType extends BaseLookup {
  parameters: TestTypeParameters;
}

// ============================================================================
// CROP TYPES HOOK
// ============================================================================

export function useCropTypes() {
  const { currentOrganization } = useAuth();
  const [cropTypes, setCropTypes] = useState<CropType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCropTypes = useCallback(async () => {
    if (!currentOrganization) {
      setCropTypes([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await authSupabase
        .from('crop_types')
        .select('*')
        .or(`organization_id.eq.${currentOrganization.id},organization_id.is.null`)
        .order('organization_id', { ascending: false })
        .order('name');

      if (error) throw error;

      // Mark global items
      const typesWithFlags = (data || []).map(item => ({
        ...item,
        is_global: item.organization_id === null
      }));

      setCropTypes(typesWithFlags);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching crop types');
    } finally {
      setLoading(false);
    }
  }, [currentOrganization]);

  useEffect(() => {
    fetchCropTypes();
  }, [fetchCropTypes]);

  const addCropType = async (name: string, description?: string) => {
    if (!currentOrganization) throw new Error('No organization selected');

    const { data, error } = await authSupabase
      .from('crop_types')
      .insert([{
        name,
        description,
        organization_id: currentOrganization.id
      }])
      .select()
      .single();

    if (error) throw error;

    setCropTypes(prev => [...prev, { ...data, is_global: false }]);
    return data;
  };

  const updateCropType = async (id: string, updates: Partial<Pick<CropType, 'name' | 'description'>>) => {
    const { data, error } = await authSupabase
      .from('crop_types')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    setCropTypes(prev => prev.map(item =>
      item.id === id ? { ...data, is_global: data.organization_id === null } : item
    ));
    return data;
  };

  const deleteCropType = async (id: string) => {
    const { error } = await authSupabase
      .from('crop_types')
      .delete()
      .eq('id', id);

    if (error) throw error;

    setCropTypes(prev => prev.filter(item => item.id !== id));
  };

  return {
    cropTypes,
    loading,
    error,
    addCropType,
    updateCropType,
    deleteCropType,
    refresh: fetchCropTypes
  };
}

// ============================================================================
// PRODUCT CATEGORIES HOOK
// ============================================================================

export function useProductCategories() {
  const { currentOrganization } = useAuth();
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    if (!currentOrganization) {
      setCategories([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await authSupabase
        .from('product_categories')
        .select('*')
        .or(`organization_id.eq.${currentOrganization.id},organization_id.is.null`)
        .order('organization_id', { ascending: false })
        .order('name');

      if (error) throw error;

      const categoriesWithFlags = (data || []).map(item => ({
        ...item,
        is_global: item.organization_id === null
      }));

      setCategories(categoriesWithFlags);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching product categories');
    } finally {
      setLoading(false);
    }
  }, [currentOrganization]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const addCategory = async (name: string, description?: string) => {
    if (!currentOrganization) throw new Error('No organization selected');

    const { data, error } = await authSupabase
      .from('product_categories')
      .insert([{
        name,
        description,
        organization_id: currentOrganization.id
      }])
      .select()
      .single();

    if (error) throw error;

    setCategories(prev => [...prev, { ...data, is_global: false }]);
    return data;
  };

  const updateCategory = async (id: string, updates: Partial<Pick<ProductCategory, 'name' | 'description'>>) => {
    const { data, error } = await authSupabase
      .from('product_categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    setCategories(prev => prev.map(item =>
      item.id === id ? { ...data, is_global: data.organization_id === null } : item
    ));
    return data;
  };

  const deleteCategory = async (id: string) => {
    const { error } = await authSupabase
      .from('product_categories')
      .delete()
      .eq('id', id);

    if (error) throw error;

    setCategories(prev => prev.filter(item => item.id !== id));
  };

  return {
    categories,
    loading,
    error,
    addCategory,
    updateCategory,
    deleteCategory,
    refresh: fetchCategories
  };
}

// ============================================================================
// TASK CATEGORIES HOOK
// ============================================================================

export function useTaskCategories() {
  const { currentOrganization } = useAuth();
  const [categories, setCategories] = useState<TaskCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    if (!currentOrganization) {
      setCategories([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await authSupabase
        .from('task_categories')
        .select('*')
        .or(`organization_id.eq.${currentOrganization.id},organization_id.is.null`)
        .order('organization_id', { ascending: false })
        .order('name');

      if (error) throw error;

      const categoriesWithFlags = (data || []).map(item => ({
        ...item,
        is_global: item.organization_id === null
      }));

      setCategories(categoriesWithFlags);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching task categories');
    } finally {
      setLoading(false);
    }
  }, [currentOrganization]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const addCategory = async (name: string, description?: string, color?: string) => {
    if (!currentOrganization) throw new Error('No organization selected');

    const { data, error } = await authSupabase
      .from('task_categories')
      .insert([{
        name,
        description,
        color: color || '#3B82F6',
        organization_id: currentOrganization.id
      }])
      .select()
      .single();

    if (error) throw error;

    setCategories(prev => [...prev, { ...data, is_global: false }]);
    return data;
  };

  const updateCategory = async (
    id: string,
    updates: Partial<Pick<TaskCategory, 'name' | 'description' | 'color'>>
  ) => {
    const { data, error } = await authSupabase
      .from('task_categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    setCategories(prev => prev.map(item =>
      item.id === id ? { ...data, is_global: data.organization_id === null } : item
    ));
    return data;
  };

  const deleteCategory = async (id: string) => {
    const { error } = await authSupabase
      .from('task_categories')
      .delete()
      .eq('id', id);

    if (error) throw error;

    setCategories(prev => prev.filter(item => item.id !== id));
  };

  return {
    categories,
    loading,
    error,
    addCategory,
    updateCategory,
    deleteCategory,
    refresh: fetchCategories
  };
}

// ============================================================================
// TEST TYPES HOOK
// ============================================================================

export function useTestTypes() {
  const { currentOrganization } = useAuth();
  const [testTypes, setTestTypes] = useState<TestType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTestTypes = useCallback(async () => {
    if (!currentOrganization) {
      setTestTypes([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await authSupabase
        .from('test_types')
        .select('*')
        .or(`organization_id.eq.${currentOrganization.id},organization_id.is.null`)
        .order('organization_id', { ascending: false })
        .order('name');

      if (error) throw error;

      const typesWithFlags = (data || []).map(item => ({
        ...item,
        is_global: item.organization_id === null
      }));

      setTestTypes(typesWithFlags);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching test types');
    } finally {
      setLoading(false);
    }
  }, [currentOrganization]);

  useEffect(() => {
    fetchTestTypes();
  }, [fetchTestTypes]);

  const addTestType = async (name: string, description?: string, parameters?: TestTypeParameters) => {
    if (!currentOrganization) throw new Error('No organization selected');

    const { data, error } = await authSupabase
      .from('test_types')
      .insert([{
        name,
        description,
        parameters,
        organization_id: currentOrganization.id
      }])
      .select()
      .single();

    if (error) throw error;

    setTestTypes(prev => [...prev, { ...data, is_global: false }]);
    return data;
  };

  const updateTestType = async (
    id: string,
    updates: Partial<Pick<TestType, 'name' | 'description' | 'parameters'>>
  ) => {
    const { data, error } = await authSupabase
      .from('test_types')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    setTestTypes(prev => prev.map(item =>
      item.id === id ? { ...data, is_global: data.organization_id === null } : item
    ));
    return data;
  };

  const deleteTestType = async (id: string) => {
    const { error } = await authSupabase
      .from('test_types')
      .delete()
      .eq('id', id);

    if (error) throw error;

    setTestTypes(prev => prev.filter(item => item.id !== id));
  };

  return {
    testTypes,
    loading,
    error,
    addTestType,
    updateTestType,
    deleteTestType,
    refresh: fetchTestTypes
  };
}

// ============================================================================
// COMPOSITE HOOK FOR ALL LOOKUPS
// ============================================================================

export function useAllLookups() {
  const cropTypes = useCropTypes();
  const productCategories = useProductCategories();
  const taskCategories = useTaskCategories();
  const testTypes = useTestTypes();

  const loading = cropTypes.loading ||
                  productCategories.loading ||
                  taskCategories.loading ||
                  testTypes.loading;

  const error = cropTypes.error ||
                productCategories.error ||
                taskCategories.error ||
                testTypes.error;

  return {
    cropTypes: cropTypes.cropTypes,
    productCategories: productCategories.categories,
    taskCategories: taskCategories.categories,
    testTypes: testTypes.testTypes,
    loading,
    error,
    actions: {
      cropTypes: {
        add: cropTypes.addCropType,
        update: cropTypes.updateCropType,
        delete: cropTypes.deleteCropType,
        refresh: cropTypes.refresh
      },
      productCategories: {
        add: productCategories.addCategory,
        update: productCategories.updateCategory,
        delete: productCategories.deleteCategory,
        refresh: productCategories.refresh
      },
      taskCategories: {
        add: taskCategories.addCategory,
        update: taskCategories.updateCategory,
        delete: taskCategories.deleteCategory,
        refresh: taskCategories.refresh
      },
      testTypes: {
        add: testTypes.addTestType,
        update: testTypes.updateTestType,
        delete: testTypes.deleteTestType,
        refresh: testTypes.refresh
      }
    }
  };
}