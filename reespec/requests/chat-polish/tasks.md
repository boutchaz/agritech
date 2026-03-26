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

- [ ] **RED** — Write `agritech-api/src/modules/chat/prompt/follow-up.service.spec.ts`: test `parseSuggestions(text)` extracts suggestions from `---SUGGESTIONS---\n["a","b","c"]`. Test it strips the block. Test empty array when no block present. Run `npx jest follow-up` → fails.
- [ ] **ACTION** — Create `follow-up.service.ts` with `parseSuggestions()`. Update `PromptBuilderService.buildSystemPrompt()` to instruct AI to append suggestions block. Update `ChatResponseDto` to include `suggestions: string[]`. Update `ChatService.sendMessage()` and `sendMessageStream()` to call `parseSuggestions()`. Deliver suggestions in SSE `done` event for streaming.
- [ ] **GREEN** — Run `npx jest follow-up` → passes. Run `npx jest chat` → all pass.

### 12. Frontend: Add suggestions to API types and useStreamMessage

- [ ] **RED** — Grep for "suggestions" in `project/src/lib/api/chat.ts` and `project/src/hooks/useChat.ts` → not found.
- [ ] **ACTION** — Add `suggestions?: string[]` to `ChatResponse` type. Update `sendMessageStream` to parse suggestions from SSE `done` event. Add `streamSuggestions` state to `useStreamMessage`. Add `suggestions` to `ChatMessage` interface.
- [ ] **GREEN** — Grep "suggestions" in both files → found. `cd project && npx tsc --noEmit` → clean.

## Phase 4: Frontend Decomposition

### 13. Extract MessageBubble components (UserMessage + AssistantMessage)

- [ ] **RED** — Write `project/src/components/Chat/__tests__/MessageBubble.test.tsx`: test UserMessage renders text + avatar. Test AssistantMessage renders markdown. Test AssistantMessage shows TTS button. Run `npx vitest run --testPathPattern=MessageBubble` → fails.
- [ ] **ACTION** — Create `project/src/components/Chat/UserMessage.tsx` and `AssistantMessage.tsx`. Extract from ChatInterface.tsx. AssistantMessage includes markdown parsing, deep links, TTS controls.
- [ ] **GREEN** — Run `npx vitest run --testPathPattern=MessageBubble` → passes. `npx tsc --noEmit` → clean.

### 14. Extract ChatInput component

- [ ] **RED** — Write `project/src/components/Chat/__tests__/ChatInput.test.tsx`: test renders input + send button. Test Enter calls onSend. Test disabled when empty or loading. Run `npx vitest run --testPathPattern=ChatInput` → fails.
- [ ] **ACTION** — Create `project/src/components/Chat/ChatInput.tsx`. Extract input area from ChatInterface.tsx. Props: `onSend`, `isLoading`, `voiceMode`, `isListening`, voice callbacks.
- [ ] **GREEN** — `npx vitest run --testPathPattern=ChatInput` → passes. `npx tsc --noEmit` → clean.

### 15. Extract WelcomeState, SuggestionChips, FollowUpSuggestions

- [ ] **RED** — Write `project/src/components/Chat/__tests__/Suggestions.test.tsx`: test WelcomeState renders chips. Test FollowUpSuggestions renders clickable chips. Test clicking chip calls onSend. Run `npx vitest run --testPathPattern=Suggestions` → fails.
- [ ] **ACTION** — Create `WelcomeState.tsx`, `SuggestionChips.tsx`, `FollowUpSuggestions.tsx`. FollowUpSuggestions takes `suggestions: string[]` and `onSend`.
- [ ] **GREEN** — `npx vitest run --testPathPattern=Suggestions` → passes. `npx tsc --noEmit` → clean.

### 16. Reassemble ChatInterface with extracted components

- [ ] **RED** — `wc -l project/src/components/Chat/ChatInterface.tsx` > 400. Assertion: still monolithic.
- [ ] **ACTION** — Rewrite ChatInterface.tsx to compose extracted components. Retain state orchestration. Wire FollowUpSuggestions to last assistant message's suggestions. < 150 lines target.
- [ ] **GREEN** — `wc -l ChatInterface.tsx` < 150. `npx tsc --noEmit` → clean. `npx vitest run --testPathPattern=Chat` → all pass. Manual smoke: send message → streamed response → follow-up chips → voice mode works.

