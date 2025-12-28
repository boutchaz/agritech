import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/components/MultiTenantAuthProvider';
import { openingStockApi } from '@/lib/api/opening-stock';
import type {
  OpeningStockBalance,
  CreateOpeningStockInput,
  UpdateOpeningStockInput,
  OpeningStockFilters,
  StockAccountMapping,
  CreateStockAccountMappingInput,
  UpdateStockAccountMappingInput,
} from '@/types/opening-stock';

export function useOpeningStockBalances(filters?: OpeningStockFilters) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['opening-stock-balances', currentOrganization?.id, filters],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      return openingStockApi.getOpeningBalances(filters || {}, currentOrganization.id);
    },
    enabled: !!currentOrganization?.id,
    staleTime: 30000,
  });
}

export function useOpeningStockBalance(balanceId: string | null) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['opening-stock-balance', balanceId],
    queryFn: async () => {
      if (!balanceId) throw new Error('No balance ID provided');
      if (!currentOrganization?.id) throw new Error('No organization selected');

      return openingStockApi.getOpeningBalance(balanceId, currentOrganization.id);
    },
    enabled: !!balanceId && !!currentOrganization?.id,
    staleTime: 30000,
  });
}

export function useCreateOpeningStock() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateOpeningStockInput) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      return openingStockApi.createOpeningBalance(input, currentOrganization.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opening-stock-balances'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });
}

export function useUpdateOpeningStock() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateOpeningStockInput }) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      return openingStockApi.updateOpeningBalance(id, data, currentOrganization.id);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['opening-stock-balances'] });
      queryClient.invalidateQueries({ queryKey: ['opening-stock-balance', variables.id] });
    },
  });
}

export function usePostOpeningStock() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (balanceId: string) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      return openingStockApi.postOpeningBalance(balanceId, currentOrganization.id);
    },
    onSuccess: (_, balanceId) => {
      queryClient.invalidateQueries({ queryKey: ['opening-stock-balances'] });
      queryClient.invalidateQueries({ queryKey: ['opening-stock-balance', balanceId] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['journal_entries'] });
    },
  });
}

export function useCancelOpeningStock() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (balanceId: string) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      return openingStockApi.cancelOpeningBalance(balanceId, currentOrganization.id);
    },
    onSuccess: (_, balanceId) => {
      queryClient.invalidateQueries({ queryKey: ['opening-stock-balances'] });
      queryClient.invalidateQueries({ queryKey: ['opening-stock-balance', balanceId] });
    },
  });
}

export function useDeleteOpeningStock() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (balanceId: string) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      return openingStockApi.deleteOpeningBalance(balanceId, currentOrganization.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opening-stock-balances'] });
    },
  });
}

export function useStockAccountMappings() {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['stock-account-mappings', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      return openingStockApi.getAccountMappings(currentOrganization.id);
    },
    enabled: !!currentOrganization?.id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateStockAccountMapping() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateStockAccountMappingInput) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      return openingStockApi.createAccountMapping(input, currentOrganization.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-account-mappings'] });
    },
  });
}

export function useUpdateStockAccountMapping() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateStockAccountMappingInput;
    }) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      return openingStockApi.updateAccountMapping(id, data, currentOrganization.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-account-mappings'] });
    },
  });
}

export function useDeleteStockAccountMapping() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (mappingId: string) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      return openingStockApi.deleteAccountMapping(mappingId, currentOrganization.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-account-mappings'] });
    },
  });
}
