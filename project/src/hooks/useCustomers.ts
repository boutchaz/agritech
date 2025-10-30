import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/MultiTenantAuthProvider';

export interface Customer {
  id: string;
  organization_id: string;
  name: string;
  customer_code: string | null;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  address: string | null;
  city: string | null;
  state_province: string | null;
  postal_code: string | null;
  country: string | null;
  website: string | null;
  tax_id: string | null;
  payment_terms: string | null;
  credit_limit: number | null;
  currency_code: string | null;
  customer_type: string | null;
  price_list: string | null;
  assigned_to: string | null;
  notes: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
}

/**
 * Hook to fetch all customers for the current organization
 */
export function useCustomers() {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['customers', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Customer[];
    },
    enabled: !!currentOrganization?.id,
  });
}

/**
 * Hook to fetch a single customer
 */
export function useCustomer(customerId: string | null) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['customer', customerId],
    queryFn: async () => {
      if (!customerId) {
        throw new Error('Customer ID is required');
      }

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .eq('organization_id', currentOrganization?.id || '')
        .single();

      if (error) throw error;
      return data as Customer;
    },
    enabled: !!customerId && !!currentOrganization?.id,
  });
}

/**
 * Hook to create a new customer
 */
export function useCreateCustomer() {
  const queryClient = useQueryClient();
  const { currentOrganization, user } = useAuth();

  return useMutation({
    mutationFn: async (customerData: Omit<Customer, 'id' | 'organization_id' | 'created_at' | 'updated_at' | 'created_by'>) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      const { data, error } = await supabase
        .from('customers')
        .insert({
          ...customerData,
          organization_id: currentOrganization.id,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Customer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', currentOrganization?.id] });
    },
  });
}

/**
 * Hook to update a customer
 */
export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...customerData }: Partial<Customer> & { id: string }) => {
      const { data, error } = await supabase
        .from('customers')
        .update(customerData)
        .eq('id', id)
        .eq('organization_id', currentOrganization?.id || '')
        .select()
        .single();

      if (error) throw error;
      return data as Customer;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customers', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['customer', variables.id] });
    },
  });
}

/**
 * Hook to delete/deactivate a customer
 */
export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (customerId: string) => {
      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('customers')
        .update({ is_active: false })
        .eq('id', customerId)
        .eq('organization_id', currentOrganization?.id || '');

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', currentOrganization?.id] });
    },
  });
}
