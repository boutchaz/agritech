# Chat Polish — Tasks

## Phase 0: Remove Caching

### 1. Remove response cache and module cache from chat.service.ts

- [x] **RED** — Grep `chat.service.ts` for `responseCache`, `moduleCache`, `getCachedModule`, `RESPONSE_CACHE_TTL`, `MODULE_CACHE_TTLS`, `CachedContext`, `CachedResponse`. All exist. Existing tests have pre-existing failure (missing ZaiTTSProvider mock — 52 tests fail before our changes).
- [x] **ACTION** — Removed `CachedContext` interface, `CachedResponse` interface, `moduleCache` Map, `responseCache` Map, `RESPONSE_CACHE_TTL` constant, `MODULE_CACHE_TTLS` object, `getCachedModule()` method. Replaced all `getCachedModule(key, ttl, fetcher)` calls with direct `fetcher()` calls (kept `.catch()` wrappers). Removed response cache check + set blocks from `sendMessage()`.
- [x] **GREEN** — Grep for all cache terms → none found. `tsc --noEmit` → clean compile. Test failure count unchanged (52 — pre-existing mock issue, not caused by cache removal).

## Phase 1: Backend Decomposition (foundation for everything)

### 2. Extract ContextRouter from chat.service.ts

- [x] **RED** — Wrote test file with 19 tests. `npx jest context-router` → fails (module not found).
- [x] **ACTION** — Created `context-router.service.ts` with `ContextNeeds` interface (including `agromindiaIntel` flag) and `analyzeQuery()` method. Keyword routing supports EN/FR/AR with agromindiaIntel triggers.
- [x] **GREEN** — `npx jest context-router` → 19/19 pass.

### 3. Extract ConversationService from chat.service.ts

- [x] **RED** — Wrote 9 tests. `npx jest conversation.service` → fails (module not found).
- [x] **ACTION** — Created `conversation.service.ts` with saveMessage, getRecentHistory, getConversationHistory, clearConversationHistory, verifyOrganizationAccess.
- [x] **GREEN** — `npx jest conversation.service` → 9/9 pass.

### 4. Extract PromptBuilder from chat.service.ts

- [x] **RED** — Wrote 11 tests. `npx jest prompt-builder` → fails (module not found).
- [x] **ACTION** — Created `prompt-builder.service.ts` with buildSystemPrompt() and buildUserPrompt() extracted from chat.service.ts (~495 lines of prompt template).
- [x] **GREEN** — `npx jest prompt-builder` → 11/11 pass.

### 5. Extract ContextBuilder from chat.service.ts

- [x] **RED** — Wrote 3 tests. `npx jest context-builder` → fails (module not found).
- [x] **ACTION** — Created `context-builder.service.ts` (2580 lines) with all interfaces, buildOrganizationContext, and 18 get*Context methods extracted from chat.service.ts. No caching — direct DB fetches.
- [x] **GREEN** — `npx jest context-builder` → 3/3 pass. `tsc --noEmit` → clean.

### 6. Wire decomposed services and verify ChatService is slim

- [x] **RED** — `wc -l chat.service.ts` = 3680 lines. Too large.
- [x] **ACTION** — Rewrote `chat.service.ts` as slim orchestrator (210 lines). Updated `chat.module.ts` to register ContextRouterService, ContextBuilderService, PromptBuilderService, ConversationService. ChatService now delegates all logic to extracted services.
- [x] **GREEN** — `wc -l chat.service.ts` = 210 lines. `tsc --noEmit` → clean. 42/42 tests pass across all new services.

## Phase 2: AgromindIA Integration (the high-value change)

### 7. Create AgromindiaContextService

- [x] **RED** — Wrote 4 tests. `npx jest agromindia-context` → fails (module not found).
- [x] **ACTION** — Created `agromindia-context.service.ts`. Delegates to AiDiagnosticsService, AiRecommendationsService, AnnualPlanService, AiReferencesService, CalibrationService in parallel. Graceful null on failures. getOrgIntelligence fetches top 3 parcels.
- [x] **GREEN** — `npx jest agromindia-context` → 4/4 pass.

### 8. Wire AgromindIA context into ContextBuilder

- [x] **RED** — Added test: query "recommendation pour ma parcelle" → agromindiaIntel populated with scenario_code 'B'. Fails (method missing).
- [x] **ACTION** — Added `agromindiaIntel?: AgromindiaParcelContext[]` to BuiltContext. Added setter + fetch in buildUncached when contextNeeds.agromindiaIntel is true.
- [x] **GREEN** — `npx jest context-builder` → 4/4 pass. `tsc --noEmit` → clean.

