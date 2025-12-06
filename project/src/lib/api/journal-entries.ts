import { apiClient } from '../api-client';
import type { Database } from '@/types/database.types';

type Tables = Database['public']['Tables'];
type JournalEntry = Tables['journal_entries']['Row'];
type JournalItem = Tables['journal_items']['Row'];

export interface JournalItemWithAccount extends JournalItem {
  accounts: { code: string; name: string } | null;
}

export interface JournalEntryWithItems extends JournalEntry {
  journal_items: JournalItemWithAccount[];
}

export interface JournalEntryFilters {
  status?: 'draft' | 'posted' | 'cancelled';
  entry_type?: 'expense' | 'revenue' | 'transfer' | 'adjustment';
  date_from?: string;
  date_to?: string;
  account_id?: string;
  cost_center_id?: string;
  farm_id?: string;
  parcel_id?: string;
}

export interface CreateJournalEntryInput {
  entry_date: string;
  entry_type?: 'expense' | 'revenue' | 'transfer' | 'adjustment';
  description?: string;
  remarks?: string;
  reference_type?: string;
  reference_number?: string;
  items: {
    account_id: string;
    debit: number;
    credit: number;
    description?: string;
    cost_center_id?: string;
    farm_id?: string;
    parcel_id?: string;
  }[];
}

export interface UpdateJournalEntryInput {
  entry_date?: string;
  entry_type?: 'expense' | 'revenue' | 'transfer' | 'adjustment';
  description?: string;
  remarks?: string;
  items?: {
    account_id: string;
    debit: number;
    credit: number;
    description?: string;
    cost_center_id?: string;
    farm_id?: string;
    parcel_id?: string;
  }[];
}

export const journalEntriesApi = {
  async getAll(filters?: JournalEntryFilters): Promise<JournalEntryWithItems[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.entry_type) params.append('entry_type', filters.entry_type);
    if (filters?.date_from) params.append('date_from', filters.date_from);
    if (filters?.date_to) params.append('date_to', filters.date_to);
    if (filters?.account_id) params.append('account_id', filters.account_id);
    if (filters?.cost_center_id) params.append('cost_center_id', filters.cost_center_id);
    if (filters?.farm_id) params.append('farm_id', filters.farm_id);
    if (filters?.parcel_id) params.append('parcel_id', filters.parcel_id);
    const queryString = params.toString();
    return apiClient.get<JournalEntryWithItems[]>(`/journal-entries${queryString ? `?${queryString}` : ''}`);
  },

  async getOne(id: string): Promise<JournalEntryWithItems> {
    return apiClient.get<JournalEntryWithItems>(`/journal-entries/${id}`);
  },

  async create(data: CreateJournalEntryInput): Promise<JournalEntryWithItems> {
    return apiClient.post<JournalEntryWithItems>('/journal-entries', data);
  },

  async update(id: string, data: UpdateJournalEntryInput): Promise<JournalEntryWithItems> {
    return apiClient.patch<JournalEntryWithItems>(`/journal-entries/${id}`, data);
  },

  async post(id: string): Promise<JournalEntryWithItems> {
    return apiClient.post<JournalEntryWithItems>(`/journal-entries/${id}/post`, {});
  },

  async cancel(id: string): Promise<JournalEntryWithItems> {
    return apiClient.patch<JournalEntryWithItems>(`/journal-entries/${id}/cancel`, {});
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/journal-entries/${id}`);
  },
};
