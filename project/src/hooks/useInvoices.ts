import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/MultiTenantAuthProvider';

export interface Invoice {
  id: string;
  organization_id: string;
  invoice_number: string;
  invoice_type: 'sales' | 'purchase';
  party_type: 'Customer' | 'Supplier' | null;
  party_id: string | null;
  party_name: string;
  invoice_date: string;
  due_date: string;
  subtotal: number;
  tax_total: number;
  grand_total: number;
  outstanding_amount: number;
  currency_code: string;
  exchange_rate: number;
  status: 'draft' | 'submitted' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled';
  farm_id: string | null;
  parcel_id: string | null;
  attachment_url: string | null;
  remarks: string | null;
  created_by: string | null;
  submitted_by: string | null;
  submitted_at: string | null;
  journal_entry_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  item_name: string;
  description: string | null;
  quantity: number;
  rate: number;
  amount: number;
  account_id: string;
  tax_id: string | null;
  tax_amount: number;
  cost_center_id: string | null;
}

export interface InvoiceWithItems extends Invoice {
  items?: InvoiceItem[];
}

/**
 * Hook to fetch all invoices for the current organization
 */
export function useInvoices() {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['invoices', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('invoice_date', { ascending: false });

      if (error) throw error;
      return data as Invoice[];
    },
    enabled: !!currentOrganization?.id,
  });
}

/**
 * Hook to fetch invoices filtered by type
 */
export function useInvoicesByType(type: 'sales' | 'purchase') {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['invoices', currentOrganization?.id, type],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .eq('invoice_type', type)
        .order('invoice_date', { ascending: false });

      if (error) throw error;
      return data as Invoice[];
    },
    enabled: !!currentOrganization?.id,
  });
}

/**
 * Hook to fetch a single invoice with its items
 */
export function useInvoice(invoiceId: string | null) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: async () => {
      if (!invoiceId) {
        throw new Error('Invoice ID is required');
      }

      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          items:invoice_items(*)
        `)
        .eq('id', invoiceId)
        .eq('organization_id', currentOrganization?.id || '')
        .single();

      if (error) throw error;
      return data as InvoiceWithItems;
    },
    enabled: !!invoiceId && !!currentOrganization?.id,
  });
}

/**
 * Hook to fetch invoices by status
 */
export function useInvoicesByStatus(status: Invoice['status']) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['invoices', currentOrganization?.id, 'status', status],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .eq('status', status)
        .order('invoice_date', { ascending: false});

      if (error) throw error;
      return data as Invoice[];
    },
    enabled: !!currentOrganization?.id,
  });
}

/**
 * Hook to calculate invoice statistics
 */
export function useInvoiceStats() {
  const { data: invoices } = useInvoices();

  const stats = {
    total: invoices?.length || 0,
    draft: invoices?.filter(i => i.status === 'draft').length || 0,
    submitted: invoices?.filter(i => i.status === 'submitted').length || 0,
    paid: invoices?.filter(i => i.status === 'paid').length || 0,
    partiallyPaid: invoices?.filter(i => i.status === 'partially_paid').length || 0,
    overdue: invoices?.filter(i => i.status === 'overdue').length || 0,
    cancelled: invoices?.filter(i => i.status === 'cancelled').length || 0,
    totalAmount: invoices?.reduce((sum, i) => sum + Number(i.grand_total), 0) || 0,
    outstandingAmount: invoices?.reduce((sum, i) => sum + Number(i.outstanding_amount), 0) || 0,
  };

  return stats;
}

/**
 * Hook to create a new invoice using Edge Function
 */
export function useCreateInvoice() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (invoiceData: {
      invoice_type: 'sales' | 'purchase';
      party_name: string;
      invoice_date: string;
      due_date: string;
      items: {
        item_name: string;
        description?: string;
        quantity: number;
        rate: number;
        account_id: string;
        tax_id?: string;
        cost_center_id?: string;
      }[];
      remarks?: string;
    }) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-invoice`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'x-organization-id': currentOrganization.id,
          },
          body: JSON.stringify(invoiceData),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create invoice');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch invoices
      queryClient.invalidateQueries({ queryKey: ['invoices', currentOrganization?.id] });
    },
  });
}

/**
 * Hook to post an invoice (creates journal entry)
 */
export function usePostInvoice() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (data: { invoice_id: string; posting_date: string }) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/post-invoice`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'x-organization-id': currentOrganization.id,
          },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to post invoice');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate invoices and the specific invoice
      queryClient.invalidateQueries({ queryKey: ['invoices', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['invoice', variables.invoice_id] });
      queryClient.invalidateQueries({ queryKey: ['journal_entries'] });
    },
  });
}

/**
 * Hook to update invoice status
 */
export function useUpdateInvoiceStatus() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (data: { invoice_id: string; status: Invoice['status'] }) => {
      const { error } = await supabase
        .from('invoices')
        .update({ status: data.status })
        .eq('id', data.invoice_id)
        .eq('organization_id', currentOrganization?.id || '');

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invoices', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['invoice', variables.invoice_id] });
    },
  });
}

/**
 * Hook to delete invoice (only drafts)
 */
export function useDeleteInvoice() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId)
        .eq('organization_id', currentOrganization?.id || '')
        .eq('status', 'draft'); // Only allow deleting drafts

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', currentOrganization?.id] });
    },
  });
}
