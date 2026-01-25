# Production-Ready AI Chat Interface Best Practices

## Overview
This document outlines production-ready best practices for AI chat interfaces, focusing on React + TypeScript frontend with NestJS backend implementations.

## Core Requirements for Production AI Chat

### 1. Streaming Responses (Critical for UX)

**Why Streaming Matters:**
- Users expect to see content appear within 300-700ms (TTFT - Time To First Token)
- Steady token cadence prevents perceived lag
- Creates engagement and reduces abandonment

**Implementation Approaches:**

#### Server-Sent Events (SSE) - Recommended for AI Chat
```typescript
// Backend: NestJS SSE Implementation
@Sse('chat')
sseStream(@Body() chatDto: ChatDto) {
  return new Observable((subscriber) => {
    const stream = this.aiService.streamResponse(chatDto.messages);
    
    stream.on('data', (chunk) => {
      subscriber.next({ data: JSON.stringify({ type: 'token', content: chunk }) });
    });
    
    stream.on('end', () => {
      subscriber.next({ data: JSON.stringify({ type: 'done' }) });
      subscriber.complete();
    });
    
    stream.on('error', (error) => {
      subscriber.error(error);
    });
  });
}
```

```typescript
// Frontend: React SSE Consumption
const useSSEChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (content: string) => {
    setIsLoading(true);
    
    const eventSource = new EventSource('/api/chat/sse', {
      method: 'POST',
      body: JSON.stringify({ messages: [...messages, { role: 'user', content }] })
    });

    let assistantMessage = { role: 'assistant', content: '' };
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'token') {
        assistantMessage.content += data.content;
        setMessages(prev => [...prev.slice(0, -1), assistantMessage]);
      } else if (data.type === 'done') {
        setIsLoading(false);
        eventSource.close();
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE Error:', error);
      setIsLoading(false);
      eventSource.close();
      // Implement retry logic
    };
  };

  return { messages, sendMessage, isLoading };
};
```

#### Alternative: Fetch with ReadableStream
```typescript
// Alternative SSE implementation using fetch
const streamResponse = async (messages: Message[]) => {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages })
  });

  if (!response.body) throw new Error('No response body');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let accumulatedText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') return;
        
        try {
          const parsed = JSON.parse(data);
          accumulatedText += parsed.content;
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: accumulatedText 
          }]);
        } catch (e) {
          // Handle malformed JSON
        }
      }
    }
  }
};
```

### 2. Error Handling & Retry Mechanisms

**Error Categories:**
1. Network/Connectivity errors
2. LLM provider errors (rate limits, outages)
3. Content moderation failures
4. Timeout errors

**Implementation Strategy:**

```typescript
// Comprehensive Error Handling Hook
const useChatWithErrorHandling = () => {
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  const sendMessageWithRetry = async (content: string) => {
    try {
      setError(null);
      await sendMessage(content);
      setRetryCount(0); // Reset on success
    } catch (err) {
      const error = err as Error;
      
      // Categorize errors for appropriate handling
      if (isNetworkError(error)) {
        if (retryCount < maxRetries) {
          const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
            sendMessageWithRetry(content);
          }, delay);
          return;
        }
      }
      
      if (isRateLimitError(error)) {
        setError(new Error('Rate limit exceeded. Please try again in a moment.'));
        // Implement queue or throttling
      } else if (isModerationError(error)) {
        setError(new Error('Content blocked by safety filters.'));
      } else {
        setError(new Error('Something went wrong. Please try again.'));
      }
    }
  };

  const retry = () => {
    if (error) {
      setRetryCount(0);
      sendMessageWithRetry(lastMessage);
    }
  };

  return { sendMessage: sendMessageWithRetry, error, retry, isLoading };
};

// Error type detection
const isNetworkError = (error: Error): boolean => 
  error.name === 'NetworkError' || error.message.includes('fetch');

const isRateLimitError = (error: Error): boolean =>
  error.message.includes('rate limit') || error.status === 429;

const isModerationError = (error: Error): boolean =>
  error.message.includes('moderation') || error.status === 400;
```

### 3. Chat History Management

**Key Requirements:**
- Efficient storage for large conversation histories
- Context window management
- Conversation persistence
- Search and retrieval capabilities

**Implementation Pattern:**

