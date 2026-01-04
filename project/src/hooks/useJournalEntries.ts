import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { journalEntriesApi, type CreateJournalEntryInput, type UpdateJournalEntryInput, type JournalEntryFilters, type JournalEntryWithItems, type PaginatedJournalEntryQuery } from '../lib/api/journal-entries';
import { useAuth } from '../components/MultiTenantAuthProvider';
import type { PaginatedResponse } from '../lib/api/types';

export type { CreateJournalEntryInput, UpdateJournalEntryInput, JournalEntryFilters, JournalEntryWithItems, PaginatedJournalEntryQuery };

// Normalized types for UI use
export interface JournalEntry {
  id: string;
  organization_id: string;
  entry_number: string;
  entry_date: string;
  posted_at?: string | null;
  posted_by?: string | null;
  reference_type?: string | null;
  reference_number?: string | null;
  reference_id?: string | null;
  total_debit: number;
  total_credit: number;
  status: 'draft' | 'posted' | 'cancelled';
  remarks?: string | null;
  created_by?: string | null;
  created_at?: string | null;
}

export interface JournalEntryLine {
  id: string;
  journal_entry_id: string;
  account_id: string;
  debit: number;
  credit: number;
  description?: string | null;
  cost_center_id?: string | null;
  farm_id?: string | null;
  parcel_id?: string | null;
}

export interface JournalEntryLineWithAccount extends JournalEntryLine {
  account?: {
    id?: string;
    code: string;
    name: string;
  } | null;
}

export interface JournalEntryWithLines extends JournalEntry {
  lines?: JournalEntryLineWithAccount[];
}

/**
 * Normalize API response to our UI types
 */
function normalizeEntry(entry: JournalEntryWithItems): JournalEntry {
  return {
    id: entry.id,
    organization_id: entry.organization_id,
    entry_number: entry.entry_number || '',
    entry_date: entry.entry_date,
    posted_at: entry.posted_at,
    posted_by: entry.posted_by,
    reference_type: entry.reference_type,
    reference_number: entry.reference_number,
    reference_id: entry.reference_id,
    total_debit: Number(entry.total_debit) || 0,
    total_credit: Number(entry.total_credit) || 0,
    status: (entry.status || 'draft') as 'draft' | 'posted' | 'cancelled',
    remarks: entry.remarks,
    created_by: entry.created_by,
    created_at: entry.created_at,
  };
}

function normalizeEntryWithLines(entry: JournalEntryWithItems): JournalEntryWithLines {
  const normalized = normalizeEntry(entry);
  const lines: JournalEntryLineWithAccount[] = (entry.journal_items || []).map((item) => ({
    id: item.id,
    journal_entry_id: entry.id,
    account_id: item.account_id,
    debit: Number(item.debit) || 0,
    credit: Number(item.credit) || 0,
    description: item.description,
    cost_center_id: item.cost_center_id,
    farm_id: item.farm_id,
    parcel_id: item.parcel_id,
    account: item.accounts ? {
      code: item.accounts.code,
      name: item.accounts.name,
    } : null,
  }));

  return {
    ...normalized,
    lines,
  };
}

/**
 * Hook to fetch all journal entries for the current organization
 */
export function useJournalEntries(filters?: JournalEntryFilters) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['journal_entries', currentOrganization?.id, filters],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      const data = await journalEntriesApi.getAll(filters);
      return (data || []).map(normalizeEntry);
    },
    enabled: !!currentOrganization?.id,
  });
}

export function usePaginatedJournalEntries(query: PaginatedJournalEntryQuery) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['journal_entries', 'paginated', currentOrganization?.id, query],
    queryFn: async (): Promise<PaginatedResponse<JournalEntry>> => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      const response = await journalEntriesApi.getPaginated(query);
      return {
        ...response,
        data: (response.data || []).map(normalizeEntry),
      };
    },
    enabled: !!currentOrganization?.id,
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to fetch journal entries by status
 */
export function useJournalEntriesByStatus(status: 'draft' | 'posted' | 'cancelled') {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['journal_entries', currentOrganization?.id, status],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      const data = await journalEntriesApi.getAll({ status });
      return (data || []).map(normalizeEntry);
    },
    enabled: !!currentOrganization?.id,
  });
}

/**
 * Hook to fetch a single journal entry with its lines and account details
 */
export function useJournalEntry(entryId: string | null) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['journal_entry', currentOrganization?.id, entryId],
    queryFn: async () => {
      if (!entryId || !currentOrganization?.id) {
        throw new Error('Journal entry not specified');
      }

      const data = await journalEntriesApi.getOne(entryId);

      if (!data) {
        throw new Error('Journal entry not found');
      }

      return normalizeEntryWithLines(data);
    },
    enabled: !!entryId && !!currentOrganization?.id,
  });
}

/**
 * Hook to calculate journal entry statistics
 */
export function useJournalStats() {
  const { data: entries } = useJournalEntries();

  const stats = {
    total: entries?.length || 0,
    draft: entries?.filter(e => e.status === 'draft').length || 0,
    posted: entries?.filter(e => e.status === 'posted').length || 0,
    cancelled: entries?.filter(e => e.status === 'cancelled').length || 0,
    totalDebit: entries?.reduce((sum, e) => sum + Number(e.total_debit), 0) || 0,
    totalCredit: entries?.reduce((sum, e) => sum + Number(e.total_credit), 0) || 0,
  };

  return stats;
}

/**
 * Hook to create a new journal entry
 */
export function useCreateJournalEntry() {
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateJournalEntryInput) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return journalEntriesApi.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal_entries', currentOrganization?.id] });
    },
  });
}

/**
 * Hook to update a draft journal entry
 */
export function useUpdateJournalEntry() {
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateJournalEntryInput }) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return journalEntriesApi.update(id, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['journal_entries', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['journal_entry', currentOrganization?.id, variables.id] });
    },
  });
}

/**
 * Hook to post a draft journal entry
 */
export function usePostJournalEntry() {
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return journalEntriesApi.post(id);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['journal_entries', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['journal_entry', currentOrganization?.id, id] });
    },
  });
}

/**
 * Hook to cancel a journal entry
 */
export function useCancelJournalEntry() {
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return journalEntriesApi.cancel(id);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['journal_entries', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['journal_entry', currentOrganization?.id, id] });
    },
  });
}

/**
 * Hook to delete a draft journal entry
 */
export function useDeleteJournalEntry() {
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return journalEntriesApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal_entries', currentOrganization?.id] });
    },
  });
}
