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

export interface JournalEntryWithLines extends JournalEntry {
  lines?: JournalEntryLine[];
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
      return data as JournalEntry[];
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
      return data as JournalEntry[];
    },
    enabled: !!currentOrganization?.id,
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
