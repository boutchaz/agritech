import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/MultiTenantAuthProvider';

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

      let query = supabase
        .from('sales_orders')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('order_date', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SalesOrder[];
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

      const { data, error } = await supabase
        .from('sales_orders')
        .select(`*, items:sales_order_items(*)`)
        .eq('id', orderId)
        .eq('organization_id', currentOrganization?.id || '')
        .single();

      if (error) throw error;
      return data as SalesOrderWithItems;
    },
    enabled: !!orderId && !!currentOrganization?.id,
  });
}

/**
 * Hook to convert sales order to invoice
 */
export function useConvertOrderToInvoice() {
  const queryClient = useQueryClient();
  const { currentOrganization, user } = useAuth();

  return useMutation({
    mutationFn: async ({ orderId, invoiceDate, dueDate }: {
      orderId: string;
      invoiceDate: string;
      dueDate: string;
    }) => {
      if (!currentOrganization?.id || !user?.id) {
        throw new Error('No organization or user');
      }

      // Fetch sales order with items
      const { data: order, error: fetchError } = await supabase
        .from('sales_orders')
        .select(`*, items:sales_order_items(*)`)
        .eq('id', orderId)
        .single();

      if (fetchError) throw fetchError;

      // Generate invoice number
      const { data: invoiceNumber, error: numberError } = await supabase
        .rpc('generate_invoice_number', {
          p_organization_id: currentOrganization.id,
          p_invoice_type: 'sales',
        });

      if (numberError) throw numberError;

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          organization_id: currentOrganization.id,
          invoice_number: invoiceNumber,
          invoice_type: 'sales',
          party_type: 'Customer',
          party_id: order.customer_id,
          party_name: order.customer_name,
          invoice_date: invoiceDate,
          due_date: dueDate,
          subtotal: order.subtotal,
          tax_total: order.tax_total,
          grand_total: order.grand_total,
          outstanding_amount: order.grand_total,
          currency_code: order.currency_code,
          exchange_rate: order.exchange_rate,
          status: 'draft',
          sales_order_id: orderId,
          farm_id: order.farm_id || null,
          parcel_id: order.parcel_id || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Copy order items to invoice items
      const invoiceItems = order.items.map((item: any) => ({
        invoice_id: invoice.id,
        item_name: item.item_name,
        description: item.description,
        quantity: item.quantity - item.invoiced_quantity, // Only remaining quantity
        unit_price: item.unit_price,
        amount: (item.quantity - item.invoiced_quantity) * item.unit_price,
        tax_id: item.tax_id,
        tax_amount: ((item.quantity - item.invoiced_quantity) * item.unit_price * item.tax_rate) / 100,
        income_account_id: item.account_id,
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(invoiceItems);

      if (itemsError) throw itemsError;

      // Update order invoiced_amount and status
      const newInvoicedAmount = order.invoiced_amount + invoice.grand_total;
      const newStatus = newInvoicedAmount >= order.grand_total ? 'invoiced' : 'partially_invoiced';

      await supabase
        .from('sales_orders')
        .update({
          invoiced_amount: newInvoicedAmount,
          outstanding_amount: order.grand_total - newInvoicedAmount,
          status: newStatus,
        })
        .eq('id', orderId);

      // Update order items invoiced_quantity
      for (const item of order.items) {
        await supabase
          .from('sales_order_items')
          .update({
            invoiced_quantity: item.quantity, // Mark as fully invoiced
          })
          .eq('id', item.id);
      }

      return invoice;
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
    mutationFn: async ({ orderId, status }: { orderId: string; status: SalesOrder['status'] }) => {
      const { data, error } = await supabase
        .from('sales_orders')
        .update({ status })
        .eq('id', orderId)
        .eq('organization_id', currentOrganization?.id || '')
        .select()
        .single();

      if (error) throw error;
      return data as SalesOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales_orders', currentOrganization?.id] });
    },
  });
}
