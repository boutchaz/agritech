import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/MultiTenantAuthProvider';

export interface JournalEntry {
  id: string;
  organization_id: string;
  entry_number: string;
  entry_date: string;
  posting_date: string | null;
  reference_type: string | null;
  reference_number: string | null;
  total_debit: number;
  total_credit: number;
  status: 'draft' | 'posted' | 'cancelled';
  remarks: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface JournalEntryLine {
  id: string;
  journal_entry_id: string;
  account_id: string;
  debit: number;
  credit: number;
  description: string | null;
  cost_center_id: string | null;
}

export interface JournalEntryLineWithAccount extends JournalEntryLine {
  account?: {
    id: string;
    code: string;
    name: string;
  } | null;
}

export interface JournalEntryWithLines extends JournalEntry {
  lines?: JournalEntryLineWithAccount[];
}

/**
 * Hook to fetch all journal entries for the current organization
 */
export function useJournalEntries() {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['journal_entries', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('entry_date', { ascending: false });

      if (error) throw error;
      return (data || []) as JournalEntry[];
    },
    enabled: !!currentOrganization?.id,
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

      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .eq('status', status)
        .order('entry_date', { ascending: false });

      if (error) throw error;
      return (data || []) as JournalEntry[];
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

      const { data, error } = await supabase
        .from('journal_entries')
        .select(`
          *,
          journal_items(
            id,
            account_id,
            debit,
            credit,
            description,
            cost_center_id,
            accounts(
              id,
              code,
              name
            )
          )
        `)
        .eq('id', entryId)
        .eq('organization_id', currentOrganization.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        throw new Error('Journal entry not found');
      }

      const { journal_items: rawLines = [], ...entryData } = data as {
        journal_items: Array<{
          id: string;
          account_id: string;
          debit: number | string;
          credit: number | string;
          description: string | null;
          cost_center_id: string | null;
          accounts: { id: string; code: string; name: string } | null;
        }>;
      } & JournalEntry;

      const lines: JournalEntryLineWithAccount[] = rawLines.map((line) => ({
        id: line.id,
        journal_entry_id: entryId,
        account_id: line.account_id,
        debit: Number(line.debit) || 0,
        credit: Number(line.credit) || 0,
        description: line.description ?? null,
        cost_center_id: line.cost_center_id ?? null,
        account: line.accounts
          ? {
              id: line.accounts.id,
              code: line.accounts.code,
              name: line.accounts.name,
            }
          : null,
      }));

      return {
        ...(entryData as JournalEntry),
        total_debit: Number(entryData.total_debit),
        total_credit: Number(entryData.total_credit),
        lines,
      } as JournalEntryWithLines;
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
