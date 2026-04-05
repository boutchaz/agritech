import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { quotesApi } from '../lib/api/quotes';
import { extractApiResponse } from '../lib/api/types';
import type {
  QuoteResponse,
  QuoteWithItems,
  CreateQuoteFormInput,
  UpdateQuoteFormInput,
  PaginatedQuoteQuery,
  PaginatedResponse,
} from '../types/quotes';

export type {
  QuoteResponse as Quote,
  QuoteItemResponse as QuoteItem,
  QuoteWithItems,
  QuoteFormItemInput as QuoteItemInput,
  CreateQuoteFormInput,
  UpdateQuoteFormInput,
} from '../types/quotes';

export function useQuotes(status?: QuoteResponse['status']) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['quotes', currentOrganization?.id, status],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      const response = await quotesApi.getAll(
        {
          status,
          page: 1,
          pageSize: 100,
        },
        currentOrganization.id
      );
      return extractApiResponse<QuoteResponse>(response);
    },
    enabled: !!currentOrganization?.id,
  });
}

export function usePaginatedQuotes(query: PaginatedQuoteQuery) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['quotes', 'paginated', currentOrganization?.id, query],
    queryFn: async (): Promise<PaginatedResponse<QuoteResponse>> => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      return quotesApi.getPaginated(query, currentOrganization.id) as unknown as PaginatedResponse<QuoteResponse>;
    },
    enabled: !!currentOrganization?.id,
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
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
      return data as unknown as QuoteWithItems;
    },
    enabled: !!quoteId && !!currentOrganization?.id,
  });
}

/**
 * Hook to create a new quote
 */
export function useCreateQuote() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (quoteData: CreateQuoteFormInput) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      // Use the NestJS API to create the quote
      // Items can have either 'rate' (from form) or 'unit_price' (from transformed data)
      const data = await quotesApi.create(
        {
          customer_id: quoteData.customer_id,
          quote_date: quoteData.quote_date,
          valid_until: quoteData.valid_until,
          items: quoteData.items.map((item, index) => ({
            line_number: index + 1,
            item_id: item.item_id,
            item_name: item.item_name,
            description: item.description,
            quantity: Number(item.quantity) || 1,
            unit_price: Number(item.unit_price || item.rate) || 0,
            account_id: item.account_id,
            tax_id: item.tax_id || undefined,
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
 * Hook to update a quote (only drafts)
 */
export function useUpdateQuote() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async ({
      quoteId,
      quoteData,
    }: { quoteId: string; quoteData: UpdateQuoteFormInput }) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      // Transform items if provided
      // Items can have either 'rate' (from form) or 'unit_price' (from transformed data)
      const transformedData = {
        ...quoteData,
        items: quoteData.items?.map((item, index) => ({
          line_number: index + 1,
          item_id: item.item_id,
          item_name: item.item_name,
          description: item.description,
          quantity: Number(item.quantity) || 1,
          unit_price: Number(item.unit_price || item.rate) || 0,
          account_id: item.account_id,
          tax_id: item.tax_id || undefined,
        })),
      };

      const data = await quotesApi.update(quoteId, transformedData, currentOrganization.id);
      return data as unknown as QuoteResponse;
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
    mutationFn: async ({ quoteId, status }: { quoteId: string; status: QuoteResponse['status'] }) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      const data = await quotesApi.updateStatus(
        quoteId,
        { status },
        currentOrganization.id
      );
      return data as unknown as QuoteResponse;
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
