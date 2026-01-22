import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { itemsApi } from '../lib/api/items';

// Updated interface to match the new API structure from getFarmStockLevels
// Maps old inventory table fields to new items/stock_valuation structure
export interface InventoryItem {
  id: string;
  item_id: string;
  item_code: string;
  item_name: string;
  name: string; // Alias for item_name for backward compatibility
  quantity: number;
  unit: string;
  min_stock_level?: number;
  is_low_stock: boolean;
  total_value: number;
  by_farm: Array<{
    farm_id: string | null;
    farm_name: string | null;
    warehouse_id: string;
    warehouse_name: string;
    item_id: string;
    total_quantity: number;
    total_value: number;
    is_low_stock: boolean;
    minimum_stock_level?: number;
  }>;
  // Fields no longer available in new API structure:
  // - brand (not available)
  // - organization_id (implicit via auth)
  // - farm_id (now in by_farm array)
  // - max_stock_level (not implemented in new system)
  // - category_id, subcategory_id (replaced by item_groups)
  // - sku, supplier, cost_per_unit (use purchase orders)
  // - storage_location (use warehouse_id)
  // - batch_number, expiry_date (use stock_entries)
  // - status, notes, is_active (use items table)
}

export function useInventory() {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['inventory', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        return [];
      }

      // Use the new items API with farm stock levels
      const data = await itemsApi.getFarmStockLevels({}, currentOrganization.id);

      // Transform the response to match the expected interface
      const transformedData = (data || []).map((item: any) => ({
        ...item,
        id: item.item_id, // Use item_id as id for compatibility
        name: item.item_name, // Add name alias for backward compatibility
        quantity: item.total_quantity || 0,
        unit: item.default_unit || '',
        min_stock_level: item.minimum_stock_level,
      }));

      return transformedData;
    },
    enabled: !!currentOrganization?.id,
    staleTime: 1000 * 60, // 1 minute
  });
}
