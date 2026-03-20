// Accounting Hooks for Mobile App
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountingApi } from '@/lib/api/accounting';
import { useAuthStore } from '@/stores/authStore';
import type {
  InvoiceFilters,
  SalesOrderFilters,
  PaymentFilters,
  CreateInvoiceInput,
  CreateSalesOrderInput,
  CreatePaymentInput,
} from '@/types/accounting';

// Query Keys
export const accountingKeys = {
  all: ['accounting'] as const,
  customers: () => [...accountingKeys.all, 'customers'] as const,
  invoices: (filters?: InvoiceFilters) => [...accountingKeys.all, 'invoices', filters] as const,
  invoice: (id: string) => [...accountingKeys.all, 'invoice', id] as const,
  salesOrders: (filters?: SalesOrderFilters) => [...accountingKeys.all, 'sales-orders', filters] as const,
  salesOrder: (id: string) => [...accountingKeys.all, 'sales-order', id] as const,
  payments: (filters?: PaymentFilters) => [...accountingKeys.all, 'payments', filters] as const,
  dashboard: () => [...accountingKeys.all, 'dashboard'] as const,
};

// Customers
export function useCustomers() {
  const orgId = useAuthStore((s) => s.currentOrganization?.id);

  return useQuery({
    queryKey: accountingKeys.customers(),
    queryFn: () => accountingApi.getCustomers(),
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}

// Invoices
export function useInvoices(filters?: InvoiceFilters) {
  const orgId = useAuthStore((s) => s.currentOrganization?.id);

  return useQuery({
    queryKey: accountingKeys.invoices(filters),
    queryFn: () => accountingApi.getInvoices(filters),
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useInvoice(invoiceId: string) {
  return useQuery({
    queryKey: accountingKeys.invoice(invoiceId),
    queryFn: () => accountingApi.getInvoice(invoiceId),
    enabled: !!invoiceId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateInvoiceInput) => accountingApi.createInvoice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountingKeys.invoices() });
      queryClient.invalidateQueries({ queryKey: accountingKeys.dashboard() });
    },
  });
}

// Sales Orders
export function useSalesOrders(filters?: SalesOrderFilters) {
  const orgId = useAuthStore((s) => s.currentOrganization?.id);

  return useQuery({
    queryKey: accountingKeys.salesOrders(filters),
    queryFn: () => accountingApi.getSalesOrders(filters),
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useSalesOrder(orderId: string) {
  return useQuery({
    queryKey: accountingKeys.salesOrder(orderId),
    queryFn: () => accountingApi.getSalesOrder(orderId),
    enabled: !!orderId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateSalesOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSalesOrderInput) => accountingApi.createSalesOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountingKeys.salesOrders() });
      queryClient.invalidateQueries({ queryKey: accountingKeys.dashboard() });
    },
  });
}

// Payments
export function usePayments(filters?: PaymentFilters) {
  return useQuery({
    queryKey: accountingKeys.payments(filters),
    queryFn: () => accountingApi.getPayments(filters),
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePaymentInput) => accountingApi.createPayment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountingKeys.payments() });
      queryClient.invalidateQueries({ queryKey: accountingKeys.invoices() });
    },
  });
}

// Dashboard
export function useAccountingDashboard() {
  const orgId = useAuthStore((s) => s.currentOrganization?.id);

  return useQuery({
    queryKey: accountingKeys.dashboard(),
    queryFn: () => accountingApi.getDashboard(),
    enabled: !!orgId,
    staleTime: 30 * 1000,
  });
}
