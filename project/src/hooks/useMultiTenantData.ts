import { useState, useEffect, useCallback } from 'react';
import { authSupabase } from '../lib/auth-supabase';
import { useAuth } from '../components/MultiTenantAuthProvider';

interface UseDataOptions {
  table: string;
  columns?: string;
  filters?: Record<string, any>;
  orderBy?: { column: string; ascending?: boolean };
  realtime?: boolean;
}

interface UseDataResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  create: (item: Partial<T>) => Promise<T | null>;
  update: (id: string, updates: Partial<T>) => Promise<T | null>;
  delete: (id: string) => Promise<boolean>;
}

export function useMultiTenantData<T extends { id: string }>(
  options: UseDataOptions
): UseDataResult<T> {
  const { currentOrganization, currentFarm } = useAuth();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { table, columns = '*', filters = {}, orderBy, realtime = false } = options;

  const buildQuery = useCallback(() => {
    let query = authSupabase.from(table).select(columns);

    // Apply organization filter
    if (currentOrganization) {
      query = query.eq('organization_id', currentOrganization.id);
    }

    // Apply farm filter if specified
    if (currentFarm && filters.include_farm) {
      query = query.eq('farm_id', currentFarm.id);
    }

    // Apply custom filters
    Object.entries(filters).forEach(([key, value]) => {
      if (key !== 'include_farm' && value !== undefined) {
        query = query.eq(key, value);
      }
    });

    // Apply ordering
    if (orderBy) {
      query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
    }

    return query;
  }, [table, columns, filters, orderBy, currentOrganization, currentFarm]);

  const fetchData = useCallback(async () => {
    if (!currentOrganization) {
      setData([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const query = buildQuery();
      const { data: result, error: queryError } = await query;

      if (queryError) {
        throw queryError;
      }

      setData(result || []);
    } catch (err: any) {
      console.error(`Error fetching ${table}:`, err);
      setError(err.message || `Failed to fetch ${table}`);
    } finally {
      setLoading(false);
    }
  }, [buildQuery, table, currentOrganization]);

  const create = useCallback(async (item: Partial<T>): Promise<T | null> => {
    if (!currentOrganization) {
      throw new Error('No organization selected');
    }

    try {
      const newItem = {
        ...item,
        organization_id: currentOrganization.id,
        ...(currentFarm && filters.include_farm ? { farm_id: currentFarm.id } : {})
      };

      const { data: result, error: createError } = await authSupabase
        .from(table)
        .insert(newItem)
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      // Update local state
      setData(prev => [...prev, result]);
      return result;
    } catch (err: any) {
      console.error(`Error creating ${table}:`, err);
      setError(err.message || `Failed to create ${table}`);
      return null;
    }
  }, [table, currentOrganization, currentFarm, filters.include_farm]);

  const update = useCallback(async (id: string, updates: Partial<T>): Promise<T | null> => {
    try {
      const { data: result, error: updateError } = await authSupabase
        .from(table)
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      // Update local state
      setData(prev => prev.map(item => item.id === id ? result : item));
      return result;
    } catch (err: any) {
      console.error(`Error updating ${table}:`, err);
      setError(err.message || `Failed to update ${table}`);
      return null;
    }
  }, [table]);

  const deleteRecord = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await authSupabase
        .from(table)
        .delete()
        .eq('id', id);

      if (deleteError) {
        throw deleteError;
      }

      // Update local state
      setData(prev => prev.filter(item => item.id !== id));
      return true;
    } catch (err: any) {
      console.error(`Error deleting ${table}:`, err);
      setError(err.message || `Failed to delete ${table}`);
      return false;
    }
  }, [table]);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Set up realtime subscription
  useEffect(() => {
    if (!realtime || !currentOrganization) {
      return;
    }

    const channel = authSupabase
      .channel(`${table}_changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
          filter: `organization_id=eq.${currentOrganization.id}`
        },
        (payload) => {
          console.log(`Realtime ${table} change:`, payload);

          switch (payload.eventType) {
            case 'INSERT':
              setData(prev => [...prev, payload.new as T]);
              break;
            case 'UPDATE':
              setData(prev => prev.map(item =>
                item.id === payload.new.id ? payload.new as T : item
              ));
              break;
            case 'DELETE':
              setData(prev => prev.filter(item => item.id !== payload.old.id));
              break;
          }
        }
      )
      .subscribe();

    return () => {
      authSupabase.removeChannel(channel);
    };
  }, [table, realtime, currentOrganization]);

  return {
    data,
    loading,
    error,
    refresh: fetchData,
    create,
    update,
    delete: deleteRecord
  };
}

// Specialized hooks for common tables
export const useInventory = () => useMultiTenantData({
  table: 'inventory',
  columns: `
    *,
    product_categories (name, description),
    product_subcategories (name, description)
  `,
  orderBy: { column: 'name' },
  realtime: true
});

export const useFarms = () => {
  return useMultiTenantData({
    table: 'farms',
    columns: '*',
    orderBy: { column: 'name' }
  });
};

export const useCrops = (farmId?: string) => useMultiTenantData({
  table: 'crops',
  columns: `
    *,
    farms (name),
    crop_varieties (name)
  `,
  filters: farmId ? { farm_id: farmId } : {},
  orderBy: { column: 'name' },
  realtime: true
});

export const useTasks = (cropId?: string) => useMultiTenantData({
  table: 'tasks',
  columns: `
    *,
    crops (name),
    task_categories (name)
  `,
  filters: cropId ? { crop_id: cropId } : {},
  orderBy: { column: 'planned_start_date', ascending: false },
  realtime: true
});

export const useEmployees = () => useMultiTenantData({
  table: 'employees',
  columns: '*',
  orderBy: { column: 'name' },
  realtime: true
});

export const useLivestock = () => useMultiTenantData({
  table: 'livestock',
  columns: '*',
  orderBy: { column: 'type' },
  realtime: true
});

export const useFinancialTransactions = (farmId?: string) => useMultiTenantData({
  table: 'financial_transactions',
  columns: '*',
  filters: farmId ? { farm_id: farmId } : {},
  orderBy: { column: 'date', ascending: false },
  realtime: true
});