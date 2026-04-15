import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { productApplicationsApi, type CreateProductApplicationDto } from '@/lib/api/product-applications';

export type { ProductApplication } from '@/lib/api/product-applications';

export function useProductApplications() {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['product-applications', currentOrganization?.id],
    queryFn: () => productApplicationsApi.getAll(currentOrganization?.id),
    enabled: !!currentOrganization?.id,
    staleTime: 60000,
  });
}

export function useCreateProductApplication() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: (data: CreateProductApplicationDto) => {
      return productApplicationsApi.create(data, currentOrganization?.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-applications'] });
    },
  });
}