## Phase 5: Structured Data Cards

### 17. Create data card components

- [ ] **RED** — Write `project/src/components/Chat/__tests__/DataCards.test.tsx`: test RecommendationCard renders constat + action + priority badge. Test DiagnosticCard renders scenario code + zone. Test FarmSummaryCard renders counts. Test invalid JSON → code block fallback. Run `npx vitest run --testPathPattern=DataCards` → fails.
- [ ] **ACTION** — Create cards in `project/src/components/Chat/cards/`: `RecommendationCard.tsx`, `DiagnosticCard.tsx`, `FarmSummaryCard.tsx`, `PlanCalendarCard.tsx`, `StockAlertCard.tsx`, `FinancialCard.tsx`. Each uses shadcn Card + Badge + icons.
- [ ] **GREEN** — `npx vitest run --testPathPattern=DataCards` → passes. `npx tsc --noEmit` → clean.

### 18. Parse and render data cards in AssistantMessage

- [ ] **RED** — Write test: response with ` ```json:recommendation-card\n{...}\n``` ` renders RecommendationCard. Unknown type → code block. Mixed text + card → correct order. Run `npx vitest run --testPathPattern=AssistantMessage` → new tests fail.
- [ ] **ACTION** — Update AssistantMessage to detect `json:TYPE` code blocks and render matching cards via a `cardRegistry` map. Invalid JSON or unknown types fall through to code block.
- [ ] **GREEN** — `npx vitest run --testPathPattern=AssistantMessage` → all pass. `npx tsc --noEmit` → clean.

### 19. Instruct AI to use data card format

- [ ] **RED** — Grep `buildSystemPrompt` for "json:recommendation-card" → not found.
- [ ] **ACTION** — Add card format instructions to system prompt: explain `json:TYPE` convention with examples for recommendation-card, diagnostic-card, farm-summary, plan-calendar. Instruct AI to use cards when presenting recommendations, diagnostics, plans, and summaries.
- [ ] **GREEN** — Grep → found. `npx jest prompt-builder` → passes. Manual test: ask "recommendations for parcelle azef" → response contains card blocks.

## Phase 6: Context Summarization

### 20. Create ContextSummarizer service

- [ ] **RED** — Write `agritech-api/src/modules/chat/context/context-summarizer.service.spec.ts`: test `summarizeFarms()` with sample data → string without UUIDs, under 200 tokens. Test empty data → "No farms registered." Test `summarizeAgromindiaIntel()` produces concise scenario + recommendation summary. Run `npx jest context-summarizer` → fails.
- [ ] **ACTION** — Create `context-summarizer.service.ts`. Implement per-module summarizers plus `summarizeAgromindiaIntel()`. Strip UUIDs, merge counts with descriptions, prioritize actionable info.
- [ ] **GREEN** — `npx jest context-summarizer` → passes.

### 21. Integrate ContextSummarizer into PromptBuilder

- [ ] **RED** — Grep `prompt-builder.service.ts` for `farms_recent.map` → found (raw dump still used).
- [ ] **ACTION** — Update PromptBuilder to use `ContextSummarizer.summarizeAll(context)` instead of raw context sections.
- [ ] **GREEN** — Grep for `farms_recent.map` → not found. `npx jest prompt-builder` → passes. `npx jest chat` → all pass. Manual test: verify response quality maintained.

## Phase 7: Final Verification

### 22. Full integration test

- [ ] **RED** — Run all backend chat tests: `npx jest --testPathPattern=chat`. Run all frontend chat tests: `npx vitest run --testPathPattern=Chat`. Note state.
- [ ] **ACTION** — Fix any remaining issues. Run `npx tsc --noEmit` in both projects. Verify ChatModule registers all providers correctly.
- [ ] **GREEN** — All tests pass. Both `tsc --noEmit` clean. End-to-end manual test: ask about a parcel → get response with AgromindIA intelligence (diagnostic scenario, pending recommendations, annual plan) rendered as data cards with follow-up suggestions. Voice mode works. Streaming works.
