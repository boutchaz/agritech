// Accounting Types for Mobile App

export type InvoiceStatus = 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled';
export type SalesOrderStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
export type PaymentMethod = 'cash' | 'bank_transfer' | 'check' | 'card' | 'credit';

// Invoice
export interface Invoice {
  id: string;
  organization_id: string;
  customer_id: string;
  invoice_number: string;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  currency: string;
  notes?: string;
  created_at: string;
  updated_at: string;

  customer?: Customer;
  items?: InvoiceLineItem[];
}

export interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

// Sales Order
export interface SalesOrder {
  id: string;
  organization_id: string;
  customer_id: string;
  order_number: string;
  status: SalesOrderStatus;
  order_date: string;
  delivery_date?: string;
  total_amount: number;
  currency: string;
  notes?: string;
  created_at: string;

  customer?: Customer;
  items?: SalesOrderLineItem[];
}

export interface SalesOrderLineItem {
  id: string;
  sales_order_id: string;
  product_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

// Customer
export interface Customer {
  id: string;
  organization_id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  is_active: boolean;
  total_orders: number;
  total_spent: number;
  created_at: string;
}

// Payment
export interface PaymentRecord {
  id: string;
  organization_id: string;
  invoice_id?: string;
  customer_id: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_date: string;
  reference?: string;
  notes?: string;
  created_at: string;

  customer?: Customer;
  invoice?: Invoice;
}

// Filters
export interface InvoiceFilters {
  customer_id?: string;
  status?: InvoiceStatus;
  date_from?: string;
  date_to?: string;
  overdue?: boolean;
}

export interface SalesOrderFilters {
  customer_id?: string;
  status?: SalesOrderStatus;
  date_from?: string;
  date_to?: string;
}

export interface PaymentFilters {
  customer_id?: string;
  invoice_id?: string;
  date_from?: string;
  date_to?: string;
}

// Input Types
export interface CreateInvoiceInput {
  customer_id: string;
  issue_date: string;
  due_date: string;
  items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
  }>;
  notes?: string;
}

export interface CreateSalesOrderInput {
  customer_id: string;
  order_date: string;
  delivery_date?: string;
  items: Array<{
    product_id?: string;
    description: string;
    quantity: number;
    unit_price: number;
  }>;
  notes?: string;
}

export interface CreatePaymentInput {
  invoice_id?: string;
  customer_id: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_date: string;
  reference?: string;
  notes?: string;
}

// API Response Types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
}