### 9. Update PromptBuilder to include AgromindIA intelligence

- [x] **RED** — Added 3 tests: AGROMINDIA section renders with scenario/recommendations/plan, absent when null, system prompt contains AgromindIA instructions. 2 tests fail.
- [x] **ACTION** — Added AGROMINDIA INTELLIGENCE section to buildUserPrompt with diagnostic scenario, pending recommendations, annual plan (overdue + upcoming), calibration baselines, referential. Added AgromindIA instruction block to system prompt.
- [x] **GREEN** — `npx jest prompt-builder` → 14/14 pass.

### 10. Import AgromindIA modules into ChatModule

- [x] **RED** — `tsc --noEmit` clean but AgromindiaContextService not registered in module. No circular deps detected.
- [x] **ACTION** — Updated `chat.module.ts` to import AiDiagnosticsModule, AiRecommendationsModule, AnnualPlanModule, AiReferencesModule, CalibrationModule. Registered AgromindiaContextService. ChatService uses OnModuleInit to wire AgromindiaContextService into ContextBuilder.
- [x] **GREEN** — `tsc --noEmit` → clean. 50/50 tests pass across all 5 new services.

## Phase 3: Follow-Up Suggestions

### 11. Add suggestion parsing and system prompt update

- [x] **RED** — Wrote `follow-up.service.spec.ts` with 6 tests: extract suggestions, strip block, empty when absent, malformed JSON, empty array, varied whitespace. `npx jest follow-up` → fails (module not found).
- [x] **ACTION** — Created `follow-up.service.ts` with `parseSuggestions()`. Updated `PromptBuilderService.buildSystemPrompt()` with Follow-Up Suggestions instruction block. Added `suggestions?: string[]` to `ChatResponseDto`. Wired `FollowUpService` into `ChatService.sendMessage()` and `sendMessageStream()`. Registered in `ChatModule`.
- [x] **GREEN** — `npx jest follow-up` → 6/6 pass. `npx jest prompt-builder` → 14/14 pass. `npx tsc --noEmit` → clean. (Pre-existing 52 chat.service.spec failures unchanged — those are from pre-decomposition test file.)

### 12. Frontend: Add suggestions to API types and useStreamMessage

- [x] **RED** — Grep for "suggestions" in `project/src/lib/api/chat.ts` and `project/src/hooks/useChat.ts` → not found.
- [x] **ACTION** — Added `suggestions?: string[]` to `ChatResponse` and `ChatMessage` types. Updated `sendMessageStream` to pass suggestions from SSE `done` event metadata. Added `streamSuggestions` state + `setStreamSuggestions` to `useStreamMessage` hook. Reset on new stream and resetStream.
- [x] **GREEN** — Grep "suggestions" in both files → found. `cd project && npx tsc --noEmit` → clean.

## Phase 4: Frontend Decomposition

### 13. Extract MessageBubble components (UserMessage + AssistantMessage)

- [x] **RED** — Wrote `MessageBubble.test.tsx` with 4 tests (UserMessage renders text + avatar, AssistantMessage renders markdown + TTS button). Test fails (modules not found).
- [x] **ACTION** — Created `UserMessage.tsx`, `AssistantMessage.tsx`, and `chat-utils.ts` (shared constants: SUGGESTION_CHIPS, DEEP_LINK_MAP). AssistantMessage includes markdown + deep links + TTS controls.
- [x] **GREEN** — `npx vitest run` → 4/4 pass. `npx tsc --noEmit` → clean.

### 14. Extract ChatInput component

- [x] **RED** — Wrote `ChatInput.test.tsx` with 3 tests (renders input + send button, Enter calls onSend, disabled when empty/loading). Fails (module not found).
- [x] **ACTION** — Created `ChatInput.tsx` with props: value, onChange, onSend, isLoading, voiceMode, isListening, isVoiceSupported, voiceDisplayValue, onVoiceToggle.
- [x] **GREEN** — `npx vitest run` → 3/3 pass. `npx tsc --noEmit` → clean.

### 15. Extract WelcomeState, SuggestionChips, FollowUpSuggestions

