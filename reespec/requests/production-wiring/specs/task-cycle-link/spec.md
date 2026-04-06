# Task ↔ Crop Cycle Link — Spec

## GIVEN a user is creating a task and selects a parcel
WHEN that parcel has exactly one active crop cycle
THEN the crop_cycle_id field is auto-filled with that cycle
AND the user can clear it (optional)

## GIVEN a user is creating a task and selects a parcel
WHEN that parcel has no active crop cycles
THEN the crop_cycle_id dropdown shows "No active cycles" and stays empty
AND the task can still be created without a cycle

## GIVEN a user is creating a task and selects a parcel
WHEN that parcel has multiple active crop cycles
THEN the crop_cycle_id dropdown shows all active cycles for selection
AND none is pre-selected

## GIVEN a crop_cycle_id is selected on a task
WHEN that crop cycle belongs to a campaign
THEN the campaign_id is auto-set from the crop cycle's campaign_id

## GIVEN a task is linked to a crop cycle
WHEN viewing the crop cycle detail page
THEN the task appears in the "Tasks" tab of that cycle
