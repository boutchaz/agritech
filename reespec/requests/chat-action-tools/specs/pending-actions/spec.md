# Spec: Pending Action Lifecycle

## Scenario: Preview creates a pending action

- **GIVEN** a user sends a message that triggers a tool call with `mode=preview`
- **WHEN** the tool validates parameters and resolves entity names
- **THEN** a row is upserted into `chat_pending_actions` with the tool name, validated parameters, and preview data
- **AND** the response includes a `json:action_preview` card block with human-readable details
- **AND** `expires_at` is set to 30 minutes from now

## Scenario: Only one pending action per user per org

- **GIVEN** a user already has a pending action (e.g., create_task)
- **WHEN** the user requests a different action (e.g., record_harvest) with `mode=preview`
- **THEN** the old pending action is replaced (UPSERT on user_id + organization_id)
- **AND** the new preview card is shown

## Scenario: Confirm executes the pending action

- **GIVEN** a user has a pending action in `chat_pending_actions`
- **WHEN** the AI calls `confirm_pending_action`
- **THEN** the service loads the pending action, calls the real service (e.g., TasksService.create), deletes the pending row, and returns a success result with created entity details

## Scenario: Confirm with no pending action

- **GIVEN** no pending action exists for the user (expired or never created)
- **WHEN** the AI calls `confirm_pending_action`
- **THEN** it returns `{ success: false, error: "No pending action to confirm" }`

## Scenario: Cancel deletes the pending action

- **GIVEN** a user has a pending action
- **WHEN** the AI calls `cancel_pending_action`
- **THEN** the pending row is deleted and the response confirms cancellation

## Scenario: Expired pending action is rejected

- **GIVEN** a pending action exists but `expires_at` < now
- **WHEN** the AI calls `confirm_pending_action`
- **THEN** the expired row is deleted and the response says the action expired

## Scenario: Refine updates the pending action

- **GIVEN** a user has a pending action for `record_harvest` with quantity=3
- **WHEN** the user says "non, 5 tonnes" and AI calls `record_harvest` with `mode=preview` and quantity=5
- **THEN** the pending action is replaced with updated parameters
- **AND** a new preview card is shown with quantity=5
