import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/MultiTenantAuthProvider';
import type {
  Item,
  ItemWithDetails,
  ItemGroup,
  ItemGroupWithChildren,
  ItemPrice,
  CreateItemInput,
  UpdateItemInput,
  CreateItemGroupInput,
  UpdateItemGroupInput,
  ItemFilters,
  ItemGroupFilters,
  ItemSelectionOption,
} from '../types/items';

// =====================================================
// ITEM GROUPS QUERIES
// =====================================================

/**
 * Hook to fetch all item groups with optional filters
 */
export function useItemGroups(filters?: ItemGroupFilters) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['item-groups', currentOrganization?.id, filters],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      let query = supabase
        .from('item_groups')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (filters?.parent_group_id !== undefined) {
        if (filters.parent_group_id === null) {
          query = query.is('parent_group_id', null);
        } else {
          query = query.eq('parent_group_id', filters.parent_group_id);
        }
      }

      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,code.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ItemGroup[];
    },
    enabled: !!currentOrganization?.id,
  });
}

/**
 * Hook to fetch a single item group
 */
export function useItemGroup(groupId: string | null) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['item-group', groupId],
    queryFn: async () => {
      if (!groupId) throw new Error('Group ID is required');

      const { data, error } = await supabase
        .from('item_groups')
        .select('*')
        .eq('id', groupId)
        .eq('organization_id', currentOrganization?.id || '')
        .single();

      if (error) throw error;
      return data as ItemGroup;
    },
    enabled: !!groupId && !!currentOrganization?.id,
  });
}

/**
 * Hook to fetch item group tree (hierarchical)
 */
export function useItemGroupTree() {
  const { currentOrganization } = useAuth();
  const { data: allGroups } = useItemGroups({ is_active: true });

  return useQuery({
    queryKey: ['item-group-tree', currentOrganization?.id],
    queryFn: async () => {
      if (!allGroups || !currentOrganization?.id) {
        return [];
      }

      // Build tree structure
      const buildTree = (parentId: string | null = null): ItemGroupWithChildren[] => {
        return allGroups
          .filter((group) => 
            (parentId === null && !group.parent_group_id) ||
            (parentId !== null && group.parent_group_id === parentId)
          )
          .map((group) => ({
            ...group,
            children: buildTree(group.id),
            items_count: 0, // Would need to fetch from items table
          }));
      };

      return buildTree();
    },
    enabled: !!allGroups && !!currentOrganization?.id,
  });
}

// =====================================================
// ITEMS QUERIES
// =====================================================

/**
 * Hook to fetch all items with optional filters
 */
export function useItems(filters?: ItemFilters) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['items', currentOrganization?.id, filters],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      let query = supabase
        .from('items')
        .select(`
          *,
          item_group:item_groups(id, name, code, path)
        `)
        .eq('organization_id', currentOrganization.id)
        .order('item_code', { ascending: true });

      if (filters?.item_group_id) {
        query = query.eq('item_group_id', filters.item_group_id);
      }

      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      if (filters?.is_sales_item !== undefined) {
        query = query.eq('is_sales_item', filters.is_sales_item);
      }

      if (filters?.is_purchase_item !== undefined) {
        query = query.eq('is_purchase_item', filters.is_purchase_item);
      }

      if (filters?.is_stock_item !== undefined) {
        query = query.eq('is_stock_item', filters.is_stock_item);
      }

      if (filters?.crop_type) {
        query = query.eq('crop_type', filters.crop_type);
      }

      if (filters?.variety) {
        query = query.eq('variety', filters.variety);
      }

      if (filters?.search) {
        query = query.or(`item_code.ilike.%${filters.search}%,item_name.ilike.%${filters.search}%,barcode.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Item[];
    },
    enabled: !!currentOrganization?.id,
  });
}

/**
 * Hook to fetch a single item with details
 */
export function useItem(itemId: string | null) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['item', itemId],
    queryFn: async () => {
      if (!itemId) throw new Error('Item ID is required');

      const { data, error } = await supabase
        .from('items')
        .select(`
          *,
          item_group:item_groups(*),
          variants:item_variants(*),
          unit_conversions:item_unit_conversions(*),
          supplier_details:item_supplier_details(
            *,
            supplier:suppliers(id, name)
          ),
          customer_details:item_customer_details(
            *,
            customer:customers(id, name)
          ),
          prices:item_prices(*)
        `)
        .eq('id', itemId)
        .eq('organization_id', currentOrganization?.id || '')
        .single();

      if (error) throw error;
      return data as ItemWithDetails;
    },
    enabled: !!itemId && !!currentOrganization?.id,
  });
}

/**
 * Hook to fetch items for selection (lightweight, for dropdowns)
 */
export function useItemSelection(filters?: { 
  is_sales_item?: boolean;
  is_purchase_item?: boolean;
  is_stock_item?: boolean;
  search?: string;
}) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['item-selection', currentOrganization?.id, filters],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      let query = supabase
        .from('items')
        .select(`
          id,
          item_code,
          item_name,
          default_unit,
          standard_rate,
          item_group:item_groups(id, name)
        `)
        .eq('organization_id', currentOrganization.id)
        .eq('is_active', true)
        .order('item_name', { ascending: true });

      if (filters?.is_sales_item) {
        query = query.eq('is_sales_item', true);
      }

      if (filters?.is_purchase_item) {
        query = query.eq('is_purchase_item', true);
      }

      if (filters?.is_stock_item) {
        query = query.eq('is_stock_item', true);
      }

      if (filters?.search) {
        query = query.or(`item_code.ilike.%${filters.search}%,item_name.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ItemSelectionOption[];
    },
    enabled: !!currentOrganization?.id,
  });
}

