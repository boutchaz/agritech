import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { productApplicationsApi, type CreateProductApplicationDto } from '@/lib/api/product-applications';

export type { ProductApplication } from '@/lib/api/product-applications';

export function useProductApplications() {
  const { currentOrganization } = useAuth();
  const organizationId = currentOrganization?.id;

  return useQuery({
    queryKey: ['product-applications', organizationId],
    queryFn: () => {
      if (!organizationId) throw new Error('No organization selected');
      return productApplicationsApi.getAll(organizationId);
    },
    enabled: !!organizationId,
    staleTime: 60000,
  });
}

export function useCreateProductApplication() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: (data: CreateProductApplicationDto) => {
      const orgId = currentOrganization?.id;
      if (!orgId) throw new Error('No organization selected');
      return productApplicationsApi.create(data, orgId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-applications'] });
    },
  });
}
