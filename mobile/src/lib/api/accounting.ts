// Accounting API Client for Mobile App
import { api } from '../api';
import type {
  Invoice,
  SalesOrder,
  Customer,
  PaymentRecord,
  InvoiceFilters,
  SalesOrderFilters,
  PaymentFilters,
  CreateInvoiceInput,
  CreateSalesOrderInput,
  CreatePaymentInput,
  PaginatedResponse,
} from '@/types/accounting';

export const accountingApi = {
  // Customers
  async getCustomers(): Promise<PaginatedResponse<Customer>> {
    const res = await api.get<PaginatedResponse<Customer>>('/customers');
    return res || { data: [], total: 0 };
  },

  async getCustomer(customerId: string): Promise<Customer> {
    return api.get<Customer>(`/customers/${customerId}`);
  },

  // Invoices
  async getInvoices(filters?: InvoiceFilters): Promise<PaginatedResponse<Invoice>> {
    const params = new URLSearchParams();
    if (filters?.customer_id) params.append('customer_id', filters.customer_id);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.date_from) params.append('date_from', filters.date_from);
    if (filters?.date_to) params.append('date_to', filters.date_to);
    if (filters?.overdue) params.append('overdue', 'true');
    const query = params.toString();
    const res = await api.get<PaginatedResponse<Invoice>>(`/invoices${query ? `?${query}` : ''}`);
    return res || { data: [], total: 0 };
  },

  async getInvoice(invoiceId: string): Promise<Invoice> {
    return api.get<Invoice>(`/invoices/${invoiceId}`);
  },

  async createInvoice(data: CreateInvoiceInput): Promise<Invoice> {
    return api.post<Invoice>('/invoices', data);
  },

  async updateInvoiceStatus(invoiceId: string, status: string): Promise<Invoice> {
    return api.patch<Invoice>(`/invoices/${invoiceId}`, { status });
  },

  // Sales Orders
  async getSalesOrders(filters?: SalesOrderFilters): Promise<PaginatedResponse<SalesOrder>> {
    const params = new URLSearchParams();
    if (filters?.customer_id) params.append('customer_id', filters.customer_id);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.date_from) params.append('date_from', filters.date_from);
    if (filters?.date_to) params.append('date_to', filters.date_to);
    const query = params.toString();
    const res = await api.get<PaginatedResponse<SalesOrder>>(`/sales-orders${query ? `?${query}` : ''}`);
    return res || { data: [], total: 0 };
  },

  async getSalesOrder(orderId: string): Promise<SalesOrder> {
    return api.get<SalesOrder>(`/sales-orders/${orderId}`);
  },

  async createSalesOrder(data: CreateSalesOrderInput): Promise<SalesOrder> {
    return api.post<SalesOrder>('/sales-orders', data);
  },

  async updateSalesOrderStatus(orderId: string, status: string): Promise<SalesOrder> {
    return api.patch<SalesOrder>(`/sales-orders/${orderId}`, { status });
  },

  // Payments
  async getPayments(filters?: PaymentFilters): Promise<PaginatedResponse<PaymentRecord>> {
    const params = new URLSearchParams();
    if (filters?.customer_id) params.append('customer_id', filters.customer_id);
    if (filters?.invoice_id) params.append('invoice_id', filters.invoice_id);
    if (filters?.date_from) params.append('date_from', filters.date_from);
    if (filters?.date_to) params.append('date_to', filters.date_to);
    const query = params.toString();
    const res = await api.get<PaginatedResponse<PaymentRecord>>(`/payments${query ? `?${query}` : ''}`);
    return res || { data: [], total: 0 };
  },

  async createPayment(data: CreatePaymentInput): Promise<PaymentRecord> {
    return api.post<PaymentRecord>('/payments', data);
  },

  // Dashboard
  async getDashboard(): Promise<{
    total_revenue: number;
    pending_invoices: number;
    overdue_amount: number;
    pending_orders: number;
  }> {
    return api.get('/dashboard');
  },
};
