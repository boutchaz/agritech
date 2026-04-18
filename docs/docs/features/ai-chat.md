---
sidebar_position: 11
title: "AI Chat & LLM Providers"
---

# AI Chat & LLM Providers

## Overview

The AI Chat system provides a conversational interface where authenticated users can ask questions about their farm operations, workforce, accounting, inventory, and more. The backend gathers real-time context from all organization modules, constructs a rich prompt, and sends it to the Z.ai GLM-4.5-Flash model for response generation. The frontend supports text input, voice input via the Web Speech API, and text-to-speech output through both browser-native speech synthesis and the Z.ai GLM-TTS service.

All chat endpoints are scoped to an organization (`/organizations/:organizationId/chat`) and require JWT authentication. Conversation history is persisted per user per organization in the `chat_conversations` Supabase table.

## Architecture

```
Frontend (React)                         Backend (NestJS)
┌─────────────────┐                     ┌──────────────────────┐
│  ChatInterface   │──── POST /chat ───>│  ChatController      │
│  useChat hook    │                     │    ├─ ChatService     │
│  useVoiceInput   │<── ChatResponseDto │    │   ├─ ZaiProvider  │
│  useTextToSpeech │                     │    │   ├─ ZaiTTSProv. │
│  useZaiTTS       │── POST /chat/tts ─>│    │   └─ WeatherProv.│
│                  │<── audio/wav ──────│    └─ DatabaseService │
└─────────────────┘                     └──────────────────────┘
```

## LLM Providers

The platform defines a provider abstraction through `BaseAIProvider` (abstract class) and the `IAIProvider` interface. Four provider implementations exist for AI report generation, while the chat module specifically uses Z.ai.

### Provider Summary

| Provider | Default Model | API Endpoint | Env Variable | Timeout | Response Format |
|----------|--------------|--------------|--------------|---------|----------------|
| **Z.ai** | `GLM-4.5-Flash` | `open.bigmodel.cn/api/paas/v4/chat/completions` | `ZAI_API_KEY` | 3 min (chat), 5 min (reports) | Plain text |
| **OpenAI** | `gpt-4o` | `api.openai.com/v1/chat/completions` | `OPENAI_API_KEY` | 2 min | JSON object |
| **Gemini** | `gemini-1.5-pro` | `generativelanguage.googleapis.com/v1beta` | `GOOGLE_AI_API_KEY` | 2 min | JSON (via `responseMimeType`) |
| **Groq** | `llama-3.3-70b-versatile` | `api.groq.com/openai/v1/chat/completions` | `GROQ_API_KEY` | 2 min | JSON object |

### BaseAIProvider

All providers extend `BaseAIProvider`, which provides:

- **Dynamic API key injection** via `setApiKey()` -- allows per-organization keys from settings, falling back to environment variables.
- **Message building** -- constructs `[system, user]` message arrays.
- **Error handling** -- standardized logging and re-throw via `handleError()`.

### Z.ai Authentication

Z.ai uses a custom JWT-based authentication scheme. The API key is in `id.secret` format. The provider splits it, then signs a JWT with HS256 containing `api_key`, `exp` (1 hour), and `timestamp` fields, with a custom `sign_type: 'SIGN'` header.

### Z.ai Chat Provider (Chat Module)

The chat-specific Z.ai provider (`agritech-api/src/modules/chat/providers/zai.provider.ts`) extends the base but adds:

- **Retry with exponential backoff** -- up to 3 retries with `1s -> 2s -> 4s` delays. Only retries on network/5xx errors, not 4xx client errors.
- **Simulated streaming** -- `generateStream()` splits the full response into words and emits them with 50ms delays for a typing effect.

## Chat API Endpoints

All endpoints are under `POST/GET/DELETE /api/v1/organizations/:organizationId/chat` and require `JwtAuthGuard`.

### `POST /chat` -- Send Message

Rate-limited to **10 requests per minute** per user (via `@Throttle`).

**Request body** (`SendMessageDto`):

```typescript
{
  query: string;           // Required -- the user's question
  language?: 'en' | 'fr' | 'ar';  // Response language (default: 'en')
  save_history?: boolean;  // Persist to conversation history (default: true)
}
```

**Response** (`ChatResponseDto`):

```typescript
{
  response: string;          // AI-generated answer
  context_summary: {
    organization: string;
    farms_count: number;
    parcels_count: number;
    workers_count: number;
    pending_tasks: number;
    recent_invoices: number;
    inventory_items: number;
    recent_harvests: number;
  };
  metadata: {
    provider: string;        // 'zai'
    model: string;           // 'GLM-4.5-Flash'
    tokensUsed?: number;
    timestamp: Date;
  };
}
```

**Processing flow:**

