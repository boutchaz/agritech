# Schema Wiring — Spec

## GIVEN tasks table exists without crop_cycle_id
WHEN the migration runs
THEN tasks table has nullable crop_cycle_id UUID column with FK to crop_cycles(id) ON DELETE SET NULL
AND tasks table has nullable campaign_id UUID column with FK to agricultural_campaigns(id) ON DELETE SET NULL
AND indexes idx_tasks_crop_cycle and idx_tasks_campaign exist

## GIVEN plan_interventions table exists without crop_cycle_id
WHEN the migration runs
THEN plan_interventions has nullable crop_cycle_id UUID column with FK to crop_cycles(id) ON DELETE SET NULL
AND index idx_plan_interventions_crop_cycle exists

## GIVEN a task is linked to a crop_cycle
WHEN that crop_cycle is deleted
THEN the task's crop_cycle_id becomes NULL (not deleted)
AND the task still exists and functions normally
