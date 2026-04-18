import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { itemsApi } from '../lib/api/items';
import type { ItemWithDetails } from '../types/items';

export function useBarcodeLookup(barcode: string | null) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['barcode-lookup', barcode, currentOrganization?.id],
    queryFn: async (): Promise<ItemWithDetails> => {
      if (!barcode) throw new Error('Barcode is required');
      if (!currentOrganization?.id) throw new Error('No organization selected');
      return itemsApi.getByBarcode(barcode, currentOrganization.id);
    },
    enabled: !!barcode && !!currentOrganization?.id,
  });
}
