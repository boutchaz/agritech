import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import {
  deliveryNotesApi,
  type DeliveryNote,
  type CreateDeliveryNoteInput,
  type UpdateDeliveryNoteInput,
  type PaginatedDeliveryNoteQuery,
  type PaginatedResponse,
} from '../lib/api/delivery-notes';

export type { DeliveryNote };

type DeliveryNoteApiShape = Partial<DeliveryNote> & Record<string, unknown>;

function normalizeDeliveryNote(note: DeliveryNoteApiShape): DeliveryNote {
  return {
    id: String(note.id ?? ''),
    organization_id: String(note.organization_id ?? ''),
    delivery_note_number: String(note.delivery_note_number ?? ''),
    delivery_date: String(note.delivery_date ?? ''),
    sales_order_id: String(note.sales_order_id ?? ''),
    customer_id: (note.customer_id as string | null) ?? null,
    customer_name: (note.customer_name as string | null) ?? null,
    customer_address: (note.customer_address as string | null) ?? null,
    warehouse_id: (note.warehouse_id as string | null) ?? null,
    status: (note.status as DeliveryNote['status']) ?? 'draft',
    subtotal: Number(note.subtotal ?? 0),
    total_qty: Number(note.total_qty ?? 0),
    stock_entry_id: (note.stock_entry_id as string | null) ?? null,
    notes: (note.notes as string | null) ?? null,
    submitted_at: (note.submitted_at as string | null) ?? null,
    submitted_by: (note.submitted_by as string | null) ?? null,
    cancelled_at: (note.cancelled_at as string | null) ?? null,
    cancelled_by: (note.cancelled_by as string | null) ?? null,
    created_at: String(note.created_at ?? ''),
    updated_at: String(note.updated_at ?? ''),
    created_by: (note.created_by as string | null) ?? null,
    updated_by: (note.updated_by as string | null) ?? null,
    items: Array.isArray(note.items)
      ? note.items.map((item: unknown) => ({
          id: String((item as Record<string, unknown>).id ?? ''),
          delivery_note_id: String((item as Record<string, unknown>).delivery_note_id ?? ''),
          sales_order_item_id: ((item as Record<string, unknown>).sales_order_item_id as string | null) ?? null,
          line_number: Number((item as Record<string, unknown>).line_number ?? 0),
          item_id: String((item as Record<string, unknown>).item_id ?? ''),
          item_name: ((item as Record<string, unknown>).item_name as string | null) ?? null,
          quantity: Number((item as Record<string, unknown>).quantity ?? 0),
          batch_number: ((item as Record<string, unknown>).batch_number as string | null) ?? null,
          warehouse_id: ((item as Record<string, unknown>).warehouse_id as string | null) ?? null,
          notes: ((item as Record<string, unknown>).notes as string | null) ?? null,
          created_at: String((item as Record<string, unknown>).created_at ?? ''),
        }))
      : undefined,
    sales_order: note.sales_order as DeliveryNote['sales_order'] ?? undefined,
  };
}

export function usePaginatedDeliveryNotes(query: PaginatedDeliveryNoteQuery) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['delivery_notes', currentOrganization?.id, 'paginated', query],
    queryFn: async (): Promise<PaginatedResponse<DeliveryNote>> => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      const response = await deliveryNotesApi.getPaginated(query, currentOrganization.id);
      const rawData = Array.isArray(response.data) ? response.data : [];
      return {
        ...response,
        data: rawData.map((note) => normalizeDeliveryNote(note as DeliveryNoteApiShape)),
      };
    },
    enabled: !!currentOrganization?.id,
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });
}

export function useDeliveryNote(deliveryNoteId: string | null) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['delivery_notes', 'detail', deliveryNoteId],
    queryFn: async (): Promise<DeliveryNote> => {
      if (!deliveryNoteId) throw new Error('Delivery Note ID is required');
      if (!currentOrganization?.id) throw new Error('No organization selected');
      const data = await deliveryNotesApi.getOne(deliveryNoteId, currentOrganization.id);
      return normalizeDeliveryNote(data as DeliveryNoteApiShape);
    },
    enabled: !!deliveryNoteId && !!currentOrganization?.id,
  });
}

export function useCreateDeliveryNote() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateDeliveryNoteInput) => {
      if (!currentOrganization?.id) throw new Error('No organization');
      return deliveryNotesApi.create(data, currentOrganization.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery_notes'] });
      queryClient.invalidateQueries({ queryKey: ['sales_orders'] });
    },
  });
}

export function useUpdateDeliveryNote() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateDeliveryNoteInput }) => {
      if (!currentOrganization?.id) throw new Error('No organization');
      return deliveryNotesApi.update(id, data, currentOrganization.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery_notes'] });
      queryClient.invalidateQueries({ queryKey: ['sales_orders'] });
    },
  });
}

export function useDeleteDeliveryNote() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!currentOrganization?.id) throw new Error('No organization');
      return deliveryNotesApi.delete(id, currentOrganization.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery_notes'] });
      queryClient.invalidateQueries({ queryKey: ['sales_orders'] });
    },
  });
}

export function useSubmitDeliveryNote() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!currentOrganization?.id) throw new Error('No organization');
      return deliveryNotesApi.submit(id, currentOrganization.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery_notes'] });
      queryClient.invalidateQueries({ queryKey: ['sales_orders'] });
      queryClient.invalidateQueries({ queryKey: ['stock-approvals-pending'] });
    },
  });
}

export function useCancelDeliveryNote() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!currentOrganization?.id) throw new Error('No organization');
      return deliveryNotesApi.cancel(id, currentOrganization.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery_notes'] });
      queryClient.invalidateQueries({ queryKey: ['sales_orders'] });
      queryClient.invalidateQueries({ queryKey: ['stock-approvals-pending'] });
    },
  });
}
