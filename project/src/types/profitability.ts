export interface ParcelJournalEntryAccount {
  code: string;
  name: string;
  account_type: string;
}

export interface ParcelJournalEntryItem {
  id: string;
  journal_entry_id: string;
  account_id: string;
  debit: number;
  credit: number;
  description?: string | null;
  cost_center_id?: string | null;
  farm_id?: string | null;
  parcel_id?: string | null;
  accounts: ParcelJournalEntryAccount | null;
}

export interface ParcelJournalEntry {
  id: string;
  organization_id: string;
  entry_number: string;
  entry_date: string;
  entry_type?: string | null;
  description?: string | null;
  remarks?: string | null;
  status: string;
  total_debit: number;
  total_credit: number;
  reference_type?: string | null;
  reference_number?: string | null;
  reference_id?: string | null;
  posted_at?: string | null;
  posted_by?: string | null;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  journal_items: ParcelJournalEntryItem[];
}
