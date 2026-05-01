import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { bankAccountsApi } from '@/lib/api/bank-accounts';
import type { CreateBankAccountInput } from '@/lib/api/bank-accounts';

export type { BankAccount } from '@/lib/api/bank-accounts';

export function useBankAccounts(filters?: { is_active?: boolean; search?: string }) {
  const { currentOrganization } = useAuth();
  const organizationId = currentOrganization?.id;

  return useQuery({
    queryKey: ['bank-accounts', organizationId, filters],
    queryFn: () => {
      if (!organizationId) throw new Error('No organization selected');
      return bankAccountsApi.getAll(filters, organizationId);
    },
    enabled: !!organizationId,
    staleTime: 60000,
  });
}

export function useBankAccount(id: string | null) {
  const { currentOrganization } = useAuth();
  const organizationId = currentOrganization?.id;

  return useQuery({
    queryKey: ['bank-account', organizationId, id],
    queryFn: () => {
      if (!organizationId || !id) throw new Error('Missing organizationId or id');
      return bankAccountsApi.getOne(id, organizationId);
    },
    enabled: !!id && !!organizationId,
    staleTime: 60000,
  });
}

export function useCreateBankAccount() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: (data: CreateBankAccountInput) => {
      const orgId = currentOrganization?.id;
      if (!orgId) throw new Error('No organization selected');
      return bankAccountsApi.create(data, orgId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
    },
  });
}

export function useUpdateBankAccount() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateBankAccountInput> }) => {
      const orgId = currentOrganization?.id;
      if (!orgId) throw new Error('No organization selected');
      return bankAccountsApi.update(id, data, orgId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
    },
  });
}

export function useDeleteBankAccount() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: (id: string) => {
      const orgId = currentOrganization?.id;
      if (!orgId) throw new Error('No organization selected');
      return bankAccountsApi.delete(id, orgId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
    },
  });
}
