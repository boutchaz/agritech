import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../components/MultiTenantAuthProvider';
import { suppliersApi } from '../lib/api/suppliers';

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

      const data = await suppliersApi.getAll(
        { is_active: true },
        currentOrganization.id
      );
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
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      const data = await suppliersApi.getOne(supplierId, currentOrganization.id);
      return data as Supplier;
    },
    enabled: !!supplierId && !!currentOrganization?.id,
  });
}

/**
 * Hook to create a new supplier
 */
export function useCreateSupplier() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (supplierData: Omit<Supplier, 'id' | 'organization_id' | 'created_at' | 'updated_at'>) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      const data = await suppliersApi.create(supplierData, currentOrganization.id);
      return data as Supplier;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers', currentOrganization?.id] });
    },
  });
}

/**
 * Hook to update a supplier
 */
export function useUpdateSupplier() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...supplierData }: Partial<Supplier> & { id: string }) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      const data = await suppliersApi.update(id, supplierData, currentOrganization.id);
      return data as Supplier;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['suppliers', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['supplier', variables.id] });
    },
  });
}

/**
 * Hook to delete/deactivate a supplier
 */
export function useDeleteSupplier() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (supplierId: string) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      await suppliersApi.delete(supplierId, currentOrganization.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers', currentOrganization?.id] });
    },
  });
}
