import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import {
  accountMappingsApi,
  type AccountMapping,
  type AccountMappingFilters,
  type CreateAccountMappingInput,
  type UpdateAccountMappingInput,
  type AccountMappingOptions,
} from '../lib/api/account-mappings';

/**
 * Hook to fetch all account mappings
 */
export function useAccountMappings(filters?: AccountMappingFilters) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['account-mappings', currentOrganization?.id, filters],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return accountMappingsApi.getAll(filters, currentOrganization.id);
    },
    enabled: !!currentOrganization?.id,
  });
}

/**
 * Hook to fetch a single account mapping
 */
export function useAccountMapping(mappingId: string | null) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['account-mapping', mappingId],
    queryFn: async () => {
      if (!mappingId) throw new Error('Mapping ID is required');
      return accountMappingsApi.getOne(mappingId, currentOrganization?.id);
    },
    enabled: !!mappingId && !!currentOrganization?.id,
  });
}

/**
 * Hook to fetch available mapping types
 */
export function useAccountMappingTypes() {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['account-mapping-types', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return accountMappingsApi.getMappingTypes(currentOrganization.id);
    },
    enabled: !!currentOrganization?.id,
  });
}

/**
 * Hook to fetch mapping types and keys
 */
export function useAccountMappingOptions() {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['account-mapping-options', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return accountMappingsApi.getMappingOptions(currentOrganization.id);
    },
    enabled: !!currentOrganization?.id,
  });
}

/**
 * Hook to create a new account mapping
 */
export function useCreateAccountMapping() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateAccountMappingInput) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return accountMappingsApi.create(data, currentOrganization.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account-mappings', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['account-mapping-types', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['account-mapping-options', currentOrganization?.id] });
    },
  });
}

/**
 * Hook to update an account mapping
 */
export function useUpdateAccountMapping() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateAccountMappingInput }) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return accountMappingsApi.update(id, data, currentOrganization.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account-mappings', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['account-mapping-options', currentOrganization?.id] });
    },
  });
}

/**
 * Hook to delete an account mapping
 */
export function useDeleteAccountMapping() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return accountMappingsApi.delete(id, currentOrganization.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account-mappings', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['account-mapping-types', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['account-mapping-options', currentOrganization?.id] });
    },
  });
}

/**
 * Hook to initialize default mappings
 */
export function useInitializeAccountMappings() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (countryCode: string) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return accountMappingsApi.initializeDefaults(countryCode, currentOrganization.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account-mappings', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['account-mapping-types', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['account-mapping-options', currentOrganization?.id] });
      // Backend may persist organization country_code / accounting_standard when missing
      queryClient.invalidateQueries({ queryKey: ['auth', 'organizations'] });
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
  });
}

// Re-export types for convenience
export type { AccountMapping, AccountMappingFilters, CreateAccountMappingInput, UpdateAccountMappingInput, AccountMappingOptions };
