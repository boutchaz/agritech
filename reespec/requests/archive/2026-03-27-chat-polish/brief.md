# Chat Polish — Brief

## What

Connect the chat to the existing AgromindIA intelligence (diagnostics, recommendations, referential, annual plan, calibration) and polish the experience — so the chat becomes a conversational interface to AgromindIA, not a separate AI guessing from raw data.

## Why

- **Two AI brains, not connected**: The `/parcels/:id/ai` pages have rich computed intelligence (8 diagnostic scenarios, calibration baselines, crop referentials, annual plans, structured recommendations). The chat ignores all of it and reinvents agriculture from raw NDVI numbers.
- **Chat gives generic advice**: "50-70 unités/ha d'azote" is made up by the LLM. The referential system already has precise NPK formulas per crop type and phenological stage.
- **Chat doesn't know what's planned**: The annual plan has monthly interventions scheduled. The chat doesn't see them.
- **Chat doesn't know what's been diagnosed**: The diagnostics module classifies parcels into scenarios (A-H) with confidence scores. The chat recalculates from scratch.
- **Frontend is a monolith**: ChatInterface.tsx (500 lines) and chat.service.ts (3,840 lines) are hard to extend.

## Goals

1. **AgromindIA integration**: Chat context includes diagnostics, recommendations, referential data, annual plan, and calibration for relevant parcels
2. **Backend decomposition**: Split chat.service.ts into focused modules (ContextBuilder, PromptBuilder, ConversationManager)
3. **Frontend decomposition**: Split ChatInterface.tsx into composable components
4. **Follow-up suggestions**: AI generates 2-3 contextual follow-ups after each response
5. **Structured data cards**: Farm stats, recommendations, alerts render as rich cards
6. **Context summarization**: Smarter prompt construction using computed intelligence instead of raw data dumps

## Non-Goals

- Conversation threads / multiple conversations
- Proactive alerts pushed without user query
- Agentic actions — AI creating tasks, assigning workers
- Display levels (Level 1 / Level 3) — separate CEO decision
- Offline chat support
- Changing the AI provider

## Impact

- **Karim**: Asks "what should I do about parcelle B3?" and gets the actual pending recommendations with timing from the annual plan — not generic advice
- **Hassan**: Gets diagnostics scenario codes, calibration baselines, and referential data in responses — the same precision as the AI dashboard
- **Developers**: Can extend chat without touching monolithic files

## Success Criteria

- Chat responses reference actual diagnostics scenarios (A-H) when discussing parcel health
- Chat responses include pending recommendations from ai-recommendations module
- Chat responses reference annual plan interventions (upcoming and overdue)
- Chat uses crop referential data (NPK formulas, BBCH stages) instead of generic advice
- ChatInterface.tsx split into ≥5 components, none >150 lines
- chat.service.ts split into ≥3 modules, none >800 lines
- Every AI response includes 2-3 follow-up suggestions
- Existing tests continue to pass