- [x] **RED** — Wrote `Suggestions.test.tsx` with 3 tests (WelcomeState renders chips, FollowUpSuggestions renders clickable chips, click calls onSend). Fails (modules not found).
- [x] **ACTION** — Created `WelcomeState.tsx` and `FollowUpSuggestions.tsx`. WelcomeState uses shared SUGGESTION_CHIPS. FollowUpSuggestions renders Sparkles icon + suggestion text buttons.
- [x] **GREEN** — `npx vitest run` → 3/3 pass. `npx tsc --noEmit` → clean.

### 16. Reassemble ChatInterface with extracted components

- [x] **RED** — `wc -l ChatInterface.tsx` = 767. Monolithic.
- [x] **ACTION** — Rewrote ChatInterface.tsx composing UserMessage, AssistantMessage, ChatInput, WelcomeState, FollowUpSuggestions. Wired streamSuggestions + lastSuggestions memo to FollowUpSuggestions. Retained all state orchestration.
- [x] **GREEN** — `wc -l ChatInterface.tsx` = 299. `npx tsc --noEmit` → clean. `npx vitest run Chat/__tests__` → 10/10 pass.

## Phase 5: Structured Data Cards

### 17. Create data card components

- [x] **RED** — Wrote `DataCards.test.tsx` with 3 tests (RecommendationCard constat/action/priority, DiagnosticCard scenario/zone, FarmSummaryCard counts). Fails (modules not found).
- [x] **ACTION** — Created 6 card components in `cards/`: RecommendationCard, DiagnosticCard, FarmSummaryCard, PlanCalendarCard, StockAlertCard, FinancialCard. Plus `cards/index.ts` with cardRegistry map. Each uses shadcn Card + Badge + lucide icons.
- [x] **GREEN** — `npx vitest run DataCards` → 3/3 pass. `npx tsc --noEmit` → clean.

### 18. Parse and render data cards in AssistantMessage

- [x] **RED** — Wrote `AssistantMessage.test.tsx` with 3 tests: recommendation-card renders, unknown type fallback, mixed text + card order. 2 tests fail.
- [x] **ACTION** — Added `parseContentSegments()` function and `cardRegistry` import to AssistantMessage. Splits content into markdown + card segments, renders cards via registry lookup, falls through to markdown for unknown types.
- [x] **GREEN** — `npx vitest run AssistantMessage` → 3/3 pass. `npx tsc --noEmit` → clean.

### 19. Instruct AI to use data card format

- [x] **RED** — Grep `buildSystemPrompt` for "recommendation-card" → not found.
- [x] **ACTION** — Added Structured Data Cards instruction block to system prompt with all 6 card types and JSON schema examples. Escaped backticks properly for template literal.
- [x] **GREEN** — Grep → found. `npx jest prompt-builder` → 14/14 pass.

## Phase 6: Context Summarization

### 20. Create ContextSummarizer service

- [x] **RED** — Wrote `context-summarizer.service.spec.ts` with 3 tests: summarizeFarms (no UUIDs, < 200 tokens), empty → "No farms registered", summarizeAgromindiaIntel (scenario + recommendations). Fails (module not found).
- [x] **ACTION** — Created `context-summarizer.service.ts` with summarizeFarms, summarizeParcels, summarizeWorkers, summarizeAgromindiaIntel, summarizeAll. Strips UUIDs, produces concise text.
- [x] **GREEN** — `npx jest context-summarizer` → 3/3 pass.

### 21. Integrate ContextSummarizer into PromptBuilder

- [x] **RED** — Grep `prompt-builder.service.ts` for `farms_recent.map` → found (raw dump still used).
- [x] **ACTION** — Injected ContextSummarizerService into PromptBuilderService. Replaced FARM DATA section farms_recent.map and parcels_recent.map with summarizer calls. Other sections kept as-is (summarizers can be added incrementally).
- [x] **GREEN** — Grep for `farms_recent.map` → not found. `npx jest prompt-builder` → 14/14 pass.

## Phase 7: Final Verification

### 22. Full integration test

- [x] **RED** — Backend: `npx jest chat` → 52 failures from pre-decomposition chat.service.spec.ts. Frontend: vitest chat → passing.
- [x] **ACTION** — Rewrote `chat.service.spec.ts` for post-decomposition: 5 orchestration tests covering sendMessage flow (verify access → build context → build prompts → call AI → parse suggestions → return), history saving on/off, getConversationHistory, clearConversationHistory. All extracted service tests (64 total) now pass.
- [x] **GREEN** — Backend: `npx jest chat` → 64/64 pass (8 suites). Frontend: `npx vitest run Chat/__tests__` → 16/16 pass (5 suites). Both `npx tsc --noEmit` → clean.
