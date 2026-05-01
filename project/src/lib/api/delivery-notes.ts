import { apiClient } from '../api-client';

const BASE_URL = '/api/v1/delivery-notes';

export interface DeliveryNoteItem {
  id: string;
  delivery_note_id: string;
  sales_order_item_id: string | null;
  line_number: number;
  item_id: string;
  item_name: string | null;
  quantity: number;
  batch_number: string | null;
  warehouse_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface DeliveryNote {
  id: string;
  organization_id: string;
  delivery_note_number: string;
  delivery_date: string;
  sales_order_id: string;
  customer_id: string | null;
  customer_name: string | null;
  customer_address: string | null;
  warehouse_id: string | null;
  status: 'draft' | 'submitted' | 'cancelled';
  subtotal: number;
  total_qty: number;
  stock_entry_id: string | null;
  notes: string | null;
  submitted_at: string | null;
  submitted_by: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  items?: DeliveryNoteItem[];
  sales_order?: {
    id: string;
    order_number: string;
    status: string;
  };
}

export interface CreateDeliveryNoteItemInput {
  sales_order_item_id?: string;
  item_id: string;
  quantity: number;
  batch_number?: string;
  warehouse_id?: string;
  notes?: string;
}

export interface CreateDeliveryNoteInput {
  delivery_note_number?: string;
  delivery_date?: string;
  sales_order_id: string;
  customer_id?: string;
  warehouse_id?: string;
  customer_name?: string;
  customer_address?: string;
  notes?: string;
  items: CreateDeliveryNoteItemInput[];
}

export interface UpdateDeliveryNoteInput {
  delivery_note_number?: string;
  delivery_date?: string;
  sales_order_id?: string;
  customer_id?: string;
  warehouse_id?: string;
  customer_name?: string;
  customer_address?: string;
  notes?: string;
  items?: CreateDeliveryNoteItemInput[];
}

export interface PaginatedDeliveryNoteQuery {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const deliveryNotesApi = {
  async getPaginated(
    query: PaginatedDeliveryNoteQuery,
    organizationId?: string,
  ): Promise<PaginatedResponse<DeliveryNote>> {
    const params = new URLSearchParams();
    if (query.page) params.append('page', String(query.page));
    if (query.pageSize) params.append('pageSize', String(query.pageSize));
    if (query.sortBy) params.append('sortBy', query.sortBy);
    if (query.sortDir) params.append('sortDir', query.sortDir);
    if (query.search) params.append('search', query.search);
    if (query.status) params.append('status', query.status);
    if (query.dateFrom) params.append('dateFrom', query.dateFrom);
    if (query.dateTo) params.append('dateTo', query.dateTo);

    const queryString = params.toString();
    const url = queryString ? `${BASE_URL}?${queryString}` : BASE_URL;
    return apiClient.get<PaginatedResponse<DeliveryNote>>(url, {}, organizationId);
  },

  async getOne(id: string, organizationId?: string): Promise<DeliveryNote> {
    return apiClient.get<DeliveryNote>(`${BASE_URL}/${id}`, {}, organizationId);
  },

  async create(data: CreateDeliveryNoteInput, organizationId?: string): Promise<DeliveryNote> {
    return apiClient.post<DeliveryNote>(BASE_URL, data, {}, organizationId);
  },

  async update(id: string, data: UpdateDeliveryNoteInput, organizationId?: string): Promise<DeliveryNote> {
    return apiClient.patch<DeliveryNote>(`${BASE_URL}/${id}`, data, {}, organizationId);
  },

  async delete(id: string, organizationId?: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`${BASE_URL}/${id}`, {}, organizationId);
  },

  async submit(id: string, organizationId?: string): Promise<DeliveryNote> {
    return apiClient.post<DeliveryNote>(`${BASE_URL}/${id}/submit`, {}, {}, organizationId);
  },

  async cancel(id: string, organizationId?: string): Promise<DeliveryNote> {
    return apiClient.patch<DeliveryNote>(`${BASE_URL}/${id}/cancel`, {}, {}, organizationId);
  },
};
