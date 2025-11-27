import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/MultiTenantAuthProvider';
import { itemsApi } from '@/lib/api/items';

export interface ItemFarmUsage {
  farm_id: string;
  farm_name: string;
  parcel_id?: string;
  parcel_name?: string;
  usage_count: number;
  last_used_date?: string;
  total_quantity_used: number;
  task_ids: string[];
}

export interface ItemUsageSummary {
  item_id: string;
  total_usage_count: number;
  last_used_date?: string;
  total_quantity_used: number;
  by_farm: ItemFarmUsage[];
}

/**
 * Hook to fetch item usage by farm/parcel
 * Aggregates usage from tasks and stock movements
 */
export function useItemFarmUsage(itemId: string | null) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['item-farm-usage', itemId, currentOrganization?.id],
    queryFn: async (): Promise<ItemUsageSummary | null> => {
      if (!itemId || !currentOrganization?.id) return null;

      return itemsApi.getItemFarmUsage(itemId, currentOrganization.id);
    },
    enabled: !!itemId && !!currentOrganization?.id,
  });
}

