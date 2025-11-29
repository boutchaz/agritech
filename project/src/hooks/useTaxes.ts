import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../components/MultiTenantAuthProvider';
import { taxesApi } from '../lib/api/taxes';
import type { CreateTaxInput } from '../lib/api/taxes';

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

      return taxesApi.getAll({
        tax_type: invoiceType,
        is_active: true,
      }, currentOrganization.id);
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

      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      return taxesApi.getOne(taxId, currentOrganization.id);
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
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tax: CreateTaxInput) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      return taxesApi.create(tax, currentOrganization.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxes', currentOrganization?.id] });
    },
  });
}
