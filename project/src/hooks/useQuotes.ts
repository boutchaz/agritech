import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/MultiTenantAuthProvider';
import { calculateInvoiceTotals, type InvoiceItemInput } from '../lib/taxCalculations';

export interface Quote {
  id: string;
  organization_id: string;
  quote_number: string;
  quote_date: string;
  valid_until: string;
  customer_id: string | null;
  customer_name: string;
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  subtotal: number;
  tax_total: number;
  discount_amount: number;
  grand_total: number;
  currency_code: string;
  exchange_rate: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted' | 'cancelled';
  payment_terms: string | null;
  delivery_terms: string | null;
  terms_and_conditions: string | null;
  notes: string | null;
  reference_number: string | null;
  sales_order_id: string | null;
  farm_id: string | null;
  parcel_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  sent_at: string | null;
  sent_by: string | null;
  accepted_at: string | null;
  converted_at: string | null;
  converted_by: string | null;
}

export interface QuoteItem {
  id: string;
  quote_id: string;
  line_number: number;
  item_name: string;
  description: string | null;
  quantity: number;
  unit_of_measure: string;
  unit_price: number;
  amount: number;
  discount_percent: number;
  discount_amount: number;
  tax_id: string | null;
  tax_rate: number;
  tax_amount: number;
  line_total: number;
  account_id: string | null;
}

export interface QuoteWithItems extends Quote {
  items?: QuoteItem[];
}

/**
 * Hook to fetch all quotes
 */
export function useQuotes(status?: Quote['status']) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['quotes', currentOrganization?.id, status],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      let query = supabase
        .from('quotes')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('quote_date', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Quote[];
    },
    enabled: !!currentOrganization?.id,
  });
}

/**
 * Hook to fetch a single quote with items
 */
export function useQuote(quoteId: string | null) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['quote', quoteId],
    queryFn: async () => {
      if (!quoteId) throw new Error('Quote ID is required');

      const { data, error } = await supabase
        .from('quotes')
        .select(`*, items:quote_items(*)`)
        .eq('id', quoteId)
        .eq('organization_id', currentOrganization?.id || '')
        .single();

      if (error) throw error;
      return data as QuoteWithItems;
    },
    enabled: !!quoteId && !!currentOrganization?.id,
  });
}

/**
 * Hook to create a new quote
 */
export function useCreateQuote() {
  const queryClient = useQueryClient();
  const { currentOrganization, user } = useAuth();

  return useMutation({
    mutationFn: async (quoteData: {
      customer_id: string;
      quote_date: string;
      valid_until: string;
      items: InvoiceItemInput[];
      payment_terms?: string;
      delivery_terms?: string;
      terms_and_conditions?: string;
      notes?: string;
      reference_number?: string;
    }) => {
      if (!currentOrganization?.id || !user?.id) {
        throw new Error('No organization or user');
      }

      // Fetch customer name
      const { data: customer } = await supabase
        .from('customers')
        .select('name, contact_person, email, phone')
        .eq('id', quoteData.customer_id)
        .single();

      // Generate quote number
      const { data: quoteNumber, error: numberError } = await supabase
        .rpc('generate_quote_number', {
          p_organization_id: currentOrganization.id,
        });

      if (numberError) throw numberError;

      // Calculate totals
      const totals = await calculateInvoiceTotals(quoteData.items, 'sales');

      // Create quote
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .insert({
          organization_id: currentOrganization.id,
          quote_number: quoteNumber,
          quote_date: quoteData.quote_date,
          valid_until: quoteData.valid_until,
          customer_id: quoteData.customer_id,
          customer_name: customer?.name || '',
          contact_person: customer?.contact_person,
          contact_email: customer?.email,
          contact_phone: customer?.phone,
          subtotal: totals.subtotal,
          tax_total: totals.tax_total,
          grand_total: totals.grand_total,
          currency_code: currentOrganization.currency || 'MAD',
          status: 'draft',
          payment_terms: quoteData.payment_terms,
          delivery_terms: quoteData.delivery_terms,
          terms_and_conditions: quoteData.terms_and_conditions,
          notes: quoteData.notes,
          reference_number: quoteData.reference_number,
          created_by: user.id,
        })
        .select()
        .single();

      if (quoteError) throw quoteError;

      // Create quote items
      const items = totals.items_with_tax.map((item, index) => ({
        quote_id: quote.id,
        line_number: index + 1,
        item_id: item.item_id || null,
        item_name: item.item_name,
        description: item.description || null,
        quantity: item.quantity,
        unit_price: item.rate,
        amount: item.amount,
        tax_id: item.tax_id || null,
        tax_rate: item.tax_rate || 0,
        tax_amount: item.tax_amount,
        line_total: item.total_amount,
        account_id: item.account_id,
      }));

      const { error: itemsError } = await supabase
        .from('quote_items')
        .insert(items);

      if (itemsError) throw itemsError;

      return quote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes', currentOrganization?.id] });
    },
  });
}

