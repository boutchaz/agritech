import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QuoteRequestsApi, CreateQuoteRequestDto } from '@/lib/quote-requests-api';

export function useSentQuoteRequests(
  status?: string,
  options?: { refetchInterval?: number }
) {
  return useQuery({
    queryKey: ['quote-requests', 'sent', status ?? 'all'],
    queryFn: () => QuoteRequestsApi.getSent(status),
    staleTime: 5 * 60 * 1000,
    refetchInterval: options?.refetchInterval,
  });
}

export function useReceivedQuoteRequests(status?: string) {
  return useQuery({
    queryKey: ['quote-requests', 'received', status ?? 'all'],
    queryFn: () => QuoteRequestsApi.getReceived(status),
    staleTime: 5 * 60 * 1000,
  });
}

export function useQuoteRequest(id: string) {
  return useQuery({
    queryKey: ['quote-request', id],
    queryFn: () => QuoteRequestsApi.getById(id),
    staleTime: 5 * 60 * 1000,
    enabled: !!id,
  });
}

export function useQuoteRequestStats() {
  return useQuery({
    queryKey: ['quote-requests', 'stats'],
    queryFn: () => QuoteRequestsApi.getStats(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateQuoteRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateQuoteRequestDto) => QuoteRequestsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote-requests'] });
    },
  });
}

export function useAcceptQuoteRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => QuoteRequestsApi.accept(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote-requests'] });
    },
  });
}

export function useDeclineQuoteRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => QuoteRequestsApi.decline(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote-requests'] });
    },
  });
}
