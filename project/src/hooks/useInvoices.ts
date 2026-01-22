import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { createInvoiceFromItems, fetchPartyName } from '../lib/invoice-service';
import { invoicesApi, type PaginatedInvoiceQuery } from '../lib/api/invoices';
import type { PaginatedResponse } from '../lib/api/types';

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

      const response = await invoicesApi.getAll({}, currentOrganization.id);
      if (Array.isArray(response)) {
        return response as Invoice[];
      }
      return ((response as any)?.data || []) as Invoice[];
    },
    enabled: !!currentOrganization?.id,
  });
}

export function usePaginatedInvoices(query: PaginatedInvoiceQuery) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['invoices', 'paginated', currentOrganization?.id, query],
    queryFn: async (): Promise<PaginatedResponse<Invoice>> => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      return invoicesApi.getPaginated(query, currentOrganization.id);
    },
    enabled: !!currentOrganization?.id,
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });
}

export function useInvoicesByType(type: 'sales' | 'purchase') {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['invoices', currentOrganization?.id, type],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      const response = await invoicesApi.getAll({ invoice_type: type }, currentOrganization.id);
      if (Array.isArray(response)) {
        return response as Invoice[];
      }
      return ((response as any)?.data || []) as Invoice[];
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
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      const data = await invoicesApi.getOne(invoiceId, currentOrganization.id);
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

      const response = await invoicesApi.getAll({ status }, currentOrganization.id);
      if (Array.isArray(response)) {
        return response as Invoice[];
      }
      return ((response as any)?.data || []) as Invoice[];
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
 * Uses shared invoice service to eliminate duplicate logic
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
      const partyName = await fetchPartyName(invoiceData.party_id, invoiceData.invoice_type);

      if (!partyName) {
        throw new Error(`Party not found for ${invoiceData.invoice_type === 'sales' ? 'customer' : 'supplier'} ID: ${invoiceData.party_id}`);
      }

      // Use shared invoice service
      const invoice = await createInvoiceFromItems({
        organization_id: currentOrganization.id,
        user_id: user.id,
        invoice_type: invoiceData.invoice_type,
        party_id: invoiceData.party_id,
        party_name: partyName,
        invoice_date: invoiceData.invoice_date,
        due_date: invoiceData.due_date,
        items: invoiceData.items,
        currency_code: currentOrganization.currency || 'MAD',
        exchange_rate: 1.0,
        status: 'draft',
        remarks: invoiceData.remarks,
        farm_id: invoiceData.farm_id || null,
        parcel_id: invoiceData.parcel_id || null,
        sales_order_id: null,
        purchase_order_id: null,
      });

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
 * Updated to use NestJS API instead of Supabase Edge Function
 */
export function usePostInvoice() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (data: { invoice_id: string; posting_date: string }) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      return await invoicesApi.postInvoice(
        data.invoice_id,
        data.posting_date,
        currentOrganization.id
      );
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
    mutationFn: async (data: { invoice_id: string; status: Invoice['status']; remarks?: string }) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      await invoicesApi.updateStatus(
        data.invoice_id,
        { status: data.status, remarks: data.remarks },
        currentOrganization.id
      );
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
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      await invoicesApi.delete(invoiceId, currentOrganization.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', currentOrganization?.id] });
    },
  });
}

/**
 * Hook to update a draft invoice
 */
export function useUpdateInvoice() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      invoiceId: string;
      party_id?: string;
      party_name?: string;
      invoice_date?: string;
      due_date?: string;
      payment_terms?: string;
      notes?: string;
      items?: Array<{
        id?: string;
        item_name: string;
        description?: string;
        quantity: number;
        unit_price: number;
        amount: number;
        tax_id?: string;
        tax_rate?: number;
        tax_amount: number;
        line_total: number;
        income_account_id?: string;
        expense_account_id?: string;
        item_id?: string;
      }>;
    }) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      const { invoiceId, ...updateData } = data;
      return await invoicesApi.update(invoiceId, updateData, currentOrganization.id);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invoices', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['invoice', variables.invoiceId] });
    },
  });
}
