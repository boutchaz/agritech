# Production Wiring — Brief

## Goal
Make the Production module fully functional end-to-end: Campaigns → Crop Cycles → Tasks/Interventions as a connected but non-blocking chain. Each entity works standalone; links are optional enrichment.

## Problem
- `tasks` table has no `crop_cycle_id` or `campaign_id` — cannot trace work to a production cycle
- `plan_interventions` has no `crop_cycle_id` — AI-generated interventions float disconnected
- Campaign page has no delete, no status transitions, no drill-down to see linked cycles
- Crop cycle detail page has no linked tasks view / timeline
- No auto-linking logic for tasks → crop cycles (based on parcel + date overlap)

## Non-goals
- Quality control module (placeholder page — CEO hasn't specced it)
- Implementing Level 2 AgromindIA display (blocked by CEO)
- New tables or architectural changes — only adding nullable FK columns + wiring UI
- Offline/PWA — separate concern

## Approach: "Never blocking"
- All new FK columns are nullable — existing data unaffected
- Task form gets an optional crop cycle dropdown (not required)
- Auto-suggest crop cycle when parcel is selected (user can clear it)
- Campaign status transitions via buttons on cards
- Campaign detail is a filtered view of crop cycles for that campaign
- Every piece works independently if the linked entity doesn't exist

## Impact
- Karim can see all tasks for a crop cycle in one place
- Hassan gets full traceability from seed to harvest
- Fatima can compare campaign performance across years
- AgromindIA recommendations can be traced back to which cycle they served