1. Verify the user has access to the organization.
2. Load the last 10 conversation messages for context continuity.
3. Build organization context by querying all modules in parallel (farms, parcels, crop cycles, workers, tasks, accounting, inventory, production, suppliers/customers, campaigns, reception batches, compliance, utilities, reports, marketplace, orchards, satellite indices, weather, soil analysis).
4. Construct a system prompt defining the AI as an expert agricultural consultant.
5. Construct a user prompt combining the query, full context JSON, conversation history, and target language.
6. Check the in-memory response cache (keyed by `organizationId:query`).
7. If cache miss, call Z.ai GLM-4.5-Flash with `temperature: 0.7`, `maxTokens: 8192`.
8. Cache the response and persist both user and assistant messages to `chat_conversations`.

### `GET /chat/history` -- Get Conversation History

**Query params:**
- `limit` (optional, number) -- max messages to retrieve.

Returns `{ messages: ChatMessage[], total: number }` ordered by `created_at` ascending.

### `DELETE /chat/history` -- Clear History

Deletes all conversation records for the user in the organization. Returns `{ success: true }`.

### `POST /chat/tts` -- Text to Speech

Converts text to audio using Z.ai GLM-TTS.

**Request body:**

```typescript
{
  text: string;              // Required
  language?: string;         // Default: 'fr'
  voice?: string;            // Z.ai voices: tongtong, xiaochen, chuichui, jam, kazi, douji, luodo
  speed?: number;            // 0.5 to 2.0 (default: 0.95)
}
```

**Response:** Binary audio data (`audio/wav`) streamed directly to the client.

The TTS provider sends requests to `open.bigmodel.cn/api/paas/v4/audio/speech` using the `glm-tts` model with volume set to 6 (out of 10) and WAV output format.

## Context Gathering

The `ChatService.buildOrganizationContext()` method queries all business modules in parallel and assembles a `BuiltContext` object. The context includes but is not limited to:

| Module | Data Gathered |
|--------|--------------|
| **Organization** | Name, currency, timezone, account type, active users count |
| **Farms** | Farm list, parcels with crop/soil/irrigation info, crop cycles with phenological stages, structures |
| **Workers** | Worker counts (active/total), recent tasks, work records with payment status |
| **Accounting** | Chart of accounts, recent invoices, payments, current fiscal year |
| **Inventory** | Items with stock levels, warehouses, low-stock alerts, total inventory value |
| **Production** | Recent harvests, quality checks, deliveries |
| **Suppliers/Customers** | Supplier/customer lists, pending sales/purchase orders |
| **Campaigns** | Active and planned campaigns with priorities |
| **Reception Batches** | Recent batches with quality grades |
| **Compliance** | Certifications (active/expiring), compliance checks |
| **Utilities** | Utility bills with payment status |
| **Reports** | AI-generated report history |
| **Marketplace** | Active listings, orders, quote requests |
| **Orchards** | Orchard assets, tree categories, pruning tasks |
| **Satellite/Weather** | NDVI/NDMI/NDRE indices, weather history, 5-day forecasts (via OpenWeatherMap) |
| **Soil Analysis** | Soil analysis results per parcel |

The system prompt instructs the AI to act as an expert agricultural consultant with deep knowledge of Mediterranean/North African farming, precision agriculture, remote sensing interpretation, and all platform modules.

## Voice Input/Output

### Voice Input (Web Speech API)

The `useVoiceInput` hook wraps the browser's `SpeechRecognition` API.

- **Supported languages:** English (`en-US`), French (`fr-FR`), Arabic (`ar-SA`).
- **Two modes:**
  - **Manual mode** -- press the mic button to start/stop. Transcribed text appends to the input field.
  - **Voice mode** -- continuous listening. When speech pauses, the transcript auto-sends after 500ms. After the AI responds (and TTS finishes), listening restarts automatically.
- Exposes `isListening`, `transcript`, `interimTranscript`, `startListening`, `stopListening`, `resetTranscript`.

### Text-to-Speech Output

Two TTS systems are available, with browser TTS as primary and Z.ai as fallback:

**Browser TTS** (`useTextToSpeech` hook):
- Uses the `SpeechSynthesis` Web API.
- Configurable language, rate (default 0.95), pitch, and volume.
- Exposes `speak()`, `stop()`, `pause()`, `resume()`.

**Z.ai TTS** (`useZaiTTS` hook):
- Calls the backend `POST /chat/tts` endpoint.
- Receives audio as a `Blob`, creates an `HTMLAudioElement` to play it.
- Falls back to browser TTS on error.
- Voice selection by language: `kazi` for Arabic, `jam` for French and English.

In **voice mode**, AI responses are automatically read aloud. Each assistant message includes a speaker icon button to manually trigger or stop playback.

## Organization-Level AI Settings

