import { useState, useCallback, useRef } from 'react';
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

/**
 * Hook for streaming chat messages with token-by-token updates
 */
export function useStreamMessage() {
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState('');
  const abortRef = useRef(false);

  const stream = useCallback(
    async (
      data: SendMessageDto,
      onComplete?: (metadata: any) => void,
      onError?: (error: Error) => void,
    ) => {
      if (!currentOrganization?.id) {
        onError?.(new Error('No organization selected'));
        return;
      }

      setIsStreaming(true);
      setStreamedContent('');
      abortRef.current = false;

      try {
        await chatApi.sendMessageStream(
          data,
          currentOrganization.id,
          (token) => {
            if (!abortRef.current) {
              setStreamedContent((prev) => prev + token);
            }
          },
          (metadata) => {
            setIsStreaming(false);
            queryClient.invalidateQueries({
              queryKey: ['chat-history', currentOrganization.id],
            });
            onComplete?.(metadata);
          },
          (error) => {
            setIsStreaming(false);
            onError?.(error);
          },
        );
      } catch (error) {
        setIsStreaming(false);
        onError?.(error instanceof Error ? error : new Error('Stream failed'));
      }
    },
    [currentOrganization?.id, queryClient],
  );

  const stopStream = useCallback(() => {
    abortRef.current = true;
    setIsStreaming(false);
  }, []);

  const resetStream = useCallback(() => {
    setStreamedContent('');
    setIsStreaming(false);
    abortRef.current = false;
  }, []);

  return { stream, isStreaming, streamedContent, stopStream, resetStream };
}

export type { SendMessageDto, ChatResponse };
