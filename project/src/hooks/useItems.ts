import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { itemsApi } from '../lib/api/items';
import type {
  ItemGroupWithChildren,
  ItemPrice,
  CreateItemInput,
  UpdateItemInput,
  CreateItemGroupInput,
  UpdateItemGroupInput,
  ItemFilters,
  ItemGroupFilters,
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

      return itemsApi.getAllGroups(filters, currentOrganization.id);
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
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      return itemsApi.getOneGroup(groupId, currentOrganization.id);
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

      return itemsApi.getAll(filters, currentOrganization.id);
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
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      return itemsApi.getOne(itemId, currentOrganization.id);
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

      return itemsApi.getForSelection(filters, currentOrganization.id);
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
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateItemGroupInput) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      return itemsApi.createGroup(input, currentOrganization.id);
    },
    onSuccess: () => {
      // Use partial match to invalidate all item-groups queries regardless of filters
      queryClient.invalidateQueries({ queryKey: ['item-groups'] });
      queryClient.invalidateQueries({ queryKey: ['item-group-tree'] });
    },
  });
}

/**
 * Hook to update an item group
 */
export function useUpdateItemGroup() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async ({ groupId, input }: { groupId: string; input: UpdateItemGroupInput }) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      return itemsApi.updateGroup(groupId, input, currentOrganization.id);
    },
    onSuccess: (_, variables) => {
      // Use partial match to invalidate all item-groups queries regardless of filters
      queryClient.invalidateQueries({ queryKey: ['item-groups'] });
      queryClient.invalidateQueries({ queryKey: ['item-group', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['item-group-tree'] });
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

      return itemsApi.deleteGroup(groupId, currentOrganization.id);
    },
    onSuccess: () => {
      // Use partial match to invalidate all item-groups queries regardless of filters
      queryClient.invalidateQueries({ queryKey: ['item-groups'] });
      queryClient.invalidateQueries({ queryKey: ['item-group-tree'] });
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
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateItemInput) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      return itemsApi.create(input, currentOrganization.id);
    },
    onSuccess: () => {
      // Use partial match to invalidate all items queries regardless of filters
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['item-selection'] });
    },
  });
}

/**
 * Hook to update an item
 */
export function useUpdateItem() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async ({ itemId, input }: { itemId: string; input: UpdateItemInput }) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      return itemsApi.update(itemId, input, currentOrganization.id);
    },
    onSuccess: (_, variables) => {
      // Use partial match to invalidate all items queries regardless of filters
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['item', variables.itemId] });
      queryClient.invalidateQueries({ queryKey: ['item-selection'] });
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

      return itemsApi.delete(itemId, currentOrganization.id);
    },
    onSuccess: () => {
      // Use partial match to invalidate all items queries regardless of filters
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['item-selection'] });
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
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      return itemsApi.getItemPrices(itemId, currentOrganization.id);
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

