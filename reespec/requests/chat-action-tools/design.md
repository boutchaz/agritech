# Chat Action Tools — Design

## Architecture: Two-Phase Tool Execution

```
User: "Enregistre 3 tonnes d'olives sur B3"
  │
  ▼
┌─────────────────────────────────────────────────────┐
│ PHASE 1: PREVIEW                                     │
│                                                       │
│  AI calls tool with mode: "preview"                  │
│  ChatToolsService validates params + resolves refs    │
│  Returns structured preview (NOT executed)            │
│  Stores pending_action in chat_pending_actions table  │
│  Frontend renders ActionPreviewCard                   │
└─────────────────────────────────────────────────────┘
  │
  ▼  User: "Confirme"  OR  "Non, 5 tonnes"
  │
┌─────────────────────────────────────────────────────┐
│ PHASE 2a: CONFIRM                                    │
│                                                       │
│  AI recognizes confirm intent                         │
│  Calls tool with mode: "execute"                     │
│  ChatToolsService loads pending_action                │
│  Executes via real service (TasksService, etc.)       │
│  Deletes pending_action                               │
│  Returns success result                               │
└─────────────────────────────────────────────────────┘
  │  OR
┌─────────────────────────────────────────────────────┐
│ PHASE 2b: REFINE                                     │
│                                                       │
│  AI recognizes refinement intent                      │
│  Calls tool again with mode: "preview" + updated args │
│  Old pending_action replaced                          │
│  New preview card rendered                            │
└─────────────────────────────────────────────────────┘
```

## Pending Action Storage

**Table: `chat_pending_actions`** (new)

```sql
CREATE TABLE chat_pending_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  organization_id UUID NOT NULL,
  tool_name TEXT NOT NULL,
  parameters JSONB NOT NULL,
  preview_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT now() + interval '30 minutes'
);
```

**Why DB over in-memory?**
- Survives server restarts
- Works across multiple NestJS instances (horizontal scaling)
- Queryable for analytics (what actions do users preview but never confirm?)
- 30-min expiry via `expires_at` column, cleaned up by periodic query or on-read

**Constraint: one per user per org** — UPSERT on `(user_id, organization_id)`.

## Tool Definition Pattern

Each tool gets a `mode` parameter:

```typescript
{
  type: 'function',
  function: {
    name: 'record_harvest',
    description: 'Record a harvest event. Use mode=preview first, then mode=execute after user confirms.',
    parameters: {
      type: 'object',
      properties: {
        mode: { type: 'string', enum: ['preview', 'execute'], description: 'preview=show card, execute=confirm and save' },
        parcel_id: { type: 'string', description: 'UUID of the parcel' },
        quantity: { type: 'number', description: 'Quantity harvested' },
        unit: { type: 'string', enum: ['kg', 'tons', 'units', 'boxes', 'crates', 'liters'] },
        harvest_date: { type: 'string', description: 'ISO date of harvest, defaults to today' },
        quality_grade: { type: 'string', enum: ['A', 'B', 'C', 'Extra', 'First', 'Second', 'Third'] },
        // ... simplified subset of CreateHarvestDto
      },
      required: ['mode', 'parcel_id', 'quantity', 'unit']
    }
  }
}
```

**Key: tools expose a simplified parameter set.** The full DTOs (CreateTaskDto has 25+ fields) are too complex for AI. Each tool maps a ~5-8 param subset to the full DTO with sensible defaults.

## Tool Inventory

### 1. create_task (upgrade existing)
- Add `mode` param. Current tool always executes — change to preview-first.
- Simplified params: `parcel_id`, `title`, `description`, `priority`, `task_type`, `farm_id`, `due_date`, `assigned_to`
- Preview resolves: parcel name, farm name, worker name (if assigned_to provided)

### 2. assign_task_worker (new)
- Params: `task_id`, `worker_id`, `role`
- Preview shows: task title, worker name, role
- Resolves task_id from context ("la tâche d'irrigation" → lookup recent tasks)

