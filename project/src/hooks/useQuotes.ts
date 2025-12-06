import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../components/MultiTenantAuthProvider';
import { type InvoiceItemInput } from '../lib/taxCalculations';
import { quotesApi } from '../lib/api/quotes';

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

      const data = await quotesApi.getAll(
        {
          status,
          page: 1,
          limit: 1000,
        },
        currentOrganization.id
      );
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
      if (!currentOrganization?.id) throw new Error('No organization selected');

      const data = await quotesApi.getOne(quoteId, currentOrganization.id);
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
  const { currentOrganization, _user } = useAuth();

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
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      // Use the NestJS API to create the quote
      const data = await quotesApi.create(
        {
          customer_id: quoteData.customer_id,
          quote_date: quoteData.quote_date,
          valid_until: quoteData.valid_until,
          items: quoteData.items.map(item => ({
            item_id: item.item_id,
            item_name: item.item_name,
            description: item.description,
            quantity: item.quantity,
            rate: item.rate,
            account_id: item.account_id,
            tax_id: item.tax_id || null,
          })),
          payment_terms: quoteData.payment_terms,
          delivery_terms: quoteData.delivery_terms,
          terms_and_conditions: quoteData.terms_and_conditions,
          notes: quoteData.notes,
          reference_number: quoteData.reference_number,
        },
        currentOrganization.id
      );

      return data;
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
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async ({ quoteId, status }: { quoteId: string; status: Quote['status'] }) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      const data = await quotesApi.updateStatus(
        quoteId,
        { status },
        currentOrganization.id
      );
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
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (quoteId: string) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      // Use NestJS API to convert quote to order
      const result = await quotesApi.convertToOrder(quoteId, currentOrganization.id);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['sales_orders', currentOrganization?.id] });
    },
  });
}
