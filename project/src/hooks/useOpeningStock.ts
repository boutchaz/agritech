import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/MultiTenantAuthProvider';
import type {
  OpeningStockBalance,
  CreateOpeningStockInput,
  UpdateOpeningStockInput,
  OpeningStockFilters,
  StockAccountMapping,
  CreateStockAccountMappingInput,
  UpdateStockAccountMappingInput,
} from '@/types/opening-stock';

// =====================================================
// Opening Stock Balance Queries
// =====================================================

/**
 * Fetch all opening stock balances with optional filtering
 */
export function useOpeningStockBalances(filters?: OpeningStockFilters) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['opening-stock-balances', currentOrganization?.id, filters],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      let query = supabase
        .from('opening_stock_balances')
        .select(`
          *,
          item:items(id, item_code, item_name, default_unit, item_group:item_groups(name)),
          warehouse:warehouses(id, name),
          journal_entry:journal_entries(id, entry_number)
        `)
        .eq('organization_id', currentOrganization.id)
        .order('opening_date', { ascending: false });

      // Apply filters
      if (filters?.item_id) {
        query = query.eq('item_id', filters.item_id);
      }
      if (filters?.warehouse_id) {
        query = query.eq('warehouse_id', filters.warehouse_id);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.from_date) {
        query = query.gte('opening_date', filters.from_date);
      }
      if (filters?.to_date) {
        query = query.lte('opening_date', filters.to_date);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as OpeningStockBalance[];
    },
    enabled: !!currentOrganization?.id,
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Fetch a single opening stock balance by ID
 */
export function useOpeningStockBalance(balanceId: string | null) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['opening-stock-balance', balanceId],
    queryFn: async () => {
      if (!balanceId) throw new Error('No balance ID provided');

      const { data, error } = await supabase
        .from('opening_stock_balances')
        .select(`
          *,
          item:items(id, item_code, item_name, default_unit, item_group:item_groups(name)),
          warehouse:warehouses(id, name),
          journal_entry:journal_entries(id, entry_number)
        `)
        .eq('id', balanceId)
        .eq('organization_id', currentOrganization?.id || '')
        .single();

      if (error) throw error;
      return data as OpeningStockBalance;
    },
    enabled: !!balanceId && !!currentOrganization?.id,
  });
}

/**
 * Create a new opening stock balance
 */
export function useCreateOpeningStock() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateOpeningStockInput) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      const { data, error } = await supabase
        .from('opening_stock_balances')
        .insert({
          organization_id: currentOrganization.id,
          ...input,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select(`
          *,
          item:items(id, item_code, item_name, default_unit, item_group:item_groups(name)),
          warehouse:warehouses(id, name)
        `)
        .single();

      if (error) throw error;
      return data as OpeningStockBalance;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opening-stock-balances'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });
}

/**
 * Update an existing opening stock balance (draft only)
 */
export function useUpdateOpeningStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateOpeningStockInput }) => {
      const { data: updated, error } = await supabase
        .from('opening_stock_balances')
        .update(data)
        .eq('id', id)
        .eq('status', 'Draft') // Only allow updates to drafts
        .select(`
          *,
          item:items(id, item_code, item_name, default_unit, item_group:item_groups(name)),
          warehouse:warehouses(id, name)
        `)
        .single();

      if (error) throw error;
      return updated as OpeningStockBalance;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['opening-stock-balances'] });
      queryClient.invalidateQueries({ queryKey: ['opening-stock-balance', variables.id] });
    },
  });
}

/**
 * Post an opening stock balance (creates journal entry and updates inventory)
 */
export function usePostOpeningStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (balanceId: string) => {
      const { data, error } = await supabase.rpc('post_opening_stock_balance', {
        p_opening_stock_id: balanceId,
      });

      if (error) throw error;
      return data; // Returns journal_entry_id
    },
    onSuccess: (_, balanceId) => {
      queryClient.invalidateQueries({ queryKey: ['opening-stock-balances'] });
      queryClient.invalidateQueries({ queryKey: ['opening-stock-balance', balanceId] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['journal_entries'] });
    },
  });
}

/**
 * Cancel an opening stock balance
 */
export function useCancelOpeningStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (balanceId: string) => {
      const { data, error } = await supabase
        .from('opening_stock_balances')
        .update({ status: 'Cancelled' })
        .eq('id', balanceId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, balanceId) => {
      queryClient.invalidateQueries({ queryKey: ['opening-stock-balances'] });
      queryClient.invalidateQueries({ queryKey: ['opening-stock-balance', balanceId] });
    },
  });
}

/**
 * Delete an opening stock balance (draft only)
 */
export function useDeleteOpeningStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (balanceId: string) => {
      const { error } = await supabase
        .from('opening_stock_balances')
        .delete()
        .eq('id', balanceId)
        .eq('status', 'Draft'); // Only allow deletion of drafts

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opening-stock-balances'] });
    },
  });
}

// =====================================================
// Stock Account Mapping Queries
// =====================================================

/**
 * Fetch all stock account mappings for the current organization
 */
export function useStockAccountMappings() {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['stock-account-mappings', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      const { data, error } = await supabase
        .from('stock_account_mappings')
        .select(`
          *,
          debit_account:accounts!stock_account_mappings_debit_account_id_fkey(id, account_number, account_name),
          credit_account:accounts!stock_account_mappings_credit_account_id_fkey(id, account_number, account_name)
        `)
        .eq('organization_id', currentOrganization.id)
        .order('entry_type');

      if (error) throw error;
      return data as StockAccountMapping[];
    },
    enabled: !!currentOrganization?.id,
  });
}

/**
 * Create a new stock account mapping
 */
export function useCreateStockAccountMapping() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateStockAccountMappingInput) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      const { data, error } = await supabase
        .from('stock_account_mappings')
        .insert({
          organization_id: currentOrganization.id,
          ...input,
        })
        .select(`
          *,
          debit_account:accounts!stock_account_mappings_debit_account_id_fkey(id, account_number, account_name),
          credit_account:accounts!stock_account_mappings_credit_account_id_fkey(id, account_number, account_name)
        `)
        .single();

      if (error) throw error;
      return data as StockAccountMapping;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-account-mappings'] });
    },
  });
}

/**
 * Update a stock account mapping
 */
export function useUpdateStockAccountMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateStockAccountMappingInput;
    }) => {
      const { data: updated, error } = await supabase
        .from('stock_account_mappings')
        .update(data)
        .eq('id', id)
        .select(`
          *,
          debit_account:accounts!stock_account_mappings_debit_account_id_fkey(id, account_number, account_name),
          credit_account:accounts!stock_account_mappings_credit_account_id_fkey(id, account_number, account_name)
        `)
        .single();

      if (error) throw error;
      return updated as StockAccountMapping;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-account-mappings'] });
    },
  });
}

/**
 * Delete a stock account mapping
 */
export function useDeleteStockAccountMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mappingId: string) => {
      const { error } = await supabase
        .from('stock_account_mappings')
        .delete()
        .eq('id', mappingId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-account-mappings'] });
    },
  });
}