// =====================================================
// ITEM GROUPS MUTATIONS
// =====================================================

/**
 * Hook to create a new item group
 */
export function useCreateItemGroup() {
  const queryClient = useQueryClient();
  const { currentOrganization, user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateItemGroupInput) => {
      if (!currentOrganization?.id || !user?.id) {
        throw new Error('No organization or user');
      }

      const { data, error } = await supabase
        .from('item_groups')
        .insert({
          ...input,
          organization_id: currentOrganization.id,
          created_by: user.id,
          updated_by: user.id,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data as ItemGroup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['item-groups', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['item-group-tree', currentOrganization?.id] });
    },
  });
}

/**
 * Hook to update an item group
 */
export function useUpdateItemGroup() {
  const queryClient = useQueryClient();
  const { currentOrganization, user } = useAuth();

  return useMutation({
    mutationFn: async ({ groupId, input }: { groupId: string; input: UpdateItemGroupInput }) => {
      if (!currentOrganization?.id || !user?.id) {
        throw new Error('No organization or user');
      }

      const { data, error } = await supabase
        .from('item_groups')
        .update({
          ...input,
          updated_by: user.id,
        } as any)
        .eq('id', groupId)
        .eq('organization_id', currentOrganization.id)
        .select()
        .single();

      if (error) throw error;
      return data as ItemGroup;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['item-groups', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['item-group', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['item-group-tree', currentOrganization?.id] });
    },
  });
}

/**
 * Hook to delete an item group
 */
export function useDeleteItemGroup() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (groupId: string) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      // Check if group has items
      const { data: items } = await supabase
        .from('items')
        .select('id')
        .eq('item_group_id', groupId)
        .limit(1);

      if (items && items.length > 0) {
        throw new Error('Cannot delete item group with items. Please move or delete items first.');
      }

      // Check if group has children
      const { data: children } = await supabase
        .from('item_groups')
        .select('id')
        .eq('parent_group_id', groupId)
        .limit(1);

      if (children && children.length > 0) {
        throw new Error('Cannot delete item group with child groups. Please move or delete child groups first.');
      }

      const { error } = await supabase
        .from('item_groups')
        .delete()
        .eq('id', groupId)
        .eq('organization_id', currentOrganization.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['item-groups', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['item-group-tree', currentOrganization?.id] });
    },
  });
}

// =====================================================
// ITEMS MUTATIONS
// =====================================================

/**
 * Hook to create a new item
 */
