# Chat Polish — Design

## Architecture

### The Core Change: AgromindIA Context Provider

The chat currently builds context by querying raw DB tables (satellite_data, farms, parcels, etc.). The new design adds an **AgromindIA context provider** that fetches computed intelligence from existing services.

```
BEFORE:                              AFTER:
                                     
  Chat Query                           Chat Query
      │                                    │
      ▼                                    ▼
  Raw DB queries ──► LLM             AgromindIA Context ──► LLM
  (satellite_data,                   (diagnostics,
   farms, parcels,                    recommendations,
   weather rows)                      referential,
                                      annual plan,
  LLM invents                         calibration)
  recommendations                    
  from NDVI numbers                  LLM presents computed
                                     intelligence conversationally
```

### What AgromindIA Context Provides Per Parcel

```typescript
interface AgromindiaParcelContext {
  parcel_id: string;
  parcel_name: string;
  crop_type: string;
  
  // From ai-diagnostics service
  diagnostics: {
    scenario_code: 'A'|'B'|'C'|'D'|'E'|'F'|'G'|'H';
    scenario: string; // human description
    confidence: number;
    indicators: {
      ndvi_band: string;   // 'optimal' | 'vigilance' | 'alert'
      ndvi_trend: string;  // 'improving' | 'stable' | 'declining'
      ndre_status: string;
      ndmi_trend: string;
      water_balance: number | null;
      weather_anomaly: boolean;
    };
  } | null;
  
  // From ai-recommendations service
  recommendations: Array<{
    status: string;
    priority: string;
    constat: string;
    diagnostic: string;
    action: string;
    valid_from: string;
    valid_until: string;
  }>;
  
  // From annual-plan service
  annual_plan: {
    status: string;
    upcoming_interventions: Array<{
      month: number;
      week: number | null;
      intervention_type: string;
      description: string;
      product: string | null;
      dose: string | null;
      status: string;
    }>;
    overdue_interventions: Array<{...}>;
    plan_summary: {
      total: number;
      executed: number;
      planned: number;
      skipped: number;
    };
  } | null;
  
  // From ai-references service  
  referential: {
    current_bbch_stage: string | null;
    available_npk_formulas: any[];
    known_alerts: any[];
  } | null;
  
  // From calibration service
  calibration: {
    status: string;
    confidence_score: number;
    zone_classification: string; // 'optimal' | 'normal' | 'stressed'
    baseline_ndvi: number;
    baseline_ndre: number | null;
    baseline_ndmi: number | null;
  } | null;
}
```

### Context Routing Enhancement

The keyword router (`analyzeQueryContextSimple`) gets a new flag:

```typescript
interface ContextNeeds {
  // ... existing flags ...
  agromindiaIntel: boolean;  // NEW — triggers AgromindIA context fetch
}
```

Triggers on: parcel names, crop names, "recommendation", "plan", "diagnostic", "calibration", "what should I do", "que faire", "ماذا أفعل", "conseil", "intervention", general queries.

### Backend Module Structure (after refactor)

```
modules/chat/
├── chat.controller.ts              (unchanged — thin HTTP layer)
├── chat.service.ts                 (orchestrator ~300 lines)
├── chat.module.ts                  (updated providers)
├── context/
│   ├── context-builder.service.ts  (orchestrates all context fetching)
│   ├── context-router.service.ts   (keyword routing + agromindiaIntel flag)
│   ├── context-summarizer.service.ts (summarize for prompt)
│   └── agromindia-context.service.ts (NEW — fetches from AI modules)
├── prompt/
│   ├── prompt-builder.service.ts   (system + user prompt construction)
│   └── follow-up.service.ts       (parse suggestions from AI response)
├── conversation/
│   └── conversation.service.ts    (save, load, clear history)
├── providers/                     (unchanged)
└── dto/                           (updated — add suggestions field)
```

### No Caching — Fresh Data Every Request

