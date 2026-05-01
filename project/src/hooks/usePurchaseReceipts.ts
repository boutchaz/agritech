import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import {
  purchaseReceiptsApi,
  type PurchaseReceipt,
  type CreatePurchaseReceiptInput,
  type UpdatePurchaseReceiptInput,
  type PaginatedPurchaseReceiptQuery,
  type PaginatedResponse,
} from '../lib/api/purchase-receipts';

type PurchaseReceiptApiShape = Partial<PurchaseReceipt> & Record<string, unknown>;

function normalizePurchaseReceipt(pr: PurchaseReceiptApiShape): PurchaseReceipt {
  return {
    id: String(pr.id ?? ''),
    organization_id: String(pr.organization_id ?? ''),
    receipt_number: String(pr.receipt_number ?? ''),
    receipt_date: String(pr.receipt_date ?? ''),
    purchase_order_id: String(pr.purchase_order_id ?? ''),
    status: (pr.status as PurchaseReceipt['status']) ?? 'draft',
    subtotal: Number(pr.subtotal ?? 0),
    tax_total: Number(pr.tax_total ?? 0),
    total_amount: Number(pr.total_amount ?? 0),
    stock_entry_id: (pr.stock_entry_id as string | null) ?? null,
    supplier_id: (pr.supplier_id as string | null) ?? null,
    supplier_name: String(pr.supplier_name ?? ''),
    notes: (pr.notes as string | null) ?? null,
    submitted_at: (pr.submitted_at as string | null) ?? null,
    submitted_by: (pr.submitted_by as string | null) ?? null,
    cancelled_at: (pr.cancelled_at as string | null) ?? null,
    cancelled_by: (pr.cancelled_by as string | null) ?? null,
    created_at: String(pr.created_at ?? ''),
    updated_at: String(pr.updated_at ?? ''),
    created_by: (pr.created_by as string | null) ?? null,
    updated_by: (pr.updated_by as string | null) ?? null,
    items: Array.isArray(pr.items)
      ? pr.items.map((item: unknown) => ({
          id: String((item as Record<string, unknown>).id ?? ''),
          purchase_receipt_id: String((item as Record<string, unknown>).purchase_receipt_id ?? ''),
          purchase_order_item_id: (item as Record<string, unknown>).purchase_order_item_id as string | null ?? null,
          line_number: Number((item as Record<string, unknown>).line_number ?? 0),
          item_id: String((item as Record<string, unknown>).item_id ?? ''),
          item_name: (item as Record<string, unknown>).item_name as string | null ?? null,
          quantity: Number((item as Record<string, unknown>).quantity ?? 0),
          rejected_quantity: Number((item as Record<string, unknown>).rejected_quantity ?? 0),
          accepted_quantity: Number((item as Record<string, unknown>).accepted_quantity ?? 0),
          unit_of_measure: (item as Record<string, unknown>).unit_of_measure as string | null ?? null,
          unit_price: Number((item as Record<string, unknown>).unit_price ?? 0),
          batch_number: (item as Record<string, unknown>).batch_number as string | null ?? null,
          warehouse_id: (item as Record<string, unknown>).warehouse_id as string | null ?? null,
          notes: (item as Record<string, unknown>).notes as string | null ?? null,
          tax_amount: Number((item as Record<string, unknown>).tax_amount ?? 0),
        }))
      : undefined,
    purchase_order: pr.purchase_order as PurchaseReceipt['purchase_order'] ?? undefined,
  };
}

export function usePaginatedPurchaseReceipts(query: PaginatedPurchaseReceiptQuery) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['purchase_receipts', currentOrganization?.id, 'paginated', query],
    queryFn: async (): Promise<PaginatedResponse<PurchaseReceipt>> => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      const response = await purchaseReceiptsApi.getPaginated(query, currentOrganization.id);
      const rawData = Array.isArray(response.data) ? response.data : [];
      return {
        ...response,
        data: rawData.map((pr) => normalizePurchaseReceipt(pr as PurchaseReceiptApiShape)),
      };
    },
    enabled: !!currentOrganization?.id,
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });
}

export function usePurchaseReceipt(receiptId: string | null) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['purchase_receipt', receiptId],
    queryFn: async (): Promise<PurchaseReceipt> => {
      if (!receiptId) throw new Error('Purchase Receipt ID is required');
      if (!currentOrganization?.id) throw new Error('No organization selected');
      const data = await purchaseReceiptsApi.getOne(receiptId, currentOrganization.id);
      return normalizePurchaseReceipt(data as PurchaseReceiptApiShape);
    },
    enabled: !!receiptId && !!currentOrganization?.id,
  });
}

export function useCreatePurchaseReceipt() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (data: CreatePurchaseReceiptInput) => {
      if (!currentOrganization?.id) throw new Error('No organization');
      return purchaseReceiptsApi.create(data, currentOrganization.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase_receipts', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['purchase_orders', currentOrganization?.id] });
    },
  });
}

export function useUpdatePurchaseReceipt() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdatePurchaseReceiptInput }) => {
      if (!currentOrganization?.id) throw new Error('No organization');
      return purchaseReceiptsApi.update(id, data, currentOrganization.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase_receipts', currentOrganization?.id] });
    },
  });
}

export function useDeletePurchaseReceipt() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!currentOrganization?.id) throw new Error('No organization');
      return purchaseReceiptsApi.delete(id, currentOrganization.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase_receipts', currentOrganization?.id] });
    },
  });
}

export function useSubmitPurchaseReceipt() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!currentOrganization?.id) throw new Error('No organization');
      return purchaseReceiptsApi.submit(id, currentOrganization.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase_receipts', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['purchase_receipt'] });
      queryClient.invalidateQueries({ queryKey: ['purchase_orders', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['stock-approvals-pending'] });
    },
  });
}

export function useCancelPurchaseReceipt() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!currentOrganization?.id) throw new Error('No organization');
      return purchaseReceiptsApi.cancel(id, currentOrganization.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase_receipts', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['purchase_receipt'] });
      queryClient.invalidateQueries({ queryKey: ['purchase_orders', currentOrganization?.id] });
    },
  });
}
