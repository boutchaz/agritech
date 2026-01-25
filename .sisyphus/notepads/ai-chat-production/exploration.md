# AI Chat Architecture Exploration

## Date: 2026-01-25

## Overview

The AI Chat feature is a conversational interface that allows users to query their agricultural data using natural language. It uses Z.ai (GLM-4.5-Flash) as the AI provider.

---

## 1. File Locations

### Frontend (project/)
| File | Purpose |
|------|---------|
| `src/routes/_authenticated/(core)/chat.tsx` | Chat page route with protection |
| `src/components/Chat/ChatInterface.tsx` | Main chat UI component (658 lines) |
| `src/lib/api/chat.ts` | API client for chat endpoints |
| `src/hooks/useChat.ts` | TanStack Query hooks for chat operations |
| `src/hooks/useVoiceInput.ts` | Web Speech API voice input hook |
| `src/hooks/useTextToSpeech.ts` | Browser TTS hook |
| `src/hooks/useZaiTTS.ts` | Z.ai TTS API hook |

### Backend (agritech-api/)
| File | Purpose |
|------|---------|
| `src/modules/chat/chat.module.ts` | NestJS module definition |
| `src/modules/chat/chat.controller.ts` | REST API endpoints |
| `src/modules/chat/chat.service.ts` | Core chat logic (2052 lines) |
| `src/modules/chat/providers/zai.provider.ts` | Z.ai API integration |
| `src/modules/chat/providers/zai-tts.provider.ts` | Z.ai TTS integration |
| `src/modules/chat/providers/weather.provider.ts` | Weather data provider |
| `src/modules/chat/dto/chat-response.dto.ts` | Response DTOs |

### Mobile (mobile/)
**NO CHAT IMPLEMENTATION** - Mobile app does not have chat functionality.

---

## 2. Architecture Overview

### Data Flow
```
User Input -> ChatInterface.tsx -> useChat.ts -> chatApi.ts -> NestJS Controller
                                                                    |
                                                                    v
                                                            ChatService.ts
                                                                    |
                                                    +---------------+---------------+
                                                    |               |               |
                                                    v               v               v
                                            Context Builder   AI Query Router   Z.ai Provider
                                                    |               |               |
                                                    v               v               v
                                            Supabase DB     analyzeQueryContextWithAI()   GLM-4.5-Flash
                                                    |               |               |
                                                    +---------------+---------------+
                                                                    |
                                                                    v
                                                            Response to User
```

### API Endpoints
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/organizations/:orgId/chat` | Send message, get AI response |
| GET | `/organizations/:orgId/chat/history` | Get conversation history |
| DELETE | `/organizations/:orgId/chat/history` | Clear conversation history |
| POST | `/organizations/:orgId/chat/tts` | Text-to-speech conversion |

---

## 3. State Management

### Frontend State
- **TanStack Query** for server state:
  - `['chat-history', organizationId, limit]` - Chat history cache
  - Mutations for send/clear with automatic invalidation
  - `staleTime: 0` - Always refetch when invalidated

- **Local React State** in ChatInterface:
  - `messages: ChatMessage[]` - Optimistic UI updates
  - `input: string` - Current input text
  - `voiceMode: boolean` - Voice chat toggle
  - Various refs for TTS/voice tracking

### Backend State
- **Database**: `chat_conversations` table stores history
- **No in-memory caching** - All context rebuilt per request

---

## 4. Identified Usability Issues

### Critical Issues
1. **NO STREAMING** - Responses are blocking; user waits for entire response
   - 180s timeout on Z.ai API calls
   - No progress indication beyond spinner
   - Large context = long wait times

2. **DOUBLE AI CALL PER MESSAGE** - Performance killer
   - First call: `analyzeQueryContextWithAI()` to route query (lines 509-672)
   - Second call: Actual response generation
   - Each message = 2x API latency

3. **MASSIVE CONTEXT BUILDING** - Every message rebuilds full context
   - 11 parallel database queries per message
   - Farm, worker, accounting, inventory, production, supplier/customer, satellite, weather, soil, alerts, forecast contexts
   - No caching between messages

### UX Issues
4. **No typing indicator** - Just a spinner, no "AI is thinking..."
5. **No message retry** - Failed messages can't be retried
6. **No message editing** - Can't edit sent messages
7. **No markdown rendering** - AI responses are plain text
8. **No code highlighting** - Technical responses look poor
9. **Voice mode complexity** - Multiple TTS systems (browser + Z.ai) with fallback logic

### Missing Production Features
10. **No rate limiting** on frontend
11. **No message length limits** displayed to user
12. **No conversation export**
13. **No conversation search**
14. **No mobile app support**

---

## 5. Performance Bottlenecks

### Backend Bottlenecks

#### 1. Double AI Call (CRITICAL)
```typescript
// Line 404: First AI call to route query
const contextNeeds = await this.analyzeQueryContextWithAI(query);

