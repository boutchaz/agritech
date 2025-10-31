import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/MultiTenantAuthProvider';
import { calculateInvoiceTotals } from '../lib/taxCalculations';

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
 * Hook to create a new invoice with direct database insert
 */
export function useCreateInvoice() {
  const queryClient = useQueryClient();
  const { currentOrganization, user } = useAuth();

  return useMutation({
    mutationFn: async (invoiceData: {
      invoice_type: 'sales' | 'purchase';
      party_id: string;
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
      farm_id?: string | null;
      parcel_id?: string | null;
    }) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Fetch party name from suppliers or customers
      let partyName = '';
      if (invoiceData.invoice_type === 'purchase') {
        const { data: supplier } = await supabase
          .from('suppliers')
          .select('name')
          .eq('id', invoiceData.party_id)
          .single();
        partyName = supplier?.name || '';
      } else {
        const { data: customer } = await supabase
          .from('customers')
          .select('name')
          .eq('id', invoiceData.party_id)
          .single();
        partyName = customer?.name || '';
      }

      // Generate invoice number
      const { data: invoiceNumber, error: numberError } = await supabase
        .rpc('generate_invoice_number', {
          p_organization_id: currentOrganization.id,
          p_invoice_type: invoiceData.invoice_type,
        });

      if (numberError) throw numberError;

      // Calculate totals from items with proper tax calculation and rounding
      const totals = await calculateInvoiceTotals(invoiceData.items, invoiceData.invoice_type);
      const { subtotal, tax_total, grand_total, items_with_tax } = totals;

      // Create invoice with calculated totals
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          organization_id: currentOrganization.id,
          invoice_number: invoiceNumber,
          invoice_type: invoiceData.invoice_type,
          party_type: invoiceData.invoice_type === 'sales' ? 'Customer' : 'Supplier',
          party_id: invoiceData.party_id,
          party_name: partyName,
          invoice_date: invoiceData.invoice_date,
          due_date: invoiceData.due_date,
          subtotal,
          tax_total,
          grand_total,
          outstanding_amount: grand_total,
          currency_code: currentOrganization.currency || 'MAD',
          status: 'draft',
          remarks: invoiceData.remarks,
          farm_id: invoiceData.farm_id || null,
          parcel_id: invoiceData.parcel_id || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice items with properly calculated and rounded tax amounts
      // Use the items_with_tax from calculateInvoiceTotals which has accurate per-line tax
      const itemsToInsert = items_with_tax
        .filter(item => {
          // Ensure quantity is greater than 0 (database constraint)
          if (!item.quantity || item.quantity <= 0) {
            console.error(`Invalid quantity for item "${item.item_name}": ${item.quantity}`);
            return false;
          }
          return true;
        })
        .map(item => ({
          invoice_id: invoice.id,
          item_name: item.item_name,
          description: item.description || null,
          quantity: Number(item.quantity), // Ensure it's a number
          unit_price: Number(item.rate), // Ensure it's a number
          amount: Number(item.amount), // Already rounded, ensure it's a number
          tax_amount: Number(item.tax_amount) || 0, // Already rounded per line, ensure it's a number
          income_account_id: invoiceData.invoice_type === 'sales' ? item.account_id : null,
          expense_account_id: invoiceData.invoice_type === 'purchase' ? item.account_id : null,
          tax_id: item.tax_id || null,
          cost_center_id: item.cost_center_id || null,
        }));
      
      // Validate all items have quantity > 0
      if (itemsToInsert.length === 0) {
        throw new Error('At least one item with quantity > 0 is required');
      }
      
      const invalidItems = itemsToInsert.filter(item => item.quantity <= 0);
      if (invalidItems.length > 0) {
        throw new Error(`Invalid quantities found. All items must have quantity > 0. Invalid items: ${invalidItems.map(i => i.item_name).join(', ')}`);
      }

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      return invoice;
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
