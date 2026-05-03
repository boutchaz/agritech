import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { useModuleEnabled } from './useModuleEnabled';
import { trackEntityCreate, trackEntityUpdate } from '../lib/analytics';
import { purchaseOrdersApi, type PaginatedPurchaseOrderQuery, type PaginatedResponse } from '../lib/api/purchase-orders';
import { type InvoiceItemInput } from '../lib/taxCalculations';

export interface PurchaseOrder {
  id: string;
  organization_id: string;
  order_number: string;
  order_date: string;
  expected_delivery_date: string | null;
  supplier_id: string | null;
  supplier_name: string;
  supplier_contact: string | null;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  // Computed/aliased fields for UI compatibility
  grand_total: number;
  billed_amount: number;
  currency_code: string;
  status: 'draft' | 'submitted' | 'confirmed' | 'partially_received' | 'received' | 'partially_billed' | 'billed' | 'cancelled';
  notes: string | null;
  terms_and_conditions: string | null;
  stock_entry_id: string | null;
  stock_received: boolean;
  stock_received_date: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

type PurchaseOrderApiShape = Partial<PurchaseOrderWithItems> & Record<string, unknown>;

/**
 * Normalize API response to ensure consistent field names
 */
function normalizePurchaseOrder(po: PurchaseOrderApiShape): PurchaseOrder {
  return {
    id: String(po.id ?? ''),
    organization_id: String(po.organization_id ?? ''),
    order_number: String(po.order_number ?? ''),
    order_date: String(po.order_date ?? ''),
    expected_delivery_date: (po.expected_delivery_date as string | null | undefined) ?? null,
    supplier_id: (po.supplier_id as string | null | undefined) ?? null,
    supplier_name: String(po.supplier_name ?? ''),
    supplier_contact: (po.supplier_contact as string | null | undefined) ?? null,
    // Map total_amount to grand_total for UI compatibility
    grand_total: Number(po.grand_total ?? po.total_amount ?? 0),
    total_amount: Number(po.total_amount ?? po.grand_total ?? 0),
    subtotal: Number(po.subtotal ?? 0),
    tax_amount: Number(po.tax_amount ?? 0),
    billed_amount: Number(po.billed_amount ?? 0),
    // Default currency if not set
    currency_code: typeof po.currency_code === 'string' ? po.currency_code : 'MAD',
    status: (po.status as PurchaseOrder['status'] | undefined) ?? 'draft',
    notes: (po.notes as string | null | undefined) ?? null,
    terms_and_conditions: (po.terms_and_conditions as string | null | undefined) ?? null,
    stock_entry_id: (po.stock_entry_id as string | null | undefined) ?? null,
    stock_received: Boolean(po.stock_received),
    stock_received_date: (po.stock_received_date as string | null | undefined) ?? null,
    created_at: String(po.created_at ?? ''),
    updated_at: String(po.updated_at ?? ''),
    created_by: (po.created_by as string | null | undefined) ?? null,
  };
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
  const salesPurchasingEnabled = useModuleEnabled('sales_purchasing');

  return useQuery({
    queryKey: ['purchase_orders', currentOrganization?.id, status],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      const response = await purchaseOrdersApi.getPurchaseOrders({
        status: status,
        page: 1,
        pageSize: 100,
      }, currentOrganization.id) as PurchaseOrderApiShape[] | { data?: PurchaseOrderApiShape[] };

      const purchaseOrders = Array.isArray(response) ? response : (response?.data || []);
      return purchaseOrders.map((po: unknown) => normalizePurchaseOrder(po as PurchaseOrderApiShape)) as PurchaseOrderWithItems[];
    },
    enabled: salesPurchasingEnabled && !!currentOrganization?.id,
  });
}

export function usePaginatedPurchaseOrders(query: PaginatedPurchaseOrderQuery) {
  const { currentOrganization } = useAuth();
  const salesPurchasingEnabled = useModuleEnabled('sales_purchasing');

  return useQuery({
    queryKey: ['purchase_orders', 'paginated', currentOrganization?.id, query],
    queryFn: async (): Promise<PaginatedResponse<PurchaseOrder>> => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      const response = await purchaseOrdersApi.getPaginated(query, currentOrganization.id);
      const rawData = Array.isArray(response.data) ? response.data : [];
      return {
        ...response,
        data: rawData.map((po: unknown) => normalizePurchaseOrder(po as PurchaseOrderApiShape)) as PurchaseOrder[],
      };
    },
    enabled: salesPurchasingEnabled && !!currentOrganization?.id,
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });
}

