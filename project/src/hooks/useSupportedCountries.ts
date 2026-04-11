import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supportedCountriesApi, type CreateSupportedCountryInput, type UpdateSupportedCountryInput } from '../lib/api/supported-countries';

const QUERY_KEY = ['supported-countries'];
const ADMIN_QUERY_KEY = ['supported-countries', 'admin'];

/** Fetch enabled supported countries (public, no auth) */
export const useSupportedCountries = () => {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => supportedCountriesApi.getEnabled(),
    staleTime: 1000 * 60 * 30, // 30 min — rarely changes
  });
};

/** Fetch all supported countries including disabled (admin) */
export const useAdminSupportedCountries = () => {
  return useQuery({
    queryKey: ADMIN_QUERY_KEY,
    queryFn: () => supportedCountriesApi.getAll(),
  });
};

export const useCreateSupportedCountry = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSupportedCountryInput) => supportedCountriesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEY });
    },
  });
};

export const useUpdateSupportedCountry = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSupportedCountryInput }) =>
      supportedCountriesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEY });
    },
  });
};

export const useDeleteSupportedCountry = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => supportedCountriesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEY });
    },
  });
};

export const useToggleSupportedCountry = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      supportedCountriesApi.toggle(id, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEY });
    },
  });
};