The LLM provider system supports per-organization API keys through the `setApiKey()` method on `BaseAIProvider`. When the chat service processes a request, it retrieves the API key from environment configuration (`ZAI_API_KEY`). The architecture allows injecting organization-specific keys if stored in organization settings, enabling different organizations to use their own API quotas.

The weather provider also uses a per-environment key (`OPENWEATHER_API_KEY`) and includes utilities for coordinate conversion (Web Mercator to WGS84) and centroid calculation from parcel boundary polygons.

## Frontend Chat Interface

The chat page is a protected route at `/_authenticated/(core)/chat`, guarded by `withRouteProtection(ChatPage, 'read', 'Chat')` (CASL permission check).

### Key UI Features

- **Message bubbles** with user/assistant avatars (Bot and User icons from Lucide).
- **Loading stages** -- progressive status messages: "Analyzing your question..." -> "Loading data..." -> "Generating response...".
- **Conversation history** -- loaded on mount via `useChatHistory` (React Query), merged with optimistic local updates using content+timestamp matching (5-second window).
- **Clear history** button in the header.
- **i18n support** -- all UI strings use `react-i18next` with keys under the `chat.*` namespace.
- **Error handling** -- contextual error messages for network issues, API key problems, and organization errors.

### React Query Integration

The `useChat` hook module provides three hooks:

| Hook | Type | Query Key |
|------|------|-----------|
| `useSendMessage` | `useMutation` | Invalidates `['chat-history', orgId]` on success |
| `useChatHistory` | `useQuery` | `['chat-history', orgId, limit]`, `staleTime: 0` |
| `useClearChatHistory` | `useMutation` | Removes + invalidates + refetches `['chat-history', orgId]` |

## Key File Paths

### Backend (NestJS API)

| File | Purpose |
|------|---------|
| `agritech-api/src/modules/chat/chat.module.ts` | Module registration (ChatService, ZaiProvider, ZaiTTSProvider, WeatherProvider) |
| `agritech-api/src/modules/chat/chat.controller.ts` | REST endpoints with Swagger decorators and rate limiting |
| `agritech-api/src/modules/chat/chat.service.ts` | Core logic: context gathering, prompt building, response caching, history persistence |
| `agritech-api/src/modules/chat/dto/send-message.dto.ts` | Input validation (query, language, save_history) |
| `agritech-api/src/modules/chat/dto/chat-response.dto.ts` | Response shape (response, context_summary, metadata) |
| `agritech-api/src/modules/chat/providers/zai.provider.ts` | Z.ai chat provider with retry logic and simulated streaming |
| `agritech-api/src/modules/chat/providers/zai-tts.provider.ts` | Z.ai GLM-TTS text-to-speech provider |
| `agritech-api/src/modules/chat/providers/weather.provider.ts` | OpenWeatherMap forecast provider with coordinate utilities |

### AI Report Providers (Shared)

| File | Purpose |
|------|---------|
| `agritech-api/src/modules/ai-reports/providers/base-ai.provider.ts` | Abstract base class with dynamic API key support |
| `agritech-api/src/modules/ai-reports/providers/openai.provider.ts` | OpenAI GPT-4o provider |
| `agritech-api/src/modules/ai-reports/providers/gemini.provider.ts` | Google Gemini 1.5 Pro provider |
| `agritech-api/src/modules/ai-reports/providers/groq.provider.ts` | Groq Llama 3.3 70B provider |
| `agritech-api/src/modules/ai-reports/providers/zai.provider.ts` | Z.ai provider for AI reports |
| `agritech-api/src/modules/ai-reports/interfaces/ai-provider.interface.ts` | `AIProvider` enum and interfaces |

### Frontend (React)

| File | Purpose |
|------|---------|
| `project/src/components/Chat/ChatInterface.tsx` | Main chat UI component with voice mode |
| `project/src/hooks/useChat.ts` | React Query hooks (useSendMessage, useChatHistory, useClearChatHistory) |
| `project/src/hooks/useVoiceInput.ts` | Web Speech API voice recognition hook |
| `project/src/hooks/useTextToSpeech.ts` | Browser SpeechSynthesis TTS hook |
| `project/src/hooks/useZaiTTS.ts` | Z.ai server-side TTS hook |
| `project/src/lib/api/chat.ts` | API client functions for chat endpoints |
| `project/src/routes/_authenticated/(core)/chat.tsx` | Chat page route with CASL protection |

## Environment Variables

| Variable | Required For | Description |
|----------|-------------|-------------|
| `ZAI_API_KEY` | Chat + TTS | Z.ai API key in `id.secret` format |
| `OPENAI_API_KEY` | AI Reports | OpenAI API key |
| `GOOGLE_AI_API_KEY` | AI Reports | Google Gemini API key |
| `GROQ_API_KEY` | AI Reports | Groq API key |
| `OPENWEATHER_API_KEY` | Weather context | OpenWeatherMap API key for forecast data |