// Line 325: Second AI call for actual response
const response = await this.zaiProvider.generate({...});
```
**Impact**: 2x latency on every message

#### 2. Context Building (SEVERE)
```typescript
// Lines 418-483: 11 parallel DB queries
const [
  organizationContext,
  farmContext,
  workerContext,
  accountingContext,
  inventoryContext,
  productionContext,
  supplierCustomerContext,
  satelliteWeatherContext,
  soilAnalysisContext,
  productionIntelligenceContext,
] = await Promise.all([...]);
```
**Impact**: Even with parallel queries, this adds 100-500ms per message

#### 3. No Response Streaming
```typescript
// Line 77-91 in zai.provider.ts
const response = await axios.post(this.apiUrl, {...}, {
  timeout: 180000, // 3 minutes!
});
```
**Impact**: User waits for entire response, no progressive display

#### 4. Massive Prompt Size
```typescript
// Lines 1691-1934: buildUserPrompt() creates ~2000+ line prompt
// Includes ALL context data even if not relevant
```
**Impact**: More tokens = slower response + higher cost

### Frontend Bottlenecks

#### 1. No Optimistic Updates for History
```typescript
// Line 25-33 in useChat.ts
onSuccess: () => {
  queryClient.invalidateQueries({...});
  queryClient.refetchQueries({...}); // Unnecessary double fetch
},
```

#### 2. Message Merging Logic
```typescript
// Lines 105-146 in ChatInterface.tsx
// Complex timestamp-based merging on every history update
```

---

## 6. Error Handling Analysis

### Backend Error Handling
- **Good**: Specific error messages for common failures (API key, timeout, network)
- **Good**: Try-catch around all context loading with fallback to empty
- **Bad**: No retry logic for transient failures
- **Bad**: No circuit breaker for AI provider

### Frontend Error Handling
- **Good**: User-friendly error messages displayed in chat
- **Good**: Input restoration on error (non-voice mode)
- **Bad**: No retry button
- **Bad**: No offline detection
- **Bad**: No error boundary for component crashes

---

## 7. Recommendations for Production Readiness

### High Priority
1. **Implement streaming** - Use SSE or WebSocket for progressive responses
2. **Cache context** - Store context per session, invalidate on data changes
3. **Remove double AI call** - Use simpler routing or cache routing decisions
4. **Add retry logic** - Automatic retry with exponential backoff

### Medium Priority
5. **Add markdown rendering** - Use react-markdown for formatted responses
6. **Implement rate limiting** - Prevent abuse
7. **Add typing indicator** - Better UX during wait
8. **Mobile app support** - Add chat to mobile app

### Low Priority
9. **Conversation export** - PDF/text export
10. **Message search** - Search within conversations
11. **Message editing** - Edit sent messages

---

## 8. Database Schema

### chat_conversations table
```sql
- id: uuid
- organization_id: uuid (FK)
- user_id: uuid (FK)
- role: 'user' | 'assistant'
- content: text
- language: string
- metadata: jsonb
- created_at: timestamp
```

---

## 9. Security Considerations

- **Good**: JWT auth on all endpoints
- **Good**: Organization access verification
- **Good**: API key stored server-side only
- **Concern**: No input sanitization visible
- **Concern**: No PII filtering in AI context

---

## Summary

The chat feature is functional but has significant performance issues that make it "barely usable" as reported:

1. **Double AI call** adds unnecessary latency
2. **No streaming** means long waits with no feedback
3. **Full context rebuild** on every message is wasteful
4. **No mobile support** limits accessibility

The architecture is sound but needs optimization for production use.
