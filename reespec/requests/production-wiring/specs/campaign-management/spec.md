# Campaign Management — Spec

## GIVEN a campaign with status "planned"
WHEN the user clicks "Activate"
THEN the campaign status changes to "active"
AND a success toast is shown

## GIVEN a campaign with status "active"
WHEN the user clicks "Complete"
THEN the campaign status changes to "completed"
AND a success toast is shown

## GIVEN a campaign with status "planned" or "active"
WHEN the user clicks "Cancel"
THEN a confirmation dialog appears
AND on confirm the campaign status changes to "cancelled"

## GIVEN a campaign with status "planned" or "completed" or "cancelled"
WHEN the user clicks "Delete"
THEN a confirmation dialog appears
AND on confirm the campaign is deleted and removed from the list

## GIVEN a campaign with status "active"
WHEN the user clicks "Delete"
THEN the delete button is disabled or hidden (cannot delete active campaigns)

## GIVEN a campaign card is clicked (not edit/action buttons)
WHEN navigating
THEN the user is taken to /crop-cycles?campaign_id=<id> showing only cycles for that campaign
