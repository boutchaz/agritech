import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { chatApi, type SendMessageDto, type ChatResponse } from '@/lib/api/chat';
import { useAuth } from '@/components/MultiTenantAuthProvider';

/**
 * Hook to send a chat message and get AI response
 */
export function useSendMessage() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (data: SendMessageDto): Promise<ChatResponse> => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return chatApi.sendMessage(data, currentOrganization.id);
    },
    onSuccess: () => {
      // Invalidate chat history query
      queryClient.invalidateQueries({
        queryKey: ['chat-history', currentOrganization?.id],
      });
    },
  });
}

/**
 * Hook to fetch chat history
 */
export function useChatHistory(limit = 20) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['chat-history', currentOrganization?.id, limit],
    queryFn: () => chatApi.getHistory(currentOrganization?.id, limit),
    enabled: !!currentOrganization?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to clear chat history
 */
export function useClearChatHistory() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return chatApi.clearHistory(currentOrganization.id);
    },
    onSuccess: () => {
      // Invalidate chat history query
      queryClient.invalidateQueries({
        queryKey: ['chat-history', currentOrganization?.id],
      });
    },
  });
}

export type { SendMessageDto, ChatResponse };
