import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountingApi } from '@/lib/accounting-api';
import { useAuth } from '@/components/MultiTenantAuthProvider';
import type {
  CreateAccountInput,
  UpdateAccountInput,
} from '@/schemas/accounting';

export const useAccounts = () => {
  const { currentOrganization, user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['accounts', currentOrganization?.id],
    queryFn: () => accountingApi.getAccounts(currentOrganization!.id),
    enabled: !!currentOrganization,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const createAccount = useMutation({
    mutationFn: (account: CreateAccountInput) =>
      accountingApi.createAccount(account, currentOrganization!.id, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts', currentOrganization?.id] });
    },
  });

  const updateAccount = useMutation({
    mutationFn: (account: UpdateAccountInput) =>
      accountingApi.updateAccount(account),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts', currentOrganization?.id] });
    },
  });

  const deleteAccount = useMutation({
    mutationFn: (accountId: string) =>
      accountingApi.deleteAccount(accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts', currentOrganization?.id] });
    },
  });

  return {
    ...query,
    createAccount,
    updateAccount,
    deleteAccount,
  };
};

export const useAccount = (accountId: string) => {
  return useQuery({
    queryKey: ['account', accountId],
    queryFn: () => accountingApi.getAccount(accountId),
    enabled: !!accountId,
  });
};
