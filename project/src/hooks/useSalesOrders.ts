import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../components/MultiTenantAuthProvider';
import { salesOrdersApi } from '../lib/api/sales-orders';

export interface SalesOrder {
  id: string;
  organization_id: string;
  order_number: string;
  order_date: string;
  expected_delivery_date: string | null;
  customer_id: string | null;
  customer_name: string;
  shipping_address: string | null;
  shipping_city: string | null;
  shipping_postal_code: string | null;
  shipping_country: string | null;
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  subtotal: number;
  tax_total: number;
  discount_amount: number;
  shipping_charges: number;
  grand_total: number;
  delivered_amount: number;
  invoiced_amount: number;
  outstanding_amount: number;
  currency_code: string;
  exchange_rate: number;
  status: 'draft' | 'confirmed' | 'processing' | 'partially_delivered' | 'delivered' | 'partially_invoiced' | 'invoiced' | 'cancelled';
  payment_terms: string | null;
  delivery_terms: string | null;
  notes: string | null;
  quote_id: string | null;
  customer_po_number: string | null;
  farm_id: string | null;
  parcel_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  confirmed_at: string | null;
  confirmed_by: string | null;
}

export interface SalesOrderItem {
  id: string;
  sales_order_id: string;
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
  delivered_quantity: number;
  invoiced_quantity: number;
  account_id: string | null;
  quote_item_id: string | null;
}

export interface SalesOrderWithItems extends SalesOrder {
  items?: SalesOrderItem[];
}

/**
 * Hook to fetch all sales orders
 */
export function useSalesOrders(status?: SalesOrder['status']) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['sales_orders', currentOrganization?.id, status],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      const response = await salesOrdersApi.getSalesOrders({
        status: status,
        page: 1,
        limit: 1000, // TODO: Add pagination support
      });

      return response.data as SalesOrder[];
    },
    enabled: !!currentOrganization?.id,
  });
}

/**
 * Hook to fetch a single sales order with items
 */
export function useSalesOrder(orderId: string | null) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['sales_order', orderId],
    queryFn: async () => {
      if (!orderId) throw new Error('Order ID is required');

      const data = await salesOrdersApi.getSalesOrder(orderId);
      return data as SalesOrderWithItems;
    },
    enabled: !!orderId && !!currentOrganization?.id,
  });
}

/**
 * Hook to convert sales order to invoice
 * NOTE: Backend endpoint is currently a placeholder - full implementation in Phase 3 (Invoices module)
 */
export function useConvertOrderToInvoice() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async ({ orderId }: {
      orderId: string;
      invoiceDate?: string;  // Not used yet - will be implemented in Phase 3
      dueDate?: string;      // Not used yet - will be implemented in Phase 3
    }) => {
      // Call the API endpoint (currently returns placeholder message)
      const response = await salesOrdersApi.convertToInvoice(orderId);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales_orders', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['invoices', currentOrganization?.id] });
    },
  });
}

/**
 * Hook to update sales order status
 */
export function useUpdateSalesOrderStatus() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async ({ orderId, status, notes }: {
      orderId: string;
      status: SalesOrder['status'];
      notes?: string;
    }) => {
      const data = await salesOrdersApi.updateSalesOrderStatus(orderId, { status, notes });
      return data as SalesOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales_orders', currentOrganization?.id] });
    },
  });
}
