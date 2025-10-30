import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/MultiTenantAuthProvider';

export interface Supplier {
  id: string;
  organization_id: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  website: string | null;
  tax_id: string | null;
  payment_terms: string | null;
  notes: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

/**
 * Hook to fetch all suppliers for the current organization
 */
export function useSuppliers() {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['suppliers', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Supplier[];
    },
    enabled: !!currentOrganization?.id,
  });
}

/**
 * Hook to fetch a single supplier
 */
export function useSupplier(supplierId: string | null) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['supplier', supplierId],
    queryFn: async () => {
      if (!supplierId) {
        throw new Error('Supplier ID is required');
      }

      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', supplierId)
        .eq('organization_id', currentOrganization?.id || '')
        .single();

      if (error) throw error;
      return data as Supplier;
    },
    enabled: !!supplierId && !!currentOrganization?.id,
  });
}