```typescript
// Chat History Hook with TanStack Query
export const useChatHistory = (conversationId: string) => {
  return useQuery({
    queryKey: ['chat-history', conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!conversationId,
  });
};

// Optimistic updates for new messages
export const useSendMessage = (conversationId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (message: Omit<Message, 'id' | 'created_at'>) => {
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...message, conversationId })
      });
      
      if (!response.ok) throw new Error('Failed to send message');
      return response.json();
    },
    onMutate: async (newMessage) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['chat-history', conversationId] });
      
      // Snapshot the previous value
      const previousMessages = queryClient.getQueryData(['chat-history', conversationId]);
      
      // Optimistically update to the new value
      queryClient.setQueryData(['chat-history', conversationId], (old: any) => [
        ...old,
        { ...newMessage, id: 'temp-' + Date.now(), created_at: new Date().toISOString() }
      ]);
      
      return { previousMessages };
    },
    onError: (err, newMessage, context) => {
      // Rollback on error
      queryClient.setQueryData(['chat-history', conversationId], context?.previousMessages);
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['chat-history', conversationId] });
    },
  });
};
```

### 4. Loading States & Optimistic Updates

**UX Principles:**
- Show immediate feedback
- Maintain conversation flow
- Handle interruptions gracefully

**Implementation:**

```typescript
// Comprehensive Loading State Management
const ChatInterface = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);

  const handleSubmit = async (content: string) => {
    // Add user message immediately (optimistic)
    const userMessage = { role: 'user' as const, content, id: Date.now().toString() };
    setMessages(prev => [...prev, userMessage]);
    
    // Create placeholder for assistant message
    const assistantPlaceholder = { 
      role: 'assistant' as const, 
      content: '', 
      id: 'streaming-' + Date.now() 
    };
    setMessages(prev => [...prev, assistantPlaceholder]);
    
    setIsLoading(true);
    setIsStreaming(true);
    setStreamingContent('');

    try {
      await streamResponse(content, (chunk) => {
        setStreamingContent(prev => prev + chunk);
        setMessages(prev => 
          prev.map(msg => 
            msg.id === assistantPlaceholder.id 
              ? { ...msg, content: streamingContent + chunk }
              : msg
          )
        );
      });
    } catch (error) {
      // Replace placeholder with error message
      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantPlaceholder.id
            ? { ...msg, content: 'Failed to generate response. Please try again.' }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      setStreamingContent('');
    }
  };

  return (
    <div>
      {messages.map(message => (
        <MessageBubble 
          key={message.id}
          message={message}
          isStreaming={message.id.startsWith('streaming-') && isStreaming}
        />
      ))}
      
      {isLoading && (
        <LoadingIndicator 
          isStreaming={isStreaming}
          onCancel={() => {
            // Implement cancel logic
            setIsLoading(false);
            setIsStreaming(false);
          }}
        />
      )}
    </div>
  );
};
```

### 5. Rate Limiting & Abuse Prevention

**Multi-Layer Strategy:**

#### Frontend Rate Limiting
```typescript
// Client-side rate limiting
const useRateLimiter = (maxRequests = 10, windowMs = 60000) => {
  const requestTimestamps = useRef<number[]>([]);

  const isAllowed = useCallback(() => {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Remove old requests outside the window
    requestTimestamps.current = requestTimestamps.current.filter(
      timestamp => timestamp > windowStart
    );
    
    if (requestTimestamps.current.length >= maxRequests) {
      return false;
    }
    
    requestTimestamps.current.push(now);
    return true;
  }, [maxRequests, windowMs]);

  const getResetTime = useCallback(() => {
    if (requestTimestamps.current.length === 0) return 0;
    const oldestTimestamp = Math.min(...requestTimestamps.current);
    return oldestTimestamp + windowMs;
  }, [windowMs]);

  return { isAllowed, getResetTime };
};
```

#### Backend Rate Limiting (NestJS)
```typescript
// NestJS Rate Limiting with Express
import { rateLimit } from 'express-rate-limit';

const chatRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 requests per windowMs
  message: 'Too many chat requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  keyGenerator: (req) => {
    // More sophisticated: use user ID if authenticated, IP otherwise
    return req.user?.id || req.ip;
  },
});

// Apply to chat endpoints
@Controller('chat')
@UseGuards(JwtAuthGuard) // Authentication first
export class ChatController {
  @Post()
  @UseInterceptor(chatRateLimit)
  async chat(@Body() chatDto: ChatDto, @Req() req: Request) {
    // Chat logic here
  }
}
```

