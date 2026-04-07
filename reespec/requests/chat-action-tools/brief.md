# Chat Action Tools — Brief

## Problem

Farmers in the field need to record daily operations (harvests, tasks, stock movements, treatments) but navigating multi-step forms on a phone with dirty hands and spotty 3G is painful. The chat interface exists and works well for Q&A, but can only create tasks and mark interventions done (2 tools). The gap: chat can't take the daily write actions farmers repeat most.

## Goal

Turn the chat into a **voice-first command center** for daily farm operations. A farmer says "J'ai récolté 3 tonnes d'olives sur B3 ce matin" and the AI proposes a structured preview card. The farmer confirms (or refines via conversation), and the action executes through the same backend services as the UI.

## Non-Goals

- **Not** wiring up all 80+ modules — only the 5 most likely daily-use modules
- **Not** building inline form editing in chat — corrections are conversational
- **Not** replacing the existing UI — chat is an alternative entry point
- **Not** implementing Level 2 display (blocked per CEO decision)

## Scope — 5 modules, ~10 tools

| Module | Tools | Existing? |
|--------|-------|-----------|
| Tasks | create, assign worker, complete | create exists (partial) |
| Harvest events | record harvest | new |
| Product applications | record application | new |
| Parcel events | log event/problem | new |
| Stock entries | record receipt/issue/transfer | new |

## Key Design Decisions (from discovery)

1. **Two-phase backend execution (Option A)**: AI calls tool → backend returns preview (not executed) → frontend renders preview card → user confirms → backend executes. Single execution path, backend owns everything.
2. **Conversational refinement**: No inline form editing. User says "non, priorité haute" → AI regenerates preview with updated params. Costs an extra AI round-trip per correction.
3. **One pending action at a time**: New action proposal replaces previous silently. 30-minute inactivity auto-expiry. Unrelated messages don't kill the pending action.
4. **Entity resolution via context**: The context builder already passes names + UUIDs for workers, parcels, farms, items, warehouses. AI resolves "Ahmed" or "B3" from this context.

## Impact

- **Ahmed** (50ha, no tech, Darija): Can record operations by voice without navigating the UI
- **Karim** (300ha, hates complexity): Quick actions without leaving the chat screen
- **Hassan** (agronome): Can log parcel events in the field during inspections

## Risks

- AI hallucinating entity references (wrong parcel, wrong worker) → mitigated by preview + confirm
- Token cost increase from conversational refinement loops → monitor, cap at 3 refinements
- Scope creep to more modules before validating these 5 → resist until usage data exists
