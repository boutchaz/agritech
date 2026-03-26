# AI Settings UI Spec

## Capability: AI settings page shows usage and provider config

### Scenario: Usage bar displays current quota
- **GIVEN** org is on STANDARD plan, 142/200 requests used this month
- **WHEN** user navigates to /settings/ai
- **THEN** page shows progress bar at 71%, text "142 / 200 requêtes ce mois", and reset date

### Scenario: Usage bar at limit shows upsell
- **GIVEN** org is on STARTER plan, 50/50 requests used
- **WHEN** user views AI settings
- **THEN** progress bar is red/full, message "Limite atteinte", two CTAs visible: "Passer au plan supérieur" and "Ajouter votre clé IA"

### Scenario: BYOK org sees unlimited badge
- **GIVEN** org has enabled BYOK OpenAI key
- **WHEN** user views AI settings
- **THEN** usage section shows "Illimité (clé personnelle)" instead of quota bar

### Scenario: Enterprise sees unlimited badge
- **GIVEN** org is on ENTERPRISE plan
- **WHEN** user views AI settings
- **THEN** usage section shows "Illimité (plan Enterprise)"

### Scenario: Provider cards allow BYOK configuration
- **GIVEN** user is org admin on AI settings page
- **WHEN** user clicks "Ajouter" on OpenAI provider card
- **THEN** form appears with API key input, save encrypts and stores key, card shows masked key with toggle/delete

### Scenario: AI settings appears in sidebar
- **GIVEN** user is org admin
- **WHEN** user views settings sidebar
- **THEN** "Intelligence Artificielle" item appears in Organization section with brain/sparkle icon

## Capability: Soft-block modal on quota exceeded

### Scenario: Chat returns quota exceeded
- **GIVEN** org is at quota limit, no BYOK
- **WHEN** user sends a chat message
- **THEN** modal appears: "Vous avez atteint votre limite mensuelle de [X] requêtes IA", with upgrade and BYOK CTAs

### Scenario: Report generation returns quota exceeded
- **GIVEN** org is at quota limit, no BYOK
- **WHEN** user triggers AI report generation
- **THEN** same soft-block modal appears with contextual message
