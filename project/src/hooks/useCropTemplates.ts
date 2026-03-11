import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import type { CropTemplate } from '@/types/agricultural-accounting';

export function useCropTemplates() {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['crop-templates', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return apiClient.get<CropTemplate[]>(
        '/api/v1/crop-templates',
        {},
        currentOrganization.id,
      );
    },
    enabled: !!currentOrganization?.id,
    staleTime: 10 * 60 * 1000,
  });
}
