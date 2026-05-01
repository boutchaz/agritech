import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  exchangeRatesApi,
  type CreateExchangeRateInput,
  type ExchangeRate,
  type ExchangeRateFilters,
  type UpdateExchangeRateInput,
} from '@/lib/api/exchange-rates';

export const useExchangeRates = (
  organizationId: string | null,
  filters?: ExchangeRateFilters,
) => {
  return useQuery<ExchangeRate[]>({
    queryKey: ['exchange-rates', organizationId, filters || {}],
    queryFn: () => exchangeRatesApi.getAll(filters, organizationId!),
    enabled: !!organizationId,
  });
};

export const useExchangeRateLookup = (
  organizationId: string | null,
  fromCurrency: string,
  toCurrency: string,
  date: string,
) => {
  return useQuery({
    queryKey: ['exchange-rate-lookup', organizationId, fromCurrency, toCurrency, date],
    queryFn: () =>
      exchangeRatesApi.getRate(fromCurrency, toCurrency, date, organizationId!),
    enabled:
      !!organizationId && !!fromCurrency && !!toCurrency && !!date,
  });
};

export const useCreateExchangeRate = (organizationId: string | null) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateExchangeRateInput) =>
      exchangeRatesApi.create(data, organizationId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchange-rates', organizationId] });
    },
  });
};

export const useUpdateExchangeRate = (organizationId: string | null) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateExchangeRateInput }) =>
      exchangeRatesApi.update(id, data, organizationId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchange-rates', organizationId] });
    },
  });
};

export const useDeleteExchangeRate = (organizationId: string | null) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => exchangeRatesApi.delete(id, organizationId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchange-rates', organizationId] });
    },
  });
};
