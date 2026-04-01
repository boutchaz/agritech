import { useState, useCallback, useRef } from 'react';
import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
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
 * Hook to fetch chat history with infinite scroll (load older messages on scroll up)
 */
export function useChatHistory(limit = 20) {
  const { currentOrganization } = useAuth();

  return useInfiniteQuery({
    queryKey: ['chat-history', currentOrganization?.id, limit],
    queryFn: ({ pageParam }) =>
      chatApi.getHistory(currentOrganization?.id, limit, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: () => undefined, // We don't load newer pages via infinite query
    getPreviousPageParam: (firstPage) => {
      if (!firstPage.hasMore || !firstPage.messages.length) return undefined;
      // Return the oldest message's timestamp as cursor
      return firstPage.messages[0].timestamp;
    },
    enabled: !!currentOrganization?.id,
    staleTime: 0,
    refetchOnWindowFocus: false, // Avoid refetch resetting scroll position
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
  const [streamSuggestions, setStreamSuggestions] = useState<string[]>([]);
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
      setStreamSuggestions([]);
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
            if (metadata?.suggestions) {
              setStreamSuggestions(metadata.suggestions);
            }
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
    setStreamSuggestions([]);
    setIsStreaming(false);
    abortRef.current = false;
  }, []);

  return { stream, isStreaming, streamedContent, streamSuggestions, stopStream, resetStream };
}

export type { SendMessageDto, ChatResponse };
