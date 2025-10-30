import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/MultiTenantAuthProvider';

export interface InventoryItem {
  id: string;
  organization_id: string | null;
  farm_id: string;
  name: string;
  item_name: string | null;
  quantity: number | null;
  unit: string | null;
  min_stock_level: number | null;
  max_stock_level: number | null;
  category_id: string;
  subcategory_id: string | null;
  sku: string | null;
  brand: string | null;
  supplier: string | null;
  cost_per_unit: number | null;
  storage_location: string | null;
  batch_number: string | null;
  expiry_date: string | null;
  status: string | null;
  notes: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export function useInventory() {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['inventory', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        return [];
      }

      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      return (data || []) as InventoryItem[];
    },
    enabled: !!currentOrganization?.id,
    staleTime: 1000 * 60, // 1 minute
  });
}
