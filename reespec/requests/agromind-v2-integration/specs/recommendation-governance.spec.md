# Spec: Recommendation Governance

## Capability: Implement V2 recommendation lifecycle, limits, and journal

### S1. Recommendation 8-state lifecycle
- **GIVEN** a recommendation in status `proposed`
- **WHEN** user validates it
- **THEN** status transitions to `validated` AND a `recommendation_events` row is created with `decider = 'user'`

- **GIVEN** a recommendation in status `validated`
- **WHEN** user declares execution
- **THEN** status transitions to `executed` AND `executed_at` is set AND evaluation window opens

- **GIVEN** a recommendation in status `executed`
- **WHEN** evaluation window expires
- **THEN** status transitions to `evaluated` with `evaluation_result` set

### S2. Expiration by priority
- **GIVEN** a recommendation with priority `urgent` and status `proposed`
- **WHEN** 72 hours pass without user action
- **THEN** status auto-transitions to `expired`

- **GIVEN** a recommendation with priority `priority` and status `proposed`
- **WHEN** 10 days pass without user action
- **THEN** status auto-transitions to `expired`

### S3. Rejection with mandatory motif for urgent
- **GIVEN** a recommendation with priority `urgent`
- **WHEN** user rejects it without providing a motif
- **THEN** the rejection is refused with a validation error

- **GIVEN** a recommendation with priority `vigilance`
- **WHEN** user rejects it without a motif
- **THEN** the rejection is accepted (motif optional)

### S4. Simultaneous limits enforced
- **GIVEN** 3 active reactive recommendations for a parcel
- **WHEN** a new `vigilance` recommendation is generated
- **THEN** it is queued, not emitted

- **GIVEN** 3 active reactive recommendations and a new `urgent` arrives
- **WHEN** the system processes the new recommendation
- **THEN** the lowest-priority active recommendation is queued and the `urgent` takes its slot

### S5. Theme frequency limits
- **GIVEN** an irrigation recommendation was emitted 2 days ago
- **WHEN** another irrigation recommendation is generated
- **THEN** it is held back (minimum 3 days between irrigation recommendations)
- **UNLESS** the new one is priority `urgent`

### S6. Lifecycle journal complete
- **GIVEN** any status transition on a recommendation
- **WHEN** the transition is persisted
- **THEN** a corresponding row exists in `recommendation_events` with: `from_status`, `to_status`, `decider`, `motif`, `created_at`

### S7. Diagnostic session created per analysis run
- **GIVEN** the operational engine runs for a parcel
- **WHEN** the AI response is received
- **THEN** an `ai_diagnostic_sessions` row is created with `chemin`, `engine_output` JSONB, and `calibration_id`
- **AND** each recommendation in the output becomes an `ai_recommendations` row linked via `session_id`
