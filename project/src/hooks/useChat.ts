import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { chatApi, type SendMessageDto, type ChatResponse } from '@/lib/api/chat';
import { useAuth } from '@/hooks/useAuth';

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
      try {
        const response = await chatApi.sendMessage(data, currentOrganization.id);
        return response;
      } catch (error: any) {
        console.error('Chat API error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate and refetch chat history query immediately
      queryClient.invalidateQueries({
        queryKey: ['chat-history', currentOrganization?.id],
      });
      // Also refetch to ensure we get the latest messages
      queryClient.refetchQueries({
        queryKey: ['chat-history', currentOrganization?.id],
      });
    },
    onError: (error: any) => {
      console.error('Chat mutation error:', error);
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
    staleTime: 0, // Always refetch when invalidated
    refetchOnWindowFocus: true,
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
    onSuccess: async () => {
      // Remove the query data immediately to clear cache
      queryClient.removeQueries({
        queryKey: ['chat-history', currentOrganization?.id],
      });
      // Invalidate and refetch chat history query to ensure it's cleared from backend
      await queryClient.invalidateQueries({
        queryKey: ['chat-history', currentOrganization?.id],
      });
      // Force refetch to get the empty result from backend
      await queryClient.refetchQueries({
        queryKey: ['chat-history', currentOrganization?.id],
      });
    },
  });
}

export type { SendMessageDto, ChatResponse };
