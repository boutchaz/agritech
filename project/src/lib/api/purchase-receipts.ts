import { apiClient } from '../api-client';

const BASE_URL = '/api/v1/purchase-receipts';

export interface PurchaseReceiptItem {
  id: string;
  purchase_receipt_id: string;
  purchase_order_item_id: string | null;
  line_number: number;
  item_id: string;
  item_name: string | null;
  quantity: number;
  rejected_quantity: number;
  accepted_quantity: number;
  unit_of_measure: string | null;
  unit_price: number;
  batch_number: string | null;
  warehouse_id: string | null;
  notes: string | null;
  tax_amount: number;
}

export interface PurchaseReceipt {
  id: string;
  organization_id: string;
  receipt_number: string;
  receipt_date: string;
  purchase_order_id: string;
  status: 'draft' | 'submitted' | 'cancelled';
  subtotal: number;
  tax_total: number;
  total_amount: number;
  stock_entry_id: string | null;
  supplier_id: string | null;
  supplier_name: string | null;
  notes: string | null;
  submitted_at: string | null;
  submitted_by: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  items?: PurchaseReceiptItem[];
  purchase_order?: {
    id: string;
    order_number: string;
    status: string;
  };
}

export interface CreatePurchaseReceiptItemInput {
  purchase_order_item_id?: string;
  item_id: string;
  quantity: number;
  rejected_quantity?: number;
  warehouse_id: string;
  batch_number?: string;
  notes?: string;
}

export interface CreatePurchaseReceiptInput {
  receipt_number?: string;
  receipt_date?: string;
  purchase_order_id: string;
  notes?: string;
  items: CreatePurchaseReceiptItemInput[];
}

export interface UpdatePurchaseReceiptInput {
  receipt_number?: string;
  receipt_date?: string;
  purchase_order_id?: string;
  notes?: string;
  items?: CreatePurchaseReceiptItemInput[];
}

export interface PurchaseReceiptFilters {
  status?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface PaginatedPurchaseReceiptQuery {
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

export const purchaseReceiptsApi = {
  async getPaginated(
    query: PaginatedPurchaseReceiptQuery,
    organizationId?: string,
  ): Promise<PaginatedResponse<PurchaseReceipt>> {
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
    return apiClient.get<PaginatedResponse<PurchaseReceipt>>(url, {}, organizationId);
  },

  async getOne(id: string, organizationId?: string): Promise<PurchaseReceipt> {
    return apiClient.get<PurchaseReceipt>(`${BASE_URL}/${id}`, {}, organizationId);
  },

  async create(data: CreatePurchaseReceiptInput, organizationId?: string): Promise<PurchaseReceipt> {
    return apiClient.post<PurchaseReceipt>(BASE_URL, data, {}, organizationId);
  },

  async update(id: string, data: UpdatePurchaseReceiptInput, organizationId?: string): Promise<PurchaseReceipt> {
    return apiClient.patch<PurchaseReceipt>(`${BASE_URL}/${id}`, data, {}, organizationId);
  },

  async delete(id: string, organizationId?: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`${BASE_URL}/${id}`, {}, organizationId);
  },

  async submit(id: string, organizationId?: string): Promise<PurchaseReceipt> {
    return apiClient.post<PurchaseReceipt>(`${BASE_URL}/${id}/submit`, {}, {}, organizationId);
  },

  async cancel(id: string, organizationId?: string): Promise<PurchaseReceipt> {
    return apiClient.patch<PurchaseReceipt>(`${BASE_URL}/${id}/cancel`, {}, {}, organizationId);
  },
};
