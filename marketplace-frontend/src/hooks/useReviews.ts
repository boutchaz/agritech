import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiClient, CreateReviewDto } from '@/lib/api';

export function useCanReview(sellerId: string) {
  return useQuery({
    queryKey: ['can-review', sellerId],
    queryFn: () => ApiClient.canReview(sellerId),
    staleTime: 5 * 60 * 1000,
    enabled: !!sellerId,
  });
}

export function useCreateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateReviewDto) => ApiClient.createReview(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['can-review'] });
      queryClient.invalidateQueries({ queryKey: ['seller'] });
      queryClient.invalidateQueries({ queryKey: ['order'] });
    },
  });
}