Both the response cache (Map<query, AI response>) and the module cache (Map<orgId:module, DB data>) are removed. Reasons:
- Response cache bypasses quota/metering — every AI call must be counted
- Module cache serves stale data with no invalidation mechanism
- In-memory Maps don't work across multiple instances
- The DB queries are fast (Supabase selects with `.limit(3)`) — cache adds complexity for marginal gain
- AgromindIA intelligence (diagnostics, recommendations) changes frequently — stale data = wrong advice

### AgromindiaContextService — Key Design

This service does NOT duplicate logic. It **calls existing services**:

```typescript
@Injectable()
export class AgromindiaContextService {
  constructor(
    private diagnosticsService: AiDiagnosticsService,
    private recommendationsService: AiRecommendationsService,
    private annualPlanService: AnnualPlanService,
    private referencesService: AiReferencesService,
    private calibrationService: CalibrationService,
  ) {}

  async getParcelIntelligence(parcelId: string, orgId: string): Promise<AgromindiaParcelContext> {
    // Calls existing service methods in parallel
    const [diagnostics, recommendations, plan, calibration] = await Promise.all([
      this.diagnosticsService.getDiagnostics(parcelId).catch(() => null),
      this.recommendationsService.findByParcel(parcelId, orgId).catch(() => []),
      this.annualPlanService.findByParcel(parcelId, orgId).catch(() => null),
      this.calibrationService.findByParcel(parcelId).catch(() => null),
    ]);
    // ... assemble and return
  }
}
```

### Frontend Component Tree (after refactor)

```
ChatInterface (orchestrator, <150 lines)
├── ChatHeader
├── MessageList
│   ├── WelcomeState + SuggestionChips
│   ├── UserMessage
│   ├── AssistantMessage
│   │   ├── Markdown with deep links
│   │   ├── DataCards (farm-summary, stock-alert, recommendation-card, etc.)
│   │   └── FollowUpSuggestions
│   └── StreamingMessage
├── VoiceStatusBar
├── VoiceModeToggle
└── ChatInput
```

### Follow-Up Suggestions

AI appends `---SUGGESTIONS---\n["...", "...", "..."]` to responses. Backend strips and parses into `suggestions` field. Streaming delivers suggestions in the SSE `done` event.

### Structured Data Cards

AI outputs `json:TYPE` code blocks. Frontend parses into React cards:
- `recommendation-card` — constat + diagnostic + action + priority badge
- `farm-summary` — farm/parcel/cycle counts
- `plan-calendar` — upcoming interventions timeline
- `diagnostic-card` — scenario code + indicators + zone classification
- `stock-alert` — low stock items
- `financial-snapshot` — revenue/expenses

### Prompt Changes

System prompt updated to:
1. Instruct AI to use AgromindIA computed data (not invent recommendations)
2. Reference diagnostic scenarios by code
3. Present annual plan interventions as actionable
4. Use referential NPK formulas (not generic dosages)
5. Append follow-up suggestions
6. Use data card format for structured responses

## Risks

1. **Circular dependency**: AgromindiaContextService imports from ai-diagnostics, ai-recommendations, etc. These modules must be independent of chat. ✅ Already the case — they don't import chat.
2. **Performance**: Fetching AgromindIA context for multiple parcels could be slow. Mitigated by: only fetch for parcels mentioned in query, cache with TTL, parallel fetching.
3. **Missing data**: Some parcels may not have calibration/diagnostics. AgromindIA context gracefully returns null for each component.
4. **Prompt size**: AgromindIA context adds tokens. Mitigated by context summarizer producing concise text from structured data.

## Decisions

### AgromindIA context fetches for ALL parcels on general queries
For "overview" or general queries, fetch AgromindIA context for the most recent 3 parcels (matching SUMMARY_LIMIT). For specific parcel queries, fetch only for that parcel.

### Don't duplicate — delegate
AgromindiaContextService ONLY calls existing service methods. No direct DB queries for diagnostics, recommendations, etc. If a service doesn't expose what we need, we extend the existing service.

### Referential data fetched by crop type, not per parcel
Since referential is per crop type (olivier, agrumes, etc.), fetch once per unique crop type across all relevant parcels.
