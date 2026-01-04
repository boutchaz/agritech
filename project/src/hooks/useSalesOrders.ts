import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useAuth } from '../components/MultiTenantAuthProvider';
import { salesOrdersApi, type PaginatedSalesOrderQuery, type PaginatedResponse } from '../lib/api/sales-orders';

// Raw sales order from database
interface SalesOrderRaw {
  id: string;
  organization_id: string;
  order_number: string;
  order_date: string;
  expected_delivery_date: string | null;
  customer_id: string | null;
  customer_name: string;
  customer_contact: string | null;
  customer_address: string | null;
  shipping_address: string | null;
  tracking_number: string | null;
  subtotal: number | null;
  tax_amount: number | null;
  total_amount: number | null;
  currency_code: string | null;
  status: string | null;
  notes: string | null;
  terms_and_conditions: string | null;
  stock_entry_id: string | null;
  stock_issued: boolean | null;
  stock_issued_date: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  sales_order_items?: SalesOrderItem[];
}

// Normalized sales order for frontend use
export interface SalesOrder {
  id: string;
  organization_id: string;
  order_number: string;
  order_date: string;
  expected_delivery_date: string | null;
  customer_id: string | null;
  customer_name: string;
  customer_contact: string | null;
  customer_address: string | null;
  shipping_address: string | null;
  tracking_number: string | null;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  // Aliases for backward compatibility
  tax_total: number;
  grand_total: number;
  invoiced_amount: number;
  currency_code: string;
  status: 'draft' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'completed' | 'cancelled' | 'in_progress' | 'ready_to_ship' | 'invoiced';
  notes: string | null;
  terms_and_conditions: string | null;
  stock_entry_id: string | null;
  stock_issued: boolean | null;
  stock_issued_date: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  items?: SalesOrderItem[];
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
 * Transform raw database sales order to normalized frontend format
 */
function normalizeSalesOrder(raw: SalesOrderRaw): SalesOrder {
  const subtotal = Number(raw.subtotal) || 0;
  const taxAmount = Number(raw.tax_amount) || 0;
  const totalAmount = Number(raw.total_amount) || 0;

  // Calculate invoiced amount from items if available
  let invoicedAmount = 0;
  if (raw.sales_order_items && Array.isArray(raw.sales_order_items)) {
    invoicedAmount = raw.sales_order_items.reduce((sum, item) => {
      const invoicedQty = Number(item.invoiced_quantity) || 0;
      const unitPrice = Number(item.unit_price) || 0;
      return sum + (invoicedQty * unitPrice);
    }, 0);
  }

  return {
    id: raw.id,
    organization_id: raw.organization_id,
    order_number: raw.order_number,
    order_date: raw.order_date,
    expected_delivery_date: raw.expected_delivery_date,
    customer_id: raw.customer_id,
    customer_name: raw.customer_name,
    customer_contact: raw.customer_contact,
    customer_address: raw.customer_address,
    shipping_address: raw.shipping_address,
    tracking_number: raw.tracking_number,
    subtotal,
    tax_amount: taxAmount,
    total_amount: totalAmount,
    // Aliases for backward compatibility
    tax_total: taxAmount,
    grand_total: totalAmount,
    invoiced_amount: invoicedAmount,
    currency_code: raw.currency_code || 'MAD',
    status: (raw.status || 'draft') as SalesOrder['status'],
    notes: raw.notes,
    terms_and_conditions: raw.terms_and_conditions,
    stock_entry_id: raw.stock_entry_id,
    stock_issued: raw.stock_issued,
    stock_issued_date: raw.stock_issued_date,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
    created_by: raw.created_by,
    items: raw.sales_order_items,
  };
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

      try {
        const response = await salesOrdersApi.getSalesOrders({
          status: status,
          page: 1,
          pageSize: 100,
        }, currentOrganization.id);

        // Response structure: { data: SalesOrder[], pagination: {...} }
        if (!response) {
          console.error('Sales orders API returned null/undefined response');
          return [];
        }

        if (!response.data) {
          console.error('Sales orders API response missing data property:', response);
          // If response is an array directly (fallback), return it
          if (Array.isArray(response)) {
            return (response as SalesOrderRaw[]).map(normalizeSalesOrder);
          }
          return [];
        }

        const rawData = Array.isArray(response.data) ? response.data : [];
        return (rawData as SalesOrderRaw[]).map(normalizeSalesOrder);
      } catch (error) {
        console.error('Error fetching sales orders:', error);
        throw error;
      }
    },
    enabled: !!currentOrganization?.id,
  });
}

export function usePaginatedSalesOrders(query: PaginatedSalesOrderQuery) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['sales_orders', 'paginated', currentOrganization?.id, query],
    queryFn: async (): Promise<PaginatedResponse<SalesOrder>> => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      const response = await salesOrdersApi.getPaginated(query, currentOrganization.id);
      const rawData = Array.isArray(response.data) ? response.data : [];
      return {
        ...response,
        data: (rawData as SalesOrderRaw[]).map(normalizeSalesOrder),
      };
    },
    enabled: !!currentOrganization?.id,
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });
}

export function useSalesOrder(orderId: string | null) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['sales_order', orderId],
    queryFn: async () => {
      if (!orderId) throw new Error('Order ID is required');
      if (!currentOrganization?.id) throw new Error('No organization selected');

      const data = await salesOrdersApi.getSalesOrder(orderId, currentOrganization.id);
      return normalizeSalesOrder(data as SalesOrderRaw);
    },
    enabled: !!orderId && !!currentOrganization?.id,
  });
}

/**
 * Hook to convert sales order to invoice
 */
export function useConvertOrderToInvoice() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async ({ orderId, invoiceDate, dueDate }: {
      orderId: string;
      invoiceDate?: string;
      dueDate?: string;
    }) => {
      // Call the API endpoint with optional dates
      const response = await salesOrdersApi.convertToInvoice(orderId, {
        invoice_date: invoiceDate,
        due_date: dueDate,
      });
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

/**
 * Hook to issue stock for a sales order
 * Creates a Material Issue stock entry and records COGS journal entry
 */
export function useIssueStock() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async ({ orderId, warehouseId }: {
      orderId: string;
      warehouseId: string;
    }) => {
      const data = await salesOrdersApi.issueStock(orderId, warehouseId, currentOrganization?.id);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sales_orders', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['sales_order', variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ['stock_entries'] });
      queryClient.invalidateQueries({ queryKey: ['journal_entries'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}
