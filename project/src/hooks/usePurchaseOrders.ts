import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/MultiTenantAuthProvider';
import { calculateInvoiceTotals, type InvoiceItemInput } from '../lib/taxCalculations';
import { createInvoiceFromOrder } from '../lib/invoice-service';

export interface PurchaseOrder {
  id: string;
  organization_id: string;
  po_number: string;
  po_date: string;
  expected_delivery_date: string | null;
  supplier_id: string | null;
  supplier_name: string;
  delivery_address: string | null;
  delivery_city: string | null;
  delivery_postal_code: string | null;
  delivery_country: string | null;
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  subtotal: number;
  tax_total: number;
  discount_amount: number;
  shipping_charges: number;
  grand_total: number;
  received_amount: number;
  billed_amount: number;
  outstanding_amount: number;
  currency_code: string;
  exchange_rate: number;
  status: 'draft' | 'submitted' | 'confirmed' | 'partially_received' | 'received' | 'partially_billed' | 'billed' | 'cancelled';
  payment_terms: string | null;
  delivery_terms: string | null;
  notes: string | null;
  supplier_quote_ref: string | null;
  farm_id: string | null;
  parcel_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  submitted_at: string | null;
  submitted_by: string | null;
  confirmed_at: string | null;
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
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
  received_quantity: number;
  billed_quantity: number;
  account_id: string | null;
  inventory_item_id: string | null;
}

export interface PurchaseOrderWithItems extends PurchaseOrder {
  items?: PurchaseOrderItem[];
}

/**
 * Hook to fetch all purchase orders
 */
export function usePurchaseOrders(status?: PurchaseOrder['status']) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['purchase_orders', currentOrganization?.id, status],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      let query = supabase
        .from('purchase_orders')
        .select('*, items:purchase_order_items(*)')
        .eq('organization_id', currentOrganization.id)
        .order('po_date', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as PurchaseOrderWithItems[];
    },
    enabled: !!currentOrganization?.id,
  });
}

/**
 * Hook to fetch a single purchase order with items
 */
export function usePurchaseOrder(poId: string | null) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['purchase_order', poId],
    queryFn: async () => {
      if (!poId) throw new Error('Purchase Order ID is required');

      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`*, items:purchase_order_items(*)`)
        .eq('id', poId)
        .eq('organization_id', currentOrganization?.id || '')
        .single();

      if (error) throw error;
      return data as PurchaseOrderWithItems;
    },
    enabled: !!poId && !!currentOrganization?.id,
  });
}

/**
 * Hook to create a new purchase order
 */
export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();
  const { currentOrganization, user } = useAuth();

  return useMutation({
    mutationFn: async (poData: {
      supplier_id: string;
      po_date: string;
      expected_delivery_date?: string;
      items: InvoiceItemInput[];
      payment_terms?: string;
      delivery_terms?: string;
      notes?: string;
      supplier_quote_ref?: string;
    }) => {
      if (!currentOrganization?.id || !user?.id) {
        throw new Error('No organization or user');
      }

      // Fetch supplier name
      const { data: supplier } = await supabase
        .from('suppliers')
        .select('name, contact_person, email, phone')
        .eq('id', poData.supplier_id)
        .single();

      // Generate PO number
      const { data: poNumber, error: numberError } = await supabase
        .rpc('generate_purchase_order_number', {
          p_organization_id: currentOrganization.id,
        });

      if (numberError) throw numberError;

      // Calculate totals
      const totals = await calculateInvoiceTotals(poData.items, 'purchase');

      // Create purchase order
      const { data: po, error: poError } = await supabase
        .from('purchase_orders')
        .insert({
          organization_id: currentOrganization.id,
          po_number: poNumber,
          po_date: poData.po_date,
          expected_delivery_date: poData.expected_delivery_date || null,
          supplier_id: poData.supplier_id,
          supplier_name: supplier?.name || '',
          contact_person: supplier?.contact_person,
          contact_email: supplier?.email,
          contact_phone: supplier?.phone,
          subtotal: totals.subtotal,
          tax_total: totals.tax_total,
          grand_total: totals.grand_total,
          outstanding_amount: totals.grand_total,
          currency_code: currentOrganization.currency || 'MAD',
          status: 'draft',
          payment_terms: poData.payment_terms,
          delivery_terms: poData.delivery_terms,
          notes: poData.notes,
          supplier_quote_ref: poData.supplier_quote_ref,
          created_by: user.id,
        })
        .select()
        .single();

      if (poError) throw poError;

      // Create PO items
      const items = totals.items_with_tax.map((item, index) => ({
        purchase_order_id: po.id,
        line_number: index + 1,
        item_name: item.item_name,
        description: item.description || null,
        quantity: item.quantity,
        unit_price: item.rate,
        amount: item.amount,
        tax_id: item.tax_id || null,
        tax_rate: item.tax_rate || 0,
        tax_amount: item.tax_amount,
        line_total: item.total_amount,
        account_id: item.account_id,
      }));

      const { error: itemsError } = await supabase
        .from('purchase_order_items')
        .insert(items);

      if (itemsError) throw itemsError;

      return po;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase_orders', currentOrganization?.id] });
    },
  });
}

