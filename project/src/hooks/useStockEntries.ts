import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/MultiTenantAuthProvider';
import type {
  StockEntry,
  StockEntryWithItems,
  StockMovement,
  StockMovementWithDetails,
  CreateStockEntryInput,
  UpdateStockEntryInput,
  StockEntryFilters,
  StockMovementFilters,
  StockEntryType,
  StockEntryStatus,
} from '../types/stock-entries';

/**
 * Hook to fetch all stock entries with optional filters
 */
export function useStockEntries(filters?: StockEntryFilters) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['stock-entries', currentOrganization?.id, filters],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      let query = supabase
        .from('stock_entries')
        .select(`
          *,
          from_warehouse:warehouses!stock_entries_from_warehouse_id_fkey(id, name),
          to_warehouse:warehouses!stock_entries_to_warehouse_id_fkey(id, name)
        `)
        .eq('organization_id', currentOrganization.id)
        .order('entry_date', { ascending: false })
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.entry_type) {
        query = query.eq('entry_type', filters.entry_type);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.from_date) {
        query = query.gte('entry_date', filters.from_date);
      }
      if (filters?.to_date) {
        query = query.lte('entry_date', filters.to_date);
      }
      if (filters?.warehouse_id) {
        query = query.or(`from_warehouse_id.eq.${filters.warehouse_id},to_warehouse_id.eq.${filters.warehouse_id}`);
      }
      if (filters?.reference_type) {
        query = query.eq('reference_type', filters.reference_type);
      }
      if (filters?.search) {
        query = query.or(`entry_number.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as StockEntry[];
    },
    enabled: !!currentOrganization?.id,
  });
}

/**
 * Hook to fetch a single stock entry with items
 */
export function useStockEntry(entryId: string | null) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['stock-entry', entryId],
    queryFn: async () => {
      if (!entryId) throw new Error('Entry ID is required');

      const { data, error } = await supabase
        .from('stock_entries')
        .select(`
          *,
          items:stock_entry_items(*),
          from_warehouse:warehouses!stock_entries_from_warehouse_id_fkey(id, name),
          to_warehouse:warehouses!stock_entries_to_warehouse_id_fkey(id, name)
        `)
        .eq('id', entryId)
        .eq('organization_id', currentOrganization?.id || '')
        .single();

      if (error) throw error;
      return data as StockEntryWithItems;
    },
    enabled: !!entryId && !!currentOrganization?.id,
  });
}

/**
 * Hook to create a new stock entry
 */
export function useCreateStockEntry() {
  const queryClient = useQueryClient();
  const { currentOrganization, user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateStockEntryInput) => {
      if (!currentOrganization?.id || !user?.id) {
        throw new Error('No organization or user');
      }

      // Generate entry number
      const { data: entryNumber, error: numberError } = await supabase
        .rpc('generate_stock_entry_number', {
          p_organization_id: currentOrganization.id,
        });

      if (numberError) throw numberError;

      // Create stock entry header
      const { data: entry, error: entryError } = await supabase
        .from('stock_entries')
        .insert({
          organization_id: currentOrganization.id,
          entry_number: entryNumber,
          entry_type: input.entry_type,
          entry_date: input.entry_date,
          from_warehouse_id: input.from_warehouse_id || null,
          to_warehouse_id: input.to_warehouse_id || null,
          reference_type: input.reference_type || null,
          reference_id: input.reference_id || null,
          reference_number: input.reference_number || null,
          purpose: input.purpose || null,
          notes: input.notes || null,
          status: 'Draft',
          created_by: user.id,
        })
        .select()
        .single();

      if (entryError) throw entryError;

      // Create stock entry items
      const items = input.items.map((item, index) => ({
        stock_entry_id: entry.id,
        line_number: index + 1,
        item_id: item.item_id,
        item_name: item.item_name,
        quantity: item.quantity,
        unit: item.unit,
        source_warehouse_id: item.source_warehouse_id || null,
        target_warehouse_id: item.target_warehouse_id || null,
        batch_number: item.batch_number || null,
        serial_number: item.serial_number || null,
        expiry_date: item.expiry_date || null,
        cost_per_unit: item.cost_per_unit || null,
        system_quantity: item.system_quantity || null,
        physical_quantity: item.physical_quantity || null,
        notes: item.notes || null,
      }));

      const { error: itemsError } = await supabase
        .from('stock_entry_items')
        .insert(items);

      if (itemsError) throw itemsError;

      return entry as StockEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-entries', currentOrganization?.id] });
    },
  });
}

/**
 * Hook to update stock entry (only for Draft status)
 */
export function useUpdateStockEntry() {
  const queryClient = useQueryClient();
  const { currentOrganization, user } = useAuth();

  return useMutation({
    mutationFn: async ({ entryId, input }: { entryId: string; input: UpdateStockEntryInput }) => {
      if (!currentOrganization?.id || !user?.id) {
        throw new Error('No organization or user');
      }

      // Check if entry is in Draft status
      const { data: entry } = await supabase
        .from('stock_entries')
        .select('status')
        .eq('id', entryId)
        .single();

      if (entry?.status !== 'Draft') {
        throw new Error('Only draft entries can be updated');
      }

      const { data, error } = await supabase
        .from('stock_entries')
        .update({
          ...input,
          updated_by: user.id,
        })
        .eq('id', entryId)
        .eq('organization_id', currentOrganization.id)
        .select()
        .single();

      if (error) throw error;
      return data as StockEntry;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['stock-entries', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['stock-entry', variables.entryId] });
    },
  });
}

/**
 * Hook to post (finalize) stock entry
 * This will update stock quantities and create movements
 */
export function usePostStockEntry() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (entryId: string) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      // Update status to Posted (trigger will handle stock updates)
      const { data, error } = await supabase
        .from('stock_entries')
        .update({
          status: 'Posted',
        })
        .eq('id', entryId)
        .eq('organization_id', currentOrganization.id)
        .select()
        .single();

      if (error) throw error;
      return data as StockEntry;
    },
    onSuccess: (_, entryId) => {
      queryClient.invalidateQueries({ queryKey: ['stock-entries', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['stock-entry', entryId] });
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
    },
  });
}

/**
 * Hook to cancel stock entry
 */
export function useCancelStockEntry() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (entryId: string) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      const { data, error } = await supabase
        .from('stock_entries')
        .update({
          status: 'Cancelled',
        })
        .eq('id', entryId)
        .eq('organization_id', currentOrganization.id)
        .select()
        .single();

      if (error) throw error;
      return data as StockEntry;
    },
    onSuccess: (_, entryId) => {
      queryClient.invalidateQueries({ queryKey: ['stock-entries', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['stock-entry', entryId] });
    },
  });
}

/**
 * Hook to delete stock entry (only Draft)
 */
export function useDeleteStockEntry() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (entryId: string) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      // RLS policy ensures only Draft entries can be deleted
      const { error } = await supabase
        .from('stock_entries')
        .delete()
        .eq('id', entryId)
        .eq('organization_id', currentOrganization.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-entries', currentOrganization?.id] });
    },
  });
}

/**
 * Hook to fetch stock movements with filters
 */
export function useStockMovements(filters?: StockMovementFilters) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['stock-movements', currentOrganization?.id, filters],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      let query = supabase
        .from('stock_movements')
        .select(`
          *,
          item:inventory_items(id, name, unit),
          warehouse:warehouses(id, name),
          stock_entry:stock_entries(id, entry_number, entry_type)
        `)
        .eq('organization_id', currentOrganization.id)
        .order('movement_date', { ascending: false });

      // Apply filters
      if (filters?.item_id) {
        query = query.eq('item_id', filters.item_id);
      }
      if (filters?.warehouse_id) {
        query = query.eq('warehouse_id', filters.warehouse_id);
      }
      if (filters?.movement_type) {
        query = query.eq('movement_type', filters.movement_type);
      }
      if (filters?.from_date) {
        query = query.gte('movement_date', filters.from_date);
      }
      if (filters?.to_date) {
        query = query.lte('movement_date', filters.to_date);
      }
      if (filters?.stock_entry_id) {
        query = query.eq('stock_entry_id', filters.stock_entry_id);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as StockMovementWithDetails[];
    },
    enabled: !!currentOrganization?.id,
  });
}

/**
 * Hook to fetch stock movements for a specific item
 */
export function useItemStockMovements(itemId: string | null) {
  return useStockMovements({ item_id: itemId || undefined });
}
