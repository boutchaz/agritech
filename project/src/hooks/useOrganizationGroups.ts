import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import {
  organizationGroupsApi,
  type CreateOrganizationGroupInput,
  type UpdateOrganizationGroupInput,
} from '../lib/api/organization-groups';
import { financialReportsApi } from '../lib/api/financial-reports';

export const orgGroupsKeys = {
  all: (orgId: string | null) => ['organization-groups', orgId] as const,
  one: (orgId: string | null, id: string) => ['organization-groups', orgId, id] as const,
  members: (orgId: string | null, id: string) =>
    ['organization-groups', orgId, id, 'members'] as const,
  consolidatedPL: (
    orgId: string | null,
    groupId: string,
    start: string,
    end: string,
    basis: string,
    includeZero: boolean,
    includeElim: boolean,
  ) =>
    [
      'consolidated-profit-loss',
      orgId,
      groupId,
      start,
      end,
      basis,
      includeZero,
      includeElim,
    ] as const,
};

export function useOrganizationGroups() {
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id || null;
  return useQuery({
    queryKey: orgGroupsKeys.all(orgId),
    queryFn: () => organizationGroupsApi.getAll(orgId!),
    enabled: !!orgId,
  });
}

export function useOrganizationGroup(groupId: string | null) {
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id || null;
  return useQuery({
    queryKey: orgGroupsKeys.one(orgId, groupId || ''),
    queryFn: () => organizationGroupsApi.getOne(groupId!, orgId!),
    enabled: !!orgId && !!groupId,
  });
}

export function useGroupMembers(groupId: string | null) {
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id || null;
  return useQuery({
    queryKey: orgGroupsKeys.members(orgId, groupId || ''),
    queryFn: () => organizationGroupsApi.listMembers(groupId!, orgId!),
    enabled: !!orgId && !!groupId,
  });
}

export function useCreateOrganizationGroup() {
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id || null;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateOrganizationGroupInput) =>
      organizationGroupsApi.create(data, orgId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orgGroupsKeys.all(orgId) });
    },
  });
}

export function useUpdateOrganizationGroup() {
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id || null;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateOrganizationGroupInput }) =>
      organizationGroupsApi.update(id, data, orgId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orgGroupsKeys.all(orgId) });
    },
  });
}

export function useDeleteOrganizationGroup() {
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id || null;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => organizationGroupsApi.delete(id, orgId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orgGroupsKeys.all(orgId) });
    },
  });
}

export function useAddGroupMember() {
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id || null;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      groupId,
      memberOrganizationId,
    }: {
      groupId: string;
      memberOrganizationId: string;
    }) => organizationGroupsApi.addMember(groupId, memberOrganizationId, orgId!),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: orgGroupsKeys.members(orgId, variables.groupId),
      });
    },
  });
}

export function useRemoveGroupMember() {
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id || null;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      groupId,
      memberOrganizationId,
    }: {
      groupId: string;
      memberOrganizationId: string;
    }) => organizationGroupsApi.removeMember(groupId, memberOrganizationId, orgId!),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: orgGroupsKeys.members(orgId, variables.groupId),
      });
    },
  });
}

export function useConsolidatedProfitLoss(
  groupId: string | null,
  start: string,
  end: string,
  options?: {
    basis?: 'accrual' | 'cash';
    include_zero_balances?: boolean;
    include_eliminations?: boolean;
  },
) {
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id || null;
  const basis = options?.basis ?? 'accrual';
  const includeZero = options?.include_zero_balances ?? false;
  const includeElim = options?.include_eliminations ?? true;
  return useQuery({
    queryKey: orgGroupsKeys.consolidatedPL(
      orgId,
      groupId || '',
      start,
      end,
      basis,
      includeZero,
      includeElim,
    ),
    queryFn: () =>
      financialReportsApi.getConsolidatedProfitLoss(
        {
          groupId: groupId!,
          start,
          end,
          basis,
          include_zero_balances: includeZero,
          include_eliminations: includeElim,
        },
        orgId!,
      ),
    enabled: !!orgId && !!groupId && !!start && !!end,
  });
}