### 3. complete_task (new)
- Params: `task_id`, `notes`, `quality_rating`
- Preview shows: task title, status change, notes
- Minimal — mainly a confirmation of "are you sure?"

### 4. record_harvest (new)
- Params: `parcel_id`, `farm_id`, `quantity`, `unit`, `harvest_date`, `quality_grade`, `notes`
- Preview shows: parcel name, crop type, quantity + unit, date, grade
- Defaults: `harvest_date` = today, `quality_grade` = null

### 5. record_product_application (new)
- Params: `product_id`, `parcel_id`, `farm_id`, `quantity_used`, `area_treated`, `application_date`, `notes`
- Preview shows: product name, parcel name, quantity, area, date
- Defaults: `application_date` = today

### 6. log_parcel_event (new)
- Params: `parcel_id`, `type`, `description`, `date_evenement`, `recalibrage_requis`
- Preview shows: parcel name, event type (human-readable), description, whether recalibration triggers
- Defaults: `date_evenement` = today, `recalibrage_requis` = false

### 7. record_stock_entry (new)
- Params: `entry_type`, `items` (array of {item_id, quantity, unit}), `to_warehouse_id` or `from_warehouse_id`, `notes`
- Preview shows: entry type, item names + quantities, warehouse name(s)
- Defaults: `entry_date` = today, `status` = Draft

### 8. confirm_pending_action (meta-tool)
- No params — just executes whatever is in `chat_pending_actions`
- AI calls this when user says "confirme", "oui", "go", "نعم"
- Returns success + created entity summary

### 9. cancel_pending_action (meta-tool)
- No params — deletes the pending action
- AI calls when user says "annule", "non merci", "لا"

## Frontend: ActionPreviewCard

New card type registered in `cardRegistry`:

```
┌─────────────────────────────────────────────┐
│ 🌾 Record Harvest                    PREVIEW │
│                                               │
│  Parcel:    B3 - Oliviers (Farm Meknes)      │
│  Quantity:  3 tons                            │
│  Date:      2026-04-06                        │
│  Quality:   Grade A                           │
│                                               │
│  Say "confirme" to save or correct any detail │
└─────────────────────────────────────────────┘
```

- Rendered as a data card in the assistant message (same pattern as DiagnosticCard, etc.)
- Card type: `action_preview`
- No buttons — all interaction is conversational (per discovery decision)
- Visual distinction: amber/yellow border or badge to signal "pending"

## Prompt Engineering

The system prompt needs additions:
1. **Tool usage instructions**: "When user requests an action, ALWAYS call the tool with mode=preview first. Never execute directly."
2. **Confirmation recognition**: "When user says confirme/oui/go/نعم/yes after a preview, call confirm_pending_action."
3. **Refinement recognition**: "When user corrects a detail after a preview, call the same tool with mode=preview and updated parameters."
4. **Cancellation recognition**: "When user says annule/non/cancel/لا, call cancel_pending_action."

## CASL Integration

All tools check permissions via `assertPermission()` (already implemented pattern):
- create_task → `Action.Create, Subject.TASK`
- record_harvest → `Action.Create, Subject.HARVEST` (or closest subject)
- record_stock_entry → `Action.Create, Subject.STOCK`
- etc.

Permission check happens in PREVIEW phase too — fail fast before showing card.

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| AI skips preview, calls execute directly | System prompt enforces preview-first. Backend rejects execute without pending_action. |
| AI picks wrong entity (wrong Ahmed) | Preview card shows resolved names. User catches in preview. |
| Token cost from refinement loops | Cap at 3 tool iterations (already exists: `maxToolIterations = 3`) |
| Pending action data goes stale (prices change, stock moves) | 30-min expiry. Re-validate on execute. |
| Tool parameter explosion overwhelms AI | Keep to 5-8 params per tool. Full DTO defaults fill the rest. |
