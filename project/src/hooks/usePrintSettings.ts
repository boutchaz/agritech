import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { printSettingsApi, type PrintSettings } from '@/lib/api/print-settings';

export function usePrintSettings(organizationId: string | null) {
  return useQuery({
    queryKey: ['print-settings', organizationId],
    queryFn: () => printSettingsApi.get(organizationId!),
    enabled: !!organizationId,
  });
}

export function useUpdatePrintSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      organizationId,
      data,
    }: {
      organizationId: string;
      data: Partial<PrintSettings>;
    }) => printSettingsApi.update(organizationId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['print-settings', variables.organizationId] });
    },
  });
}