/**
 * Hook to update quote status
 */
export function useUpdateQuoteStatus() {
  const queryClient = useQueryClient();
  const { currentOrganization, user } = useAuth();

  return useMutation({
    mutationFn: async ({ quoteId, status }: { quoteId: string; status: Quote['status'] }) => {
      const updates: Partial<Quote> = { status };

      if (status === 'sent') {
        updates.sent_at = new Date().toISOString();
        updates.sent_by = user?.id || null;
      } else if (status === 'accepted') {
        updates.accepted_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('quotes')
        .update(updates)
        .eq('id', quoteId)
        .eq('organization_id', currentOrganization?.id || '')
        .select()
        .single();

      if (error) throw error;
      return data as Quote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes', currentOrganization?.id] });
    },
  });
}

/**
 * Hook to convert quote to sales order
 */
export function useConvertQuoteToOrder() {
  const queryClient = useQueryClient();
  const { currentOrganization, user } = useAuth();

  return useMutation({
    mutationFn: async (quoteId: string) => {
      if (!currentOrganization?.id || !user?.id) {
        throw new Error('No organization or user');
      }

      // Fetch quote with items
      const { data: quote, error: fetchError } = await supabase
        .from('quotes')
        .select(`*, items:quote_items(*)`)
        .eq('id', quoteId)
        .single();

      if (fetchError) throw fetchError;

      // Generate order number
      const { data: orderNumber, error: numberError } = await supabase
        .rpc('generate_sales_order_number', {
          p_organization_id: currentOrganization.id,
        });

      if (numberError) throw numberError;

      // Create sales order
      const { data: order, error: orderError } = await supabase
        .from('sales_orders')
        .insert({
          organization_id: currentOrganization.id,
          order_number: orderNumber,
          order_date: new Date().toISOString().split('T')[0],
          customer_id: quote.customer_id,
          customer_name: quote.customer_name,
          contact_person: quote.contact_person,
          contact_email: quote.contact_email,
          contact_phone: quote.contact_phone,
          subtotal: quote.subtotal,
          tax_total: quote.tax_total,
          grand_total: quote.grand_total,
          outstanding_amount: quote.grand_total,
          currency_code: quote.currency_code,
          exchange_rate: quote.exchange_rate,
          status: 'confirmed',
          payment_terms: quote.payment_terms,
          delivery_terms: quote.delivery_terms,
          notes: quote.notes,
          quote_id: quoteId,
          created_by: user.id,
          confirmed_at: new Date().toISOString(),
          confirmed_by: user.id,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Copy quote items to order items
      const orderItems = quote.items.map((item: any) => ({
        sales_order_id: order.id,
        line_number: item.line_number,
        item_name: item.item_name,
        description: item.description,
        quantity: item.quantity,
        unit_of_measure: item.unit_of_measure,
        unit_price: item.unit_price,
        amount: item.amount,
        discount_percent: item.discount_percent,
        discount_amount: item.discount_amount,
        tax_id: item.tax_id,
        tax_rate: item.tax_rate,
        tax_amount: item.tax_amount,
        line_total: item.line_total,
        account_id: item.account_id,
        quote_item_id: item.id,
      }));

      const { error: itemsError } = await supabase
        .from('sales_order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Update quote status and link to order
      await supabase
        .from('quotes')
        .update({
          status: 'converted',
          sales_order_id: order.id,
          converted_at: new Date().toISOString(),
          converted_by: user.id,
        })
        .eq('id', quoteId);

      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['sales_orders', currentOrganization?.id] });
    },
  });
}