#### Abuse Detection Patterns
```typescript
// Input validation and abuse detection
const validateChatInput = (content: string) => {
  const patterns = [
    /\b(?:(?:https?|ftp):\/\/|www\.)[^\s/$.?#].[^\s]*\b/gi, // URLs
    /\b\d{3}-?\d{3}-?\d{4}\b/g, // Phone numbers
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Emails
  ];

  const suspiciousPatterns = [
    /(ignore|disregard|forget).+(previous|earlier|above)/gi, // Prompt injection
    /(you are|act as|pretend to be).+(assistant|ai|chatbot)/gi, // Role play attempts
  ];

  // Check for PII
  const hasPII = patterns.some(pattern => pattern.test(content));
  
  // Check for suspicious patterns
  const hasSuspiciousPatterns = suspiciousPatterns.some(pattern => 
    pattern.test(content)
  );

  return {
    isValid: !hasPII && !hasSuspiciousPatterns,
    issues: [
      ...(hasPII ? ['Contains potentially sensitive information'] : []),
      ...(hasSuspiciousPatterns ? ['Suspicious pattern detected'] : []),
    ]
  };
};
```

### 6. Context Management for Multi-Turn Conversations

**Context Window Strategy:**

```typescript
// Smart context window management
export const useContextManager = (maxTokens: number = 4000) => {
  const getContextMessages = (allMessages: Message[]): Message[] => {
    // Always include system message
    const systemMessage = allMessages[0];
    const conversationMessages = allMessages.slice(1);
    
    let selectedMessages: Message[] = [systemMessage];
    let currentTokens = estimateTokens(systemMessage.content);
    
    // Add recent messages, prioritizing user messages
    const recentMessages = [...conversationMessages].reverse();
    
    for (const message of recentMessages) {
      const messageTokens = estimateTokens(message.content);
      
      if (currentTokens + messageTokens > maxTokens) {
        // If we can't fit this message, we might need smarter truncation
        // For now, break and keep what we have
        break;
      }
      
      selectedMessages.unshift(message);
      currentTokens += messageTokens;
    }
    
    return selectedMessages;
  };

  const estimateTokens = (text: string): number => {
    // Rough estimation: ~4 characters per token
    // For production, use a proper tokenizer
    return Math.ceil(text.length / 4);
  };

  return { getContextMessages };
};
```

## Recommended Libraries & Patterns

### Frontend (React + TypeScript)

1. **Vercel AI SDK** - Primary choice for React chat interfaces
   ```bash
   npm install @ai-sdk/react @ai-sdk/openai
   ```

2. **Assistant UI** - Production-ready chat components
   ```bash
   npm install @assistant-ui/react @assistant-ui/react-ai-sdk
   ```

3. **TanStack Query** - For chat history and caching
   ```bash
   npm install @tanstack/react-query
   ```

### Backend (NestJS)

1. **@nestjs/websockets** - For WebSocket support (if needed)
2. **@nestjs/event-emitter** - For internal event handling
3. **express-rate-limit** - For rate limiting
4. **@nestjs/throttler** - Built-in throttling support

## Production Checklist

### Performance Requirements
- [ ] TTFT (Time To First Token) < 700ms
- [ ] Streaming cadence > 10 tokens/second
- [ ] Graceful degradation when streaming fails
- [ ] Connection timeout handling
- [ ] Reconnection with exponential backoff

### Error Handling
- [ ] Network error retry logic (3 attempts max)
- [ ] Rate limit detection and user feedback
- [ ] Content moderation error handling
- [ ] Timeout management (30s default)
- [ ] Cancel functionality for long responses

### Security
- [ ] Input sanitization and validation
- [ ] Rate limiting per user/IP
- [ ] PII detection and blocking
- [ ] Prompt injection protection
- [ ] CSRF protection for chat endpoints

### UX Requirements
- [ ] Optimistic UI updates
- [ ] Loading states with cancel option
- [ ] Error states with retry buttons
- [ ] Conversation history persistence
- [ ] Context window management
- [ ] Mobile-responsive design

### Monitoring & Analytics
- [ ] Token usage tracking
- [ ] Error rate monitoring
- [ ] Performance metrics (TTFT, throughput)
- [ ] User satisfaction tracking
- [ ] Abuse detection alerts

## Common Pitfalls to Avoid

1. **Don't wait for complete responses** - Always stream
2. **Don't ignore error states** - Implement comprehensive error handling
3. **Don't skip rate limiting** - Prevent abuse and manage costs
4. **Don't ignore context windows** - Implement smart truncation
5. **Don't forget mobile users** - Test touch interactions and mobile performance
6. **Don't skip testing** - Test with different roles, content, and network conditions

## Next Steps for Implementation

1. **Start with Vercel AI SDK** - Provides built-in streaming and error handling
2. **Add Assistant UI** - For production-ready components
3. **Implement rate limiting** - Both frontend and backend
4. **Set up monitoring** - Track performance and usage
5. **Test thoroughly** - Include edge cases and error scenarios
6. **Deploy gradually** - Start with beta users and iterate

This foundation provides a robust starting point for production AI chat interfaces that can scale and handle real-world usage patterns.
