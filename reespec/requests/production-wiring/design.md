# Production Wiring — Design

## Schema changes (all nullable, non-breaking)

### tasks table
```sql
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS crop_cycle_id UUID REFERENCES crop_cycles(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES agricultural_campaigns(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_crop_cycle ON tasks(crop_cycle_id);
CREATE INDEX IF NOT EXISTS idx_tasks_campaign ON tasks(campaign_id);
```

### plan_interventions table
```sql
ALTER TABLE plan_interventions ADD COLUMN IF NOT EXISTS crop_cycle_id UUID REFERENCES crop_cycles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_plan_interventions_crop_cycle ON plan_interventions(crop_cycle_id);
```

## Auto-suggest logic (frontend only, never forced)
When user selects a parcel on task form:
1. Query active crop cycles for that parcel (`status IN ('planned','land_prep','growing','harvesting')`)
2. If exactly 1 match → pre-fill `crop_cycle_id` (user can clear)
3. If multiple → show dropdown to pick one (or none)
4. `campaign_id` auto-derives from selected crop cycle's `campaign_id`

## Campaign status management
Status transitions follow: `planned → active → completed` or `planned/active → cancelled`
- Card action buttons: "Activate" / "Complete" / "Cancel"
- Uses existing `PATCH /campaigns/:id/status` endpoint

## Campaign delete
- Frontend: add delete button with confirmation dialog
- Uses existing `DELETE /campaigns/:id` endpoint (already blocks active campaigns)

## Campaign detail (drill-down)
Not a new route — clicking a campaign card filters the crop cycles page by `campaign_id`.
Navigate to `/crop-cycles?campaign_id=<id>`. Zero new pages needed.

## Crop cycle detail — tasks tab
New tab on `/crop-cycles/$cycleId` showing tasks linked to this cycle.
Query: `GET /tasks?crop_cycle_id=<id>`. Read-only list with link to task detail.

## Non-blocking principle
- Every dropdown is optional with a "None" option
- Missing links don't break any existing flow
- Auto-suggest can be dismissed
- All columns are nullable with ON DELETE SET NULL
