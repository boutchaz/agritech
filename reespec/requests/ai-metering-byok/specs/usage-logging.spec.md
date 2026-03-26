# Usage Logging Spec

## Capability: Every AI call is logged with attribution

### Scenario: System key usage logged
- **GIVEN** org "farm-a" makes an AI chat call using system ZAI key
- **WHEN** the call completes successfully
- **THEN** a row is inserted into `ai_usage_log` with: organization_id, user_id, feature='chat', provider='zai', is_byok=false, created_at

### Scenario: BYOK usage logged
- **GIVEN** org "farm-a" makes an AI report call using their OpenAI key
- **WHEN** the call completes
- **THEN** a row is inserted with: feature='report', provider='openai', is_byok=true

### Scenario: Failed AI call is NOT logged
- **GIVEN** org "farm-a" makes an AI call that fails (provider error)
- **WHEN** the provider throws an error
- **THEN** no usage row is inserted, quota count is not incremented

### Scenario: Token count is stored when available
- **GIVEN** the AI provider response includes `tokensUsed: 1500`
- **WHEN** usage is logged
- **THEN** the `tokens_used` column is set to 1500
