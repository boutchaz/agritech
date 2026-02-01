import { apiClient } from '../api-client';
import type { Database } from '@/types/database.types';
import type { PaginatedQuery, PaginatedResponse } from './types';

const BASE_URL = '/api/v1/journal-entries';

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

export interface PaginatedJournalEntryQuery extends PaginatedQuery {
  status?: 'draft' | 'posted' | 'cancelled';
  entry_type?: 'expense' | 'revenue' | 'transfer' | 'adjustment';
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
    return apiClient.get<JournalEntryWithItems[]>(`${BASE_URL}${queryString ? `?${queryString}` : ''}`);
  },

  async getPaginated(query: PaginatedJournalEntryQuery): Promise<PaginatedResponse<JournalEntryWithItems>> {
    const params = new URLSearchParams();
    if (query.page) params.append('page', String(query.page));
    if (query.pageSize) params.append('pageSize', String(query.pageSize));
    if (query.sortBy) params.append('sortBy', query.sortBy);
    if (query.sortDir) params.append('sortDir', query.sortDir);
    if (query.search) params.append('search', query.search);
    if (query.dateFrom) params.append('dateFrom', query.dateFrom);
    if (query.dateTo) params.append('dateTo', query.dateTo);
    if (query.status) params.append('status', query.status);
    if (query.entry_type) params.append('entry_type', query.entry_type);
    const queryString = params.toString();
    return apiClient.get<PaginatedResponse<JournalEntryWithItems>>(`${BASE_URL}${queryString ? `?${queryString}` : ''}`);
  },

  async getOne(id: string, organizationId?: string): Promise<JournalEntryWithItems> {
    return apiClient.get<JournalEntryWithItems>(`${BASE_URL}/${id}`, {}, organizationId);
  },

  async create(data: CreateJournalEntryInput, organizationId?: string): Promise<JournalEntryWithItems> {
    return apiClient.post<JournalEntryWithItems>(BASE_URL, data, {}, organizationId);
  },

  async update(id: string, data: UpdateJournalEntryInput, organizationId?: string): Promise<JournalEntryWithItems> {
    return apiClient.patch<JournalEntryWithItems>(`${BASE_URL}/${id}`, data, {}, organizationId);
  },

  async post(id: string, organizationId?: string): Promise<JournalEntryWithItems> {
    return apiClient.post<JournalEntryWithItems>(`${BASE_URL}/${id}/post`, {}, {}, organizationId);
  },

  async cancel(id: string, organizationId?: string): Promise<JournalEntryWithItems> {
    return apiClient.patch<JournalEntryWithItems>(`${BASE_URL}/${id}/cancel`, {}, {}, organizationId);
  },

  async delete(id: string, organizationId?: string): Promise<void> {
    await apiClient.delete(`${BASE_URL}/${id}`, {}, organizationId);
  },
};
