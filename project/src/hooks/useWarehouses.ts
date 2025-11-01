import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/MultiTenantAuthProvider';

export interface Warehouse {
  id: string;
  organization_id: string;
  farm_id: string | null;
  name: string;
  description: string | null;
  location: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  capacity: number | null;
  capacity_unit: string | null;
  temperature_controlled: boolean | null;
  humidity_controlled: boolean | null;
  security_level: string | null;
  manager_name: string | null;
  manager_phone: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

/**
 * Fetch all active warehouses for the current organization
 */
export function useWarehouses() {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['warehouses', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as Warehouse[];
    },
    enabled: !!currentOrganization?.id,
    staleTime: 60000, // 1 minute
  });
}