/**
 * Hook to convert purchase order to bill (purchase invoice)
 * Uses shared invoice service to eliminate duplicate logic
 */
export function useConvertPOToBill() {
  const queryClient = useQueryClient();
  const { currentOrganization, user } = useAuth();

  return useMutation({
    mutationFn: async ({ poId, invoiceDate, dueDate }: {
      poId: string;
      invoiceDate: string;
      dueDate: string;
    }) => {
      if (!currentOrganization?.id || !user?.id) {
        throw new Error('No organization or user');
      }

      // Fetch PO with items
      const { data: po, error: fetchError } = await supabase
        .from('purchase_orders')
        .select(`*, items:purchase_order_items(*)`)
        .eq('id', poId)
        .single();

      if (fetchError) throw fetchError;

      // Calculate remaining quantities for invoice (only unbilled items)
      const billItems = po.items.map((item: any) => ({
        item_name: item.item_name,
        description: item.description || null,
        quantity: item.quantity - item.billed_quantity,
        unit_price: item.unit_price,
        amount: (item.quantity - item.billed_quantity) * item.unit_price,
        tax_id: item.tax_id || null,
        tax_rate: item.tax_rate || 0,
        account_id: item.account_id,
      }));

      // Calculate totals from remaining items
      const remainingSubtotal = billItems.reduce((sum, item) => sum + item.amount, 0);
      const remainingTaxTotal = billItems.reduce(
        (sum, item) => sum + (item.amount * item.tax_rate) / 100,
        0
      );
      const remainingGrandTotal = remainingSubtotal + remainingTaxTotal;

      // Use shared invoice service
      const bill = await createInvoiceFromOrder({
        organization_id: currentOrganization.id,
        user_id: user.id,
        invoice_type: 'purchase',
        party_id: po.supplier_id,
        party_name: po.supplier_name,
        invoice_date: invoiceDate,
        due_date: dueDate,
        subtotal: remainingSubtotal,
        tax_total: remainingTaxTotal,
        grand_total: remainingGrandTotal,
        items: billItems,
        currency_code: po.currency_code,
        exchange_rate: po.exchange_rate,
        status: 'draft',
        remarks: null,
        farm_id: po.farm_id || null,
        parcel_id: po.parcel_id || null,
        sales_order_id: null,
        purchase_order_id: poId,
      });

      // Update PO billed_amount and status
      const newBilledAmount = po.billed_amount + bill.grand_total;
      const newStatus = newBilledAmount >= po.grand_total ? 'billed' : 'partially_billed';

      await supabase
        .from('purchase_orders')
        .update({
          billed_amount: newBilledAmount,
          outstanding_amount: po.grand_total - newBilledAmount,
          status: newStatus,
        })
        .eq('id', poId);

      // Update PO items billed_quantity
      for (const item of po.items) {
        await supabase
          .from('purchase_order_items')
          .update({
            billed_quantity: item.quantity,
          })
          .eq('id', item.id);
      }

      return bill;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase_orders', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['invoices', currentOrganization?.id] });
    },
  });
}