export function useCreateItem() {
  const queryClient = useQueryClient();
  const { currentOrganization, user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateItemInput) => {
      if (!currentOrganization?.id || !user?.id) {
        throw new Error('No organization or user');
      }

      // Generate item code if not provided
      let item_code = input.item_code;
      if (!item_code) {
        const { data: generatedCode, error: codeError } = await supabase.rpc(
          'generate_item_code',
          {
            p_organization_id: currentOrganization.id,
            p_item_group_id: input.item_group_id,
            p_prefix: null as any,
          }
        );

        if (codeError) throw codeError;
        item_code = generatedCode as string;
      }

      const { data, error } = await supabase
        .from('items')
        .insert({
          ...input,
          item_code,
          organization_id: currentOrganization.id,
          stock_uom: input.stock_uom || input.default_unit,
          created_by: user.id,
          updated_by: user.id,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data as Item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['item-selection', currentOrganization?.id] });
    },
  });
}

/**
 * Hook to update an item
 */
export function useUpdateItem() {
  const queryClient = useQueryClient();
  const { currentOrganization, user } = useAuth();

  return useMutation({
    mutationFn: async ({ itemId, input }: { itemId: string; input: UpdateItemInput }) => {
      if (!currentOrganization?.id || !user?.id) {
        throw new Error('No organization or user');
      }

      const { data, error } = await supabase
        .from('items')
        .update({
          ...input,
          updated_by: user.id,
        } as any)
        .eq('id', itemId)
        .eq('organization_id', currentOrganization.id)
        .select()
        .single();

      if (error) throw error;
      return data as Item;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['items', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['item', variables.itemId] });
      queryClient.invalidateQueries({ queryKey: ['item-selection', currentOrganization?.id] });
    },
  });
}

/**
 * Hook to delete an item (only if not used in transactions)
 */
export function useDeleteItem() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (itemId: string) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      // Check if item is used in stock entries
      const { data: stockEntries } = await supabase
        .from('stock_entry_items')
        .select('id')
        .eq('item_id', itemId)
        .limit(1);

      if (stockEntries && stockEntries.length > 0) {
        throw new Error('Cannot delete item used in stock transactions. Please deactivate it instead.');
      }

      // Check if item is used in invoices
      const { data: invoices } = await supabase
        .from('invoice_items')
        .select('id')
        .eq('item_id', itemId)
        .limit(1);

      if (invoices && invoices.length > 0) {
        throw new Error('Cannot delete item used in invoices. Please deactivate it instead.');
      }

      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', itemId)
        .eq('organization_id', currentOrganization.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['item-selection', currentOrganization?.id] });
    },
  });
}

// =====================================================
// ITEM PRICES QUERIES
// =====================================================

/**
 * Hook to fetch prices for an item
 */
export function useItemPrices(itemId: string | null) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['item-prices', itemId],
    queryFn: async () => {
      if (!itemId) throw new Error('Item ID is required');

      const { data, error } = await supabase
        .from('item_prices')
        .select(`
          *,
          customer:customers(id, name),
          supplier:suppliers(id, name)
        `)
        .eq('item_id', itemId)
        .eq('is_active', true)
        .order('price_list_name', { ascending: true });

      if (error) throw error;
      return data as ItemPrice[];
    },
    enabled: !!itemId && !!currentOrganization?.id,
  });
}

/**
 * Hook to get price for an item (considering customer, price list, etc.)
 */
export function useGetItemPrice(itemId: string | null, options?: {
  price_list_name?: string;
  customer_id?: string;
  unit?: string;
}) {
  const { data: prices } = useItemPrices(itemId);

  return useQuery({
    queryKey: ['item-price', itemId, options],
    queryFn: async () => {
      if (!prices || prices.length === 0) return null;

      // Find matching price
      const matchedPrice = prices.find((p) => {
        // Match price list
        if (options?.price_list_name && p.price_list_name !== options.price_list_name) {
          return false;
        }

        // Match customer
        if (options?.customer_id) {
          if (p.customer_id && p.customer_id !== options.customer_id) {
            return false;
          }
        }

        // Match unit
        if (options?.unit && p.unit !== options.unit) {
          return false;
        }

        // Check validity dates
        if (p.valid_from && new Date(p.valid_from) > new Date()) {
          return false;
        }
        if (p.valid_upto && new Date(p.valid_upto) < new Date()) {
          return false;
        }

        return true;
      });

      return matchedPrice || null;
    },
    enabled: !!prices && !!itemId,
  });
}

