import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/MultiTenantAuthProvider';
import type { Tax } from '../lib/taxCalculations';

/**
 * Hook to fetch all active taxes for the current organization
 */
export function useTaxes(invoiceType?: 'sales' | 'purchase') {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['taxes', currentOrganization?.id, invoiceType],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      let query = supabase
        .from('taxes')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .eq('is_active', true)
        .order('name');

      // Filter by invoice type if specified
      if (invoiceType) {
        query = query.or(`tax_type.eq.${invoiceType},tax_type.eq.both`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Tax[];
    },
    enabled: !!currentOrganization?.id,
  });
}

/**
 * Hook to fetch a single tax by ID
 */
export function useTax(taxId: string | null) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['tax', taxId],
    queryFn: async () => {
      if (!taxId) {
        throw new Error('Tax ID is required');
      }

      const { data, error } = await supabase
        .from('taxes')
        .select('*')
        .eq('id', taxId)
        .eq('organization_id', currentOrganization?.id || '')
        .single();

      if (error) throw error;
      return data as Tax;
    },
    enabled: !!taxId && !!currentOrganization?.id,
  });
}

/**
 * Hook to fetch sales taxes only
 */
export function useSalesTaxes() {
  return useTaxes('sales');
}

/**
 * Hook to fetch purchase taxes only
 */
export function usePurchaseTaxes() {
  return useTaxes('purchase');
}

/**
 * Hook to create a new tax
 */
export function useCreateTax() {
  const { currentOrganization, user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tax: {
      tax_name: string;
      tax_rate: number;
      tax_type: 'sales' | 'purchase' | 'both';
      is_active?: boolean;
    }) => {
      if (!currentOrganization?.id || !user?.id) {
        throw new Error('No organization or user');
      }

      const { data, error } = await supabase
        .from('taxes')
        .insert({
          organization_id: currentOrganization.id,
          name: tax.tax_name,
          rate: tax.tax_rate,
          tax_type: tax.tax_type,
          is_active: tax.is_active ?? true,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Tax;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxes', currentOrganization?.id] });
    },
  });
}
