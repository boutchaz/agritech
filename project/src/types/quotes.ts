import type { InvoiceItemInput } from '../lib/taxCalculations';

export type { PaginatedResponse } from '../lib/api/types';

export type QuoteStatus =
  | 'draft'
  | 'sent'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'converted'
  | 'cancelled';

export interface Quote {
  id: string;
  organization_id: string;
  customer_id: string;
  quote_number: string;
  quote_date: string;
  valid_until: string;
  status: QuoteStatus;
  subtotal: number;
  tax_total: number;
  grand_total: number;
  payment_terms?: string;
  delivery_terms?: string;
  terms_and_conditions?: string;
  notes?: string;
  reference_number?: string;
  created_at: string;
  updated_at: string;
  items?: QuoteItemInput[];
}

export interface QuoteFilters {
  status?: QuoteStatus;
  customer_id?: string;
  customer_name?: string;
  quote_number?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedQuoteQuery {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  search?: string;
  status?: QuoteStatus;
  dateFrom?: string;
  dateTo?: string;
}

export interface UpdateQuoteStatusInput {
  status: QuoteStatus;
  remarks?: string;
}

export interface QuoteItemInput {
  line_number?: number;
  item_id?: string;
  item_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  account_id: string;
  tax_id?: string | null;
}

export interface CreateQuoteInput {
  customer_id: string;
  quote_date: string;
  valid_until: string;
  items: QuoteItemInput[];
  payment_terms?: string;
  delivery_terms?: string;
  terms_and_conditions?: string;
  notes?: string;
  reference_number?: string;
}

export type UpdateQuoteInput = Partial<CreateQuoteInput>;

export type CreateQuoteFormInput = Omit<CreateQuoteInput, 'items'> & {
  items: QuoteFormItemInput[];
};

export type UpdateQuoteFormInput = Omit<UpdateQuoteInput, 'items'> & {
  items?: QuoteFormItemInput[];
};

export interface QuoteFormItemInput extends InvoiceItemInput {
  item_id?: string;
  unit_price?: number;
}

export interface QuoteResponse {
  id: string;
  organization_id: string;
  quote_number: string;
  quote_date: string;
  valid_until: string;
  customer_id: string | null;
  customer_name: string;
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  subtotal: number;
  tax_total: number;
  discount_amount: number;
  grand_total: number;
  currency_code: string;
  exchange_rate: number;
  status: QuoteStatus;
  payment_terms: string | null;
  delivery_terms: string | null;
  terms_and_conditions: string | null;
  notes: string | null;
  reference_number: string | null;
  sales_order_id: string | null;
  farm_id: string | null;
  parcel_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  sent_at: string | null;
  sent_by: string | null;
  accepted_at: string | null;
  converted_at: string | null;
  converted_by: string | null;
}

export interface QuoteItemResponse {
  id: string;
  quote_id: string;
  line_number: number;
  item_name: string;
  description: string | null;
  quantity: number;
  unit_of_measure: string;
  unit_price: number;
  amount: number;
  discount_percent: number;
  discount_amount: number;
  tax_id: string | null;
  tax_rate: number;
  tax_amount: number;
  line_total: number;
  account_id: string | null;
}

export interface QuoteWithItems extends QuoteResponse {
  items?: QuoteItemResponse[];
}