/**
 * Hook to update purchase order (details and items)
 */
export function useUpdatePurchaseOrder() {
  const queryClient = useQueryClient();
  const { currentOrganization, user } = useAuth();

  return useMutation({
    mutationFn: async (poData: {
      poId: string;
      po_date?: string;
      expected_delivery_date?: string;
      payment_terms?: string;
      delivery_address?: string;
      notes?: string;
      items?: InvoiceItemInput[];
    }) => {
      if (!currentOrganization?.id || !user?.id) {
        throw new Error('No organization or user');
      }

      const { poId, items, ...updates } = poData;

      // If items are provided, calculate new totals
      if (items && items.length > 0) {
        const totals = await calculateInvoiceTotals(items, 'purchase');
        
        // Get current billed amount
        const { data: currentPO } = await supabase
          .from('purchase_orders')
          .select('billed_amount')
          .eq('id', poId)
          .single();
        
        const currentBilledAmount = currentPO?.billed_amount || 0;

        // Update purchase order with new totals
        const { error: updateError } = await supabase
          .from('purchase_orders')
          .update({
            ...updates,
            subtotal: totals.subtotal,
            tax_total: totals.tax_total,
            grand_total: totals.grand_total,
            outstanding_amount: totals.grand_total - currentBilledAmount,
          })
          .eq('id', poId)
          .eq('organization_id', currentOrganization.id);

        if (updateError) throw updateError;

        // Delete existing items
        const { error: deleteError } = await supabase
          .from('purchase_order_items')
          .delete()
          .eq('purchase_order_id', poId);

        if (deleteError) throw deleteError;

        // Insert new items
        const poItems = totals.items_with_tax.map((item, index) => ({
          purchase_order_id: poId,
          line_number: index + 1,
          item_name: item.item_name,
          description: item.description || null,
          quantity: item.quantity,
          unit_price: item.rate,
          amount: item.amount,
          tax_id: item.tax_id || null,
          tax_rate: item.tax_rate || 0,
          tax_amount: item.tax_amount,
          line_total: item.total_amount,
          account_id: item.account_id,
        }));

        const { error: insertError } = await supabase
          .from('purchase_order_items')
          .insert(poItems);

        if (insertError) throw insertError;
      } else {
        // Just update details without items
        const { error: updateError } = await supabase
          .from('purchase_orders')
          .update(updates)
          .eq('id', poId)
          .eq('organization_id', currentOrganization.id);

        if (updateError) throw updateError;
      }

      // Fetch updated purchase order
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('id', poId)
        .single();

      if (error) throw error;
      return data as PurchaseOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase_orders', currentOrganization?.id] });
    },
  });
}

/**
 * Hook to update purchase order status
 */
export function useUpdatePurchaseOrderStatus() {
  const queryClient = useQueryClient();
  const { currentOrganization, user } = useAuth();

  return useMutation({
    mutationFn: async ({ poId, status }: { poId: string; status: PurchaseOrder['status'] }) => {
      const updates: Partial<PurchaseOrder> = { status };

      if (status === 'submitted') {
        updates.submitted_at = new Date().toISOString();
        updates.submitted_by = user?.id || null;
      } else if (status === 'confirmed') {
        updates.confirmed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('purchase_orders')
        .update(updates)
        .eq('id', poId)
        .eq('organization_id', currentOrganization?.id || '')
        .select()
        .single();

      if (error) throw error;
      return data as PurchaseOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase_orders', currentOrganization?.id] });
    },
  });
}
