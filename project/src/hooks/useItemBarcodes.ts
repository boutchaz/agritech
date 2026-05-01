import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { barcodesApi } from '../lib/api/barcodes';
import type { CreateBarcodeInput, UpdateBarcodeInput } from '../types/barcode';

export function useItemBarcodes(itemId: string | null) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['item-barcodes', itemId, currentOrganization?.id],
    queryFn: async () => {
      if (!itemId) throw new Error('Item ID is required');
      if (!currentOrganization?.id) throw new Error('No organization selected');
      return barcodesApi.getAllForItem(itemId, currentOrganization.id);
    },
    enabled: !!itemId && !!currentOrganization?.id,
  });
}

export function useVariantBarcodes(variantId: string | null) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['variant-barcodes', variantId, currentOrganization?.id],
    queryFn: async () => {
      if (!variantId) throw new Error('Variant ID is required');
      if (!currentOrganization?.id) throw new Error('No organization selected');
      return barcodesApi.getAllForVariant(variantId, currentOrganization.id);
    },
    enabled: !!variantId && !!currentOrganization?.id,
  });
}

export function useCreateBarcode() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateBarcodeInput) => {
      if (!currentOrganization?.id) throw new Error('No organization selected');
      return barcodesApi.create(data, currentOrganization.id);
    },
    onSuccess: (_, variables) => {
      if (variables.item_id) {
        queryClient.invalidateQueries({ queryKey: ['item-barcodes', variables.item_id] });
        queryClient.invalidateQueries({ queryKey: ['item', variables.item_id] });
      }
      if (variables.variant_id) {
        queryClient.invalidateQueries({ queryKey: ['variant-barcodes', variables.variant_id] });
        queryClient.invalidateQueries({ queryKey: ['variants', variables.variant_id] });
      }
    },
  });
}

export function useUpdateBarcode() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateBarcodeInput }) => {
      if (!currentOrganization?.id) throw new Error('No organization selected');
      return barcodesApi.update(id, data, currentOrganization.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['item-barcodes'] });
    },
  });
}

export function useDeleteBarcode() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!currentOrganization?.id) throw new Error('No organization selected');
      return barcodesApi.remove(id, currentOrganization.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['item-barcodes'] });
      queryClient.invalidateQueries({ queryKey: ['variant-barcodes'] });
    },
  });
}

export function useGenerateBarcode() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (data: { item_id?: string; variant_id?: string }) => {
      if (!currentOrganization?.id) throw new Error('No organization selected');
      return barcodesApi.generate(data, currentOrganization.id);
    },
    onSuccess: (_, variables) => {
      if (variables.item_id) {
        queryClient.invalidateQueries({ queryKey: ['item-barcodes', variables.item_id] });
      }
      if (variables.variant_id) {
        queryClient.invalidateQueries({ queryKey: ['variant-barcodes', variables.variant_id] });
      }
    },
  });
}

export function useRegenerateBarcode() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!currentOrganization?.id) throw new Error('No organization selected');
      return barcodesApi.regenerate(id, currentOrganization.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['item-barcodes'] });
      queryClient.invalidateQueries({ queryKey: ['variant-barcodes'] });
    },
  });
}