export function usePurchaseOrder(poId: string | null) {
  const { currentOrganization } = useAuth();
  const salesPurchasingEnabled = useModuleEnabled('sales_purchasing');

  return useQuery({
    queryKey: ['purchase_order', poId],
    queryFn: async () => {
      if (!poId) throw new Error('Purchase Order ID is required');
      if (!currentOrganization?.id) throw new Error('No organization selected');

      const data = await purchaseOrdersApi.getPurchaseOrder(poId, currentOrganization.id);
      return normalizePurchaseOrder(data as PurchaseOrderApiShape) as PurchaseOrderWithItems;
    },
    enabled: salesPurchasingEnabled && !!poId && !!currentOrganization?.id,
  });
}

/**
 * Hook to create a new purchase order
 */
export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (poData: {
      supplier_id: string;
      order_date: string;
      expected_delivery_date?: string;
      items: InvoiceItemInput[];
      payment_terms?: string;
      delivery_terms?: string;
      notes?: string;
      supplier_quote_ref?: string;
    }) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization');
      }

      const apiItems = poData.items.map((item, index) => {
        const extendedItem = item as InvoiceItemInput & { tax_rate?: number; inventory_item_id?: string };
        return {
          line_number: index + 1,
          item_name: item.item_name,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.rate,
          tax_rate: extendedItem.tax_rate || 0,
          account_id: item.account_id,
          item_id: extendedItem.inventory_item_id,
        };
      });

      // Call the API to create purchase order
      const po = await purchaseOrdersApi.createPurchaseOrder({
        order_date: poData.order_date,
        expected_delivery_date: poData.expected_delivery_date,
        supplier_id: poData.supplier_id,
        notes: poData.notes,
        terms_and_conditions: `Payment Terms: ${poData.payment_terms || 'N/A'}\nDelivery Terms: ${poData.delivery_terms || 'N/A'}\nSupplier Quote Ref: ${poData.supplier_quote_ref || 'N/A'}`,
        items: apiItems,
      }, currentOrganization.id);

      return po;
    },
    onSuccess: () => {
      trackEntityCreate('purchase_order');
      queryClient.invalidateQueries({ queryKey: ['purchase_orders', currentOrganization?.id] });
    },
  });
}

/**
 * Hook to convert purchase order to bill (purchase invoice)
 */
export function useConvertPOToBill() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async ({ poId, invoiceDate, dueDate }: {
      poId: string;
      invoiceDate?: string;
      dueDate?: string;
    }) => {
      // Call the API endpoint with optional dates
      const response = await purchaseOrdersApi.convertToBill(poId, {
        invoice_date: invoiceDate,
        due_date: dueDate,
      });
      return response;
    },
    onSuccess: () => {
      trackEntityUpdate('purchase_order');
      queryClient.invalidateQueries({ queryKey: ['purchase_orders', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['invoices', currentOrganization?.id] });
    },
  });
}

/**
 * Hook to update purchase order (details only)
 * NOTE: Backend currently only supports updating metadata fields, not line items
 * For item updates, a new backend endpoint will be needed in the future
 */
export function useUpdatePurchaseOrder() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (poData: {
      poId: string;
      order_date?: string;
      expected_delivery_date?: string;
      payment_terms?: string;
      delivery_address?: string;
      notes?: string;
      items?: InvoiceItemInput[];  // Currently ignored - backend doesn't support item updates yet
    }) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization');
      }

      const { poId, items, payment_terms, delivery_address, ...updates } = poData;

      // Log a warning if items are provided (not yet supported)
      if (items && items.length > 0) {
        console.warn('Item updates are not yet supported via API. Only metadata will be updated.');
      }

      // Build the update payload (only fields supported by the backend)
      const updatePayload: Record<string, unknown> = {
        ...updates,
      };

      // Add payment_terms and delivery_address to notes if provided
      if (payment_terms || delivery_address) {
        const additionalNotes = [];
        if (payment_terms) additionalNotes.push(`Payment Terms: ${payment_terms}`);
        if (delivery_address) additionalNotes.push(`Delivery Address: ${delivery_address}`);

        updatePayload.notes = updatePayload.notes
          ? `${updatePayload.notes}\n\n${additionalNotes.join('\n')}`
          : additionalNotes.join('\n');
      }

      // Call the API to update purchase order
      const data = await purchaseOrdersApi.updatePurchaseOrder(poId, updatePayload);
      return data as PurchaseOrder;
    },
    onSuccess: () => {
      trackEntityUpdate('purchase_order');
      queryClient.invalidateQueries({ queryKey: ['purchase_orders', currentOrganization?.id] });
    },
  });
}

/**
 * Hook to update purchase order status
 */
export function useUpdatePurchaseOrderStatus() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async ({ poId, status, notes }: {
      poId: string;
      status: PurchaseOrder['status'];
      notes?: string;
    }) => {
      const data = await purchaseOrdersApi.updatePurchaseOrderStatus(poId, { status, notes });
      return data as PurchaseOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase_orders', currentOrganization?.id] });
    },
  });
}
