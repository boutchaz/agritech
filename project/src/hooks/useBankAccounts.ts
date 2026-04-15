import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { bankAccountsApi, type BankAccount } from '@/lib/api/bank-accounts';
import type { CreateBankAccountInput } from '@/lib/api/bank-accounts';

export type { BankAccount } from '@/lib/api/bank-accounts';

export function useBankAccounts(filters?: { is_active?: boolean; search?: string }) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['bank-accounts', currentOrganization?.id, filters],
    queryFn: () => bankAccountsApi.getAll(filters, currentOrganization?.id),
    enabled: !!currentOrganization?.id,
    staleTime: 60000,
  });
}

export function useBankAccount(id: string | null) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['bank-account', id],
    queryFn: () => bankAccountsApi.getOne(id!, currentOrganization?.id),
    enabled: !!id && !!currentOrganization?.id,
    staleTime: 60000,
  });
}

export function useCreateBankAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBankAccountInput) => {
      return bankAccountsApi.create(data, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
    },
  });
}

export function useUpdateBankAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateBankAccountInput> }) => {
      return bankAccountsApi.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
    },
  });
}

export function useDeleteBankAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => bankAccountsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
    },
  });
}
